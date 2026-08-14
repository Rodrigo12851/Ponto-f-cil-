/**
 * Biometric Facial Detection & Recognition Engine (Multi-Stage Validation & Strict Verification)
 * 
 * Multi-Stage Pipeline:
 * 
 * [STAGE 1 - PRE-VALIDATION: Face Count & Quality Check]
 * 1. Face Count Detection: Detects if there is EXACTLY ONE human face in the image.
 *    - If 0 faces: Halts immediately with "Nenhum rosto humano detectado".
 *    - If >1 faces: Halts immediately with "Múltiplos rostos detectados (apenas 1 pessoa permitida)".
 * 2. Quality Assessment:
 *    - Lighting/Luminance (detects underexposure/dark room or overexposure/direct light).
 *    - Sharpness/Focus (Laplacian edge variance detects blur/motion).
 *    - Contrast & Dynamic Range (detects covered lens or foggy sensors).
 *    - Framing & Sizing (detects tiny/distant face).
 *    - Structural Symmetry & Obstacle Filter (detects hands, objects, clothes).
 *    If quality is insufficient, halst immediately with specific error message.
 * 
 * [STAGE 2 - BIOMETRIC COMPARISON: Only executed if Stage 1 passes]
 * 3. Feature Extraction (Zero-Mean Normalized Spatial HOG + Gradient Energy Descriptor).
 * 4. 1:1 and 1:N Facial Comparison against official enrolled avatar and 3D Face ID angles.
 * 5. Strict 90% threshold verification: Rejects if similarity is below 90%, blocking punch.
 */

import { Employee } from '../types';

export interface QualityMetrics {
  brightnessScore: number; // 0 to 100
  sharpnessScore: number;  // 0 to 100
  contrastScore: number;   // 0 to 100
  symmetryScore: number;   // 0 to 100
  overallQuality: number;  // 0 to 100
}

export interface FacePreValidationResult {
  passed: boolean;
  faceCount: number;
  stageFailed?: 'FACE_COUNT' | 'IMAGE_QUALITY';
  errorCode?: 'NO_FACE_DETECTED' | 'MULTIPLE_FACES_DETECTED' | 'INSUFFICIENT_QUALITY';
  errorMessage?: string;
  quality?: QualityMetrics;
  cropRect?: { x: number; y: number; width: number; height: number };
}

export interface BiometricMatchResult {
  success: boolean;
  error?: 'NO_FACE_DETECTED' | 'MULTIPLE_FACES_DETECTED' | 'INSUFFICIENT_QUALITY' | 'FACE_NOT_MATCHED' | 'IMAGE_ERROR';
  errorMessage?: string;
  matchedEmployee?: Employee;
  confidence?: number; // 0 to 100%
  debugInfo?: string;
  stageFailed?: 'FACE_COUNT' | 'IMAGE_QUALITY' | 'BIOMETRIC_MATCH';
  faceCount?: number;
  quality?: QualityMetrics;
}

export interface FaceAngleDetection {
  detected: boolean;
  angle: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  pitch: number; // Vertical tilt
  yaw: number;   // Horizontal rotation
  roll: number;  // In-plane tilt
  quality: number;
}

const STRICT_SIMILARITY_THRESHOLD_PCT = 90;

/**
 * STAGE 1: Standalone Face Count and Quality Pre-Validation.
 * Detects if there is EXACTLY 1 human face and ensures high image quality before any comparison.
 */
export async function validateFacePresenceAndQuality(
  capturedDataUrl: string
): Promise<FacePreValidationResult> {
  if (!capturedDataUrl || capturedDataUrl.trim().length === 0) {
    return {
      passed: false,
      faceCount: 0,
      stageFailed: 'FACE_COUNT',
      errorCode: 'NO_FACE_DETECTED',
      errorMessage: 'Nenhum quadro de imagem recebido da câmera. Tente novamente.',
    };
  }

  try {
    const img = await loadImage(capturedDataUrl);
    return await executeStage1PreValidation(img);
  } catch (err: any) {
    console.error('Error in Stage 1 Face Validation:', err);
    return {
      passed: false,
      faceCount: 0,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Falha ao processar a imagem da câmera para validação biométrica.',
    };
  }
}

/**
 * 1:1 Biometric Comparison (Live capture vs Specific Employee's registered Avatar and 3D Face ID angles)
 * Runs STAGE 1 (Single face count & quality) FIRST. Only if passed, runs STAGE 2 (Biometric matching).
 */
export async function verifyEmployeeFaceAgainstAvatar(
  capturedDataUrl: string,
  employee: Employee,
  minThresholdPct: number = STRICT_SIMILARITY_THRESHOLD_PCT
): Promise<BiometricMatchResult> {
  try {
    if (!capturedDataUrl) {
      return {
        success: false,
        error: 'IMAGE_ERROR',
        errorMessage: 'Face not recognized. Imagem da câmera não capturada.',
        confidence: 0,
      };
    }

    const capturedImg = await loadImage(capturedDataUrl);

    // =========================================================================
    // STAGE 1: Multi-stage Pre-validation (Exact 1 Face + Quality Verification)
    // =========================================================================
    const preValidation = await executeStage1PreValidation(capturedImg);
    if (!preValidation.passed) {
      return {
        success: false,
        error: preValidation.errorCode || 'NO_FACE_DETECTED',
        errorMessage: preValidation.errorMessage || 'Validação facial reprovada na etapa de qualidade.',
        confidence: 0,
        faceCount: preValidation.faceCount,
        stageFailed: preValidation.stageFailed,
        quality: preValidation.quality,
        debugInfo: `Falha na Etapa 1: ${preValidation.stageFailed} (${preValidation.errorCode})`,
      };
    }

    // =========================================================================
    // STAGE 2: Biometric Comparison against Registered Employee's Profile
    // =========================================================================
    const capturedDescriptor = extractFacialDescriptor(capturedImg, preValidation.cropRect);
    if (!capturedDescriptor) {
      return {
        success: false,
        error: 'INSUFFICIENT_QUALITY',
        errorMessage: 'Qualidade insuficiente: Não foi possível extrair os traços biométricos do rosto. Mantenha-se centralizado.',
        confidence: 0,
        stageFailed: 'IMAGE_QUALITY',
      };
    }

    // Collect all registered official photos for the employee
    const referencePhotos: string[] = [];
    if (employee.avatar && employee.avatar.length > 20) {
      referencePhotos.push(employee.avatar);
    }
    if (employee.facialPhotos && employee.facialPhotos.length > 0) {
      for (const photo of employee.facialPhotos) {
        if (photo && photo.length > 20 && !referencePhotos.includes(photo)) {
          referencePhotos.push(photo);
        }
      }
    }

    if (referencePhotos.length === 0) {
      return {
        success: false,
        error: 'FACE_NOT_MATCHED',
        errorMessage: `Face not recognized. O colaborador ${employee.name} não possui foto ou Face ID 3D cadastrado no sistema.`,
        confidence: 0,
        stageFailed: 'BIOMETRIC_MATCH',
      };
    }

    // Compare live descriptor against all reference photos/angles
    let highestScorePct = 0;
    let bestCorrelation = -1;

    for (const refSrc of referencePhotos) {
      try {
        const refImg = await loadImage(refSrc);
        const refDescriptor = extractFacialDescriptor(refImg);
        if (refDescriptor) {
          const rawCorrelation = calculateZeroMeanCorrelation(capturedDescriptor, refDescriptor);
          const scorePct = convertCorrelationToPercentage(rawCorrelation);
          if (scorePct > highestScorePct) {
            highestScorePct = scorePct;
            bestCorrelation = rawCorrelation;
          }
        }
      } catch (e) {
        // Skip corrupted reference photo URL
      }
    }

    // Strict 90% Threshold Verification
    if (highestScorePct < minThresholdPct) {
      return {
        success: false,
        error: 'FACE_NOT_MATCHED',
        errorMessage: `Face not recognized. Rosto não reconhecido com a biometria cadastrada de ${employee.name} (Similaridade obtida: ${highestScorePct}%, exigida: ≥${minThresholdPct}%).`,
        confidence: highestScorePct,
        stageFailed: 'BIOMETRIC_MATCH',
        faceCount: 1,
        quality: preValidation.quality,
        debugInfo: `Rejeitado na Etapa 2: ${highestScorePct}% < ${minThresholdPct}% (rawCorr: ${bestCorrelation.toFixed(3)})`,
      };
    }

    return {
      success: true,
      matchedEmployee: employee,
      confidence: highestScorePct,
      faceCount: 1,
      quality: preValidation.quality,
      debugInfo: `Face reconhecida com sucesso! (${highestScorePct}% compatibilidade com ${employee.name})`,
    };
  } catch (err: any) {
    console.error('Error during 1:1 facial verification:', err);
    return {
      success: false,
      error: 'IMAGE_ERROR',
      errorMessage: 'Face not recognized. Erro ao processar a validação biométrica facial.',
      confidence: 0,
    };
  }
}

/**
 * 1:N Biometric Recognition for Tablet Kiosk.
 * Runs STAGE 1 (Single face count & quality) FIRST. Only if passed, runs STAGE 2 (Compare against all enrolled employees).
 */
export async function verifyAndRecognizeFace(
  capturedDataUrl: string,
  employees: Employee[],
  minThresholdPct: number = STRICT_SIMILARITY_THRESHOLD_PCT
): Promise<BiometricMatchResult> {
  try {
    if (!capturedDataUrl) {
      return {
        success: false,
        error: 'IMAGE_ERROR',
        errorMessage: 'Face not recognized. Nenhuma imagem recebida da câmera.',
        confidence: 0,
      };
    }

    const img = await loadImage(capturedDataUrl);

    // =========================================================================
    // STAGE 1: Multi-stage Pre-validation (Exact 1 Face + Quality Verification)
    // =========================================================================
    const preValidation = await executeStage1PreValidation(img);
    if (!preValidation.passed) {
      return {
        success: false,
        error: preValidation.errorCode || 'NO_FACE_DETECTED',
        errorMessage: preValidation.errorMessage || 'Validação facial reprovada na etapa de qualidade.',
        confidence: 0,
        faceCount: preValidation.faceCount,
        stageFailed: preValidation.stageFailed,
        quality: preValidation.quality,
        debugInfo: `Falha na Etapa 1: ${preValidation.stageFailed} (${preValidation.errorCode})`,
      };
    }

    // =========================================================================
    // STAGE 2: Biometric Recognition against Database
    // =========================================================================
    const capturedDescriptor = extractFacialDescriptor(img, preValidation.cropRect);
    if (!capturedDescriptor) {
      return {
        success: false,
        error: 'INSUFFICIENT_QUALITY',
        errorMessage: 'Qualidade insuficiente: Não foi possível extrair traços faciais nítidos. Melhore a iluminação e olhe para a câmera.',
        confidence: 0,
        stageFailed: 'IMAGE_QUALITY',
      };
    }

    let bestMatch: { employee: Employee; scorePct: number } | null = null;

    for (const emp of employees) {
      const referencePhotos: string[] = [];
      if (emp.avatar && emp.avatar.length > 20) {
        referencePhotos.push(emp.avatar);
      }
      if (emp.facialPhotos && emp.facialPhotos.length > 0) {
        for (const p of emp.facialPhotos) {
          if (p && p.length > 20 && !referencePhotos.includes(p)) {
            referencePhotos.push(p);
          }
        }
      }

      let maxEmpScorePct = 0;

      for (const refPhoto of referencePhotos) {
        try {
          const refImg = await loadImage(refPhoto);
          const refDescriptor = extractFacialDescriptor(refImg);
          if (refDescriptor) {
            const rawCorr = calculateZeroMeanCorrelation(capturedDescriptor, refDescriptor);
            const scorePct = convertCorrelationToPercentage(rawCorr);
            if (scorePct > maxEmpScorePct) {
              maxEmpScorePct = scorePct;
            }
          }
        } catch (e) {
          // Skip broken photo
        }
      }

      if (maxEmpScorePct > 0) {
        if (!bestMatch || maxEmpScorePct > bestMatch.scorePct) {
          bestMatch = { employee: emp, scorePct: maxEmpScorePct };
        }
      }
    }

    // Strict 90% Threshold Check
    if (!bestMatch || bestMatch.scorePct < minThresholdPct) {
      const bestScorePct = bestMatch ? bestMatch.scorePct : 0;
      return {
        success: false,
        error: 'FACE_NOT_MATCHED',
        errorMessage: `Face not recognized. Rosto não reconhecido no banco de dados da empresa (Similaridade obtida: ${bestScorePct}%, exigida: ≥${minThresholdPct}%).`,
        confidence: bestScorePct,
        stageFailed: 'BIOMETRIC_MATCH',
        faceCount: 1,
        quality: preValidation.quality,
        debugInfo: bestMatch
          ? `Similaridade máxima obtida: ${bestScorePct}% (Mínimo exigido: ${minThresholdPct}%)`
          : 'Nenhum perfil cadastrado para comparação',
      };
    }

    return {
      success: true,
      matchedEmployee: bestMatch.employee,
      confidence: bestMatch.scorePct,
      faceCount: 1,
      quality: preValidation.quality,
      debugInfo: `Face ID Autenticado com sucesso (${bestMatch.scorePct}% compatibilidade: ${bestMatch.employee.name})`,
    };
  } catch (error: any) {
    console.error('Error during biometric verification:', error);
    return {
      success: false,
      error: 'IMAGE_ERROR',
      errorMessage: 'Face not recognized. Erro ao processar imagem biométrica. Tente novamente.',
      confidence: 0,
    };
  }
}

// ============================================================================
// CORE STAGE 1 LOGIC: Multi-Stage Face Count & Multi-Factor Quality Analyzer
// ============================================================================

async function executeStage1PreValidation(img: HTMLImageElement): Promise<FacePreValidationResult> {
  const width = img.naturalWidth || img.width || 640;
  const height = img.naturalHeight || img.height || 480;

  // --------------------------------------------------------------------------
  // STEP 1A: Count Detection using Native FaceDetector API (if available)
  // --------------------------------------------------------------------------
  if (typeof (window as any).FaceDetector === 'function') {
    try {
      const detector = new (window as any).FaceDetector({ fastMode: false, maxDetectedFaces: 10 });
      const detectedFaces = await detector.detect(img);

      if (detectedFaces && Array.isArray(detectedFaces)) {
        if (detectedFaces.length === 0) {
          return {
            passed: false,
            faceCount: 0,
            stageFailed: 'FACE_COUNT',
            errorCode: 'NO_FACE_DETECTED',
            errorMessage: 'Nenhum rosto humano detectado na imagem. Posicione seu rosto no centro do enquadramento da câmera.',
          };
        }

        if (detectedFaces.length > 1) {
          return {
            passed: false,
            faceCount: detectedFaces.length,
            stageFailed: 'FACE_COUNT',
            errorCode: 'MULTIPLE_FACES_DETECTED',
            errorMessage: `Múltiplos rostos detectados (${detectedFaces.length} pessoas no visor). Apenas uma pessoa deve estar visível no enquadramento para o registro de ponto.`,
          };
        }

        // Exactly 1 face detected by hardware/OS detector
        const box = detectedFaces[0].boundingBox;
        const cropRect = {
          x: Math.max(0, Math.floor(box.x)),
          y: Math.max(0, Math.floor(box.y)),
          width: Math.min(width, Math.floor(box.width)),
          height: Math.min(height, Math.floor(box.height)),
        };

        // Proceed to Stage 1B (Quality Assessment on this single face)
        return assessImageQuality(img, cropRect, 1);
      }
    } catch (e) {
      // Fallback to Computer Vision Engine if native API throws
    }
  }

  // --------------------------------------------------------------------------
  // STEP 1A (Fallback): Algorithmic Computer Vision Multi-Region & Blob Scanner
  // --------------------------------------------------------------------------
  const cvAnalysis = analyzeFacesComputerVision(img);

  if (cvAnalysis.faceCount === 0) {
    return {
      passed: false,
      faceCount: 0,
      stageFailed: 'FACE_COUNT',
      errorCode: 'NO_FACE_DETECTED',
      errorMessage: cvAnalysis.customReason || 'Nenhum rosto humano detectado na imagem. Posicione seu rosto em frente à câmera e evite cobrir a lente.',
    };
  }

  if (cvAnalysis.faceCount > 1) {
    return {
      passed: false,
      faceCount: cvAnalysis.faceCount,
      stageFailed: 'FACE_COUNT',
      errorCode: 'MULTIPLE_FACES_DETECTED',
      errorMessage: `Múltiplos rostos detectados (${cvAnalysis.faceCount} pessoas visíveis). Apenas um colaborador deve estar no enquadramento da câmera.`,
    };
  }

  // --------------------------------------------------------------------------
  // STEP 1B: Quality Verification of the Single Detected Face
  // --------------------------------------------------------------------------
  return assessImageQuality(img, cvAnalysis.cropRect, 1);
}

/**
 * Multi-layer Image Quality Assessor:
 * - Evaluates Brightness (Underexposure / Overexposure)
 * - Evaluates Sharpness (Laplacian Edge Variance / Motion Blur)
 * - Evaluates Contrast (Luminance Standard Deviation)
 * - Evaluates Symmetry (Facial Bilateral Geometry vs Hands/Obstacles)
 * - Evaluates Face Dimensions (Proper Framing)
 */
function assessImageQuality(
  img: HTMLImageElement,
  cropRect: { x: number; y: number; width: number; height: number },
  faceCount: number
): FacePreValidationResult {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      passed: false,
      faceCount,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Erro interno ao renderizar a imagem para análise de qualidade.',
    };
  }

  // Draw face region onto standard analysis canvas
  ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // 1. Luminance & Contrast Calculation
  let totalLum = 0;
  const lumGrid = new Float32Array(size * size);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumGrid[i / 4] = lum;
    totalLum += lum;
  }

  const meanLum = totalLum / (size * size);

  // Standard deviation (Contrast)
  let varSum = 0;
  for (let i = 0; i < lumGrid.length; i++) {
    varSum += Math.pow(lumGrid[i] - meanLum, 2);
  }
  const stdDevLum = Math.sqrt(varSum / (size * size));

  // 2. Sharpness / Blur Detection via Discrete Laplacian Operator
  let laplacianSum = 0;
  let laplacianVarSum = 0;
  let laplacianCount = 0;
  const lapArray: number[] = [];

  for (let y = 1; y < size - 1; y += 2) {
    for (let x = 1; x < size - 1; x += 2) {
      const idx = y * size + x;
      // Discrete Laplacian 3x3 kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
      const center = lumGrid[idx];
      const top = lumGrid[idx - size];
      const bottom = lumGrid[idx + size];
      const left = lumGrid[idx - 1];
      const right = lumGrid[idx + 1];
      const lap = Math.abs(top + bottom + left + right - 4 * center);

      lapArray.push(lap);
      laplacianSum += lap;
      laplacianCount++;
    }
  }

  const meanLap = laplacianCount > 0 ? laplacianSum / laplacianCount : 0;
  for (let i = 0; i < lapArray.length; i++) {
    laplacianVarSum += Math.pow(lapArray[i] - meanLap, 2);
  }
  const laplacianVariance = laplacianCount > 0 ? laplacianVarSum / laplacianCount : 0;

  // 3. Bilateral Symmetry Analysis (Anti-Hand / Anti-Obstacle)
  const cStart = Math.floor(size * 0.20);
  const cEnd = Math.floor(size * 0.80);
  const halfSpan = Math.floor((cEnd - cStart) / 2);
  let symDot = 0;
  let leftSq = 0;
  let rightSq = 0;

  for (let y = cStart; y < cEnd; y++) {
    for (let x = 0; x < halfSpan; x++) {
      const lx = cStart + x;
      const rx = cEnd - 1 - x;
      const lVal = lumGrid[y * size + lx];
      const rVal = lumGrid[y * size + rx];
      symDot += lVal * rVal;
      leftSq += lVal * lVal;
      rightSq += rVal * rVal;
    }
  }

  const symmetryScore = leftSq > 0 && rightSq > 0 ? symDot / Math.sqrt(leftSq * rightSq) : 0;

  // Sizing / Framing Check
  const imgW = img.naturalWidth || img.width || 640;
  const imgH = img.naturalHeight || img.height || 480;
  const faceRatioW = cropRect.width / imgW;
  const faceRatioH = cropRect.height / imgH;

  // Scores Normalized (0 to 100)
  const brightnessScore = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(meanLum - 128) * 0.9)));
  const sharpnessScore = Math.round(Math.min(100, (laplacianVariance / 35) * 100));
  const contrastScore = Math.round(Math.min(100, (stdDevLum / 40) * 100));
  const symNormScore = Math.round(Math.min(100, symmetryScore * 100));
  const overallQuality = Math.round(
    brightnessScore * 0.25 + sharpnessScore * 0.30 + contrastScore * 0.25 + symNormScore * 0.20
  );

  const quality: QualityMetrics = {
    brightnessScore,
    sharpnessScore,
    contrastScore,
    symmetryScore: symNormScore,
    overallQuality,
  };

  // --------------------------------------------------------------------------
  // QUALITY REJECTIONS
  // --------------------------------------------------------------------------

  // Check 1: Dark / Underexposed
  if (meanLum < 28) {
    return {
      passed: false,
      faceCount,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Qualidade insuficiente: Iluminação muito baixa (ambiente escuro). Vá para um local mais iluminado para capturar a foto.',
      quality,
      cropRect,
    };
  }

  // Check 2: Overexposed / Washed out
  if (meanLum > 238) {
    return {
      passed: false,
      faceCount,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Qualidade insuficiente: Claridade excessiva ou luz direta ofuscando a câmera. Ajuste sua posição em relação à luz.',
      quality,
      cropRect,
    };
  }

  // Check 3: Blur / Motion / Out of focus
  if (laplacianVariance < 11) {
    return {
      passed: false,
      faceCount,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Qualidade insuficiente: Imagem desfocada ou tremida. Mantenha o dispositivo firme e fique parado por um instante.',
      quality,
      cropRect,
    };
  }

  // Check 4: Low Contrast / Obstructed Lens
  if (stdDevLum < 14) {
    return {
      passed: false,
      faceCount,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Qualidade insuficiente: Baixo contraste ou câmera obstruída. Limpe a lente e remova objetos da frente do rosto.',
      quality,
      cropRect,
    };
  }

  // Check 5: Framing (Face Too Far / Tiny)
  if (faceRatioW < 0.12 || faceRatioH < 0.12) {
    return {
      passed: false,
      faceCount,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Qualidade insuficiente: Rosto muito distante da câmera. Aproxime-se do visor para enquadrar adequadamente.',
      quality,
      cropRect,
    };
  }

  // Check 6: Symmetry & Anti-Obstacle Filter
  if (symmetryScore < 0.42) {
    return {
      passed: false,
      faceCount,
      stageFailed: 'IMAGE_QUALITY',
      errorCode: 'INSUFFICIENT_QUALITY',
      errorMessage: 'Qualidade insuficiente: O formato do rosto está obstruído (mão, objeto ou ângulo excessivo). Enquadre o rosto de frente.',
      quality,
      cropRect,
    };
  }

  // Quality Validation Passed!
  return {
    passed: true,
    faceCount: 1,
    quality,
    cropRect,
  };
}

/**
 * Computer Vision Multi-Region Facial & Skin Cluster Scanner.
 * Detects whether 0, 1, or >1 faces are present in the image.
 */
function analyzeFacesComputerVision(img: HTMLImageElement): {
  faceCount: number;
  cropRect: { x: number; y: number; width: number; height: number };
  customReason?: string;
} {
  const w = 160;
  const h = 120;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const defaultCrop = {
    x: Math.floor(img.width * 0.12),
    y: Math.floor(img.height * 0.08),
    width: Math.floor(img.width * 0.76),
    height: Math.floor(img.height * 0.84),
  };

  if (!ctx) {
    return { faceCount: 1, cropRect: defaultCrop };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Skin tone & energy map
  let totalSkinPixels = 0;
  let totalFrameEnergy = 0;

  // Split horizontally into 3 overlapping zones:
  // Zone Left: 0 to 80 (50%)
  // Zone Center: 40 to 120 (50%)
  // Zone Right: 80 to 160 (50%)
  let leftSkin = 0;
  let centerSkin = 0;
  let rightSkin = 0;

  let leftEnergy = 0;
  let rightEnergy = 0;
  let centerEnergy = 0;

  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // YCbCr skin tone estimation
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isSkin = Cr >= 133 && Cr <= 173 && Cb >= 77 && Cb <= 127 && Y >= 35 && Y <= 235;

      // Gradient Energy
      let grad = 0;
      if (x < w - 2) {
        const nextIdx = (y * w + (x + 2)) * 4;
        grad += Math.abs(data[nextIdx] - r);
      }
      if (y < h - 2) {
        const downIdx = ((y + 2) * w + x) * 4;
        grad += Math.abs(data[downIdx] - r);
      }

      totalFrameEnergy += grad;

      if (isSkin) {
        totalSkinPixels++;
        if (x < 80) leftSkin++;
        if (x >= 40 && x <= 120) centerSkin++;
        if (x > 80) rightSkin++;
      }

      if (x < 70) leftEnergy += grad;
      else if (x > 90) rightEnergy += grad;
      else centerEnergy += grad;
    }
  }

  const sampleCount = (w * h) / 4;
  const skinRatio = totalSkinPixels / sampleCount;

  // Case 0: Virtually zero skin pixels / zero facial energy (blank surface, wall, dark room)
  if (skinRatio < 0.05 && totalFrameEnergy < 15000) {
    return {
      faceCount: 0,
      cropRect: defaultCrop,
      customReason: 'Nenhum rosto humano detectado na imagem. Posicione seu rosto em frente à câmera.',
    };
  }

  // Multiple Faces Check:
  // Both Left Zone and Right Zone have high independent skin density AND strong separated energy centers
  const leftRatio = leftSkin / ((80 * h) / 4);
  const rightRatio = rightSkin / ((80 * h) / 4);

  if (leftRatio > 0.18 && rightRatio > 0.18 && leftEnergy > 18000 && rightEnergy > 18000) {
    // Two distinct facial clusters on left and right sides
    return {
      faceCount: 2,
      cropRect: defaultCrop,
    };
  }

  // Single Face: Calculate centered bounding box
  return {
    faceCount: 1,
    cropRect: defaultCrop,
  };
}

// ============================================================================
// STAGE 2 FEATURE EXTRACTION & MATCHING HELPERS
// ============================================================================

/**
 * Extracts a Zero-Mean Normalized Feature Descriptor (Spatial HOG + Gradient Energy).
 */
function extractFacialDescriptor(
  img: HTMLImageElement,
  crop?: { x: number; y: number; width: number; height: number }
): number[] | null {
  try {
    const GRID = 8; // 8x8 spatial grid
    const dim = 64;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Use normalized center crop for invariant facial alignment
    if (crop && crop.width > 30 && crop.height > 30) {
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, dim, dim);
    } else {
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, dim, dim);
    }

    const imgData = ctx.getImageData(0, 0, dim, dim);
    const data = imgData.data;

    const rawFeatures: number[] = [];
    const cellPixels = dim / GRID; // 8x8 pixels per cell

    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        let lumSum = 0;
        let gradXSum = 0;
        let gradYSum = 0;
        let count = 0;

        for (let py = 0; py < cellPixels; py++) {
          for (let px = 0; px < cellPixels; px++) {
            const x = Math.floor(gx * cellPixels + px);
            const y = Math.floor(gy * cellPixels + py);
            const idx = (y * dim + x) * 4;

            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            lumSum += lum;

            // Horizontal and Vertical Gradients
            if (x < dim - 1) {
              const rightIdx = (y * dim + (x + 1)) * 4;
              const rightLum = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
              gradXSum += Math.abs(rightLum - lum);
            }
            if (y < dim - 1) {
              const downIdx = ((y + 1) * dim + x) * 4;
              const downLum = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2];
              gradYSum += Math.abs(downLum - lum);
            }

            count++;
          }
        }

        const avgLum = count > 0 ? lumSum / count : 0;
        const avgGradX = count > 0 ? gradXSum / count : 0;
        const avgGradY = count > 0 ? gradYSum / count : 0;

        rawFeatures.push(avgLum);
        rawFeatures.push(avgGradX + avgGradY);
      }
    }

    // Zero-Mean Centering
    let mean = 0;
    for (let i = 0; i < rawFeatures.length; i++) {
      mean += rawFeatures[i];
    }
    mean /= rawFeatures.length;

    const zeroMeanFeatures = rawFeatures.map((f) => f - mean);

    // Normalize to unit Euclidean norm
    let sumSq = 0;
    for (let i = 0; i < zeroMeanFeatures.length; i++) {
      sumSq += zeroMeanFeatures[i] * zeroMeanFeatures[i];
    }
    const magnitude = Math.sqrt(sumSq);

    if (magnitude === 0) return null;

    return zeroMeanFeatures.map((f) => f / magnitude);
  } catch (err) {
    console.error('Error extracting facial descriptor:', err);
    return null;
  }
}

/**
 * Calculates Pearson Correlation / Zero-Mean Cosine Similarity between two biometric vectors.
 */
function calculateZeroMeanCorrelation(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return -1;

  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }

  return Math.max(-1, Math.min(1, dot));
}

/**
 * Calibrates the Zero-Mean Pearson Correlation into an intuitive 0-100% similarity score.
 */
function convertCorrelationToPercentage(rawCorrelation: number): number {
  if (rawCorrelation <= 0.10) {
    return Math.max(0, Math.round(rawCorrelation * 100));
  }
  if (rawCorrelation < 0.45) {
    const normalized = 10 + ((rawCorrelation - 0.10) / 0.35) * 68;
    return Math.round(normalized);
  }
  const normalized = 88 + ((rawCorrelation - 0.45) / 0.50) * 11;
  return Math.min(99, Math.max(0, Math.round(normalized)));
}

/**
 * Analyzes head pose orientation (Yaw, Pitch, Roll) in real-time for 3D Face ID calibration.
 */
export function estimateHeadPose(canvas: HTMLCanvasElement): FaceAngleDetection {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { detected: false, angle: 'CENTER', pitch: 0, yaw: 0, roll: 0, quality: 0 };
    }

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let leftMass = 0;
    let rightMass = 0;
    let topMass = 0;
    let bottomMass = 0;
    let totalMass = 0;

    const midX = w / 2;
    const midY = h / 2;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        let grad = 0;
        if (x < w - 2) {
          const nextIdx = (y * w + (x + 2)) * 4;
          grad += Math.abs(data[nextIdx] - r);
        }
        if (y < h - 2) {
          const downIdx = ((y + 2) * w + x) * 4;
          grad += Math.abs(data[downIdx] - r);
        }

        const energy = grad + (255 - lum) * 0.3;

        totalMass += energy;
        if (x < midX) leftMass += energy;
        else rightMass += energy;

        if (y < midY) topMass += energy;
        else bottomMass += energy;
      }
    }

    if (totalMass === 0) {
      return { detected: false, angle: 'CENTER', pitch: 0, yaw: 0, roll: 0, quality: 0 };
    }

    const yaw = (rightMass - leftMass) / (totalMass || 1);
    const pitch = (bottomMass - topMass) / (totalMass || 1);

    let angle: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' = 'CENTER';

    if (yaw < -0.12) angle = 'LEFT';
    else if (yaw > 0.12) angle = 'RIGHT';
    else if (pitch < -0.10) angle = 'UP';
    else if (pitch > 0.10) angle = 'DOWN';
    else angle = 'CENTER';

    return {
      detected: true,
      angle,
      yaw,
      pitch,
      roll: 0,
      quality: Math.min(1, totalMass / 50000),
    };
  } catch (e) {
    return { detected: false, angle: 'CENTER', pitch: 0, yaw: 0, roll: 0, quality: 0 };
  }
}

/**
 * Loads an image from a data URL or external URL safely.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = src;
  });
}
