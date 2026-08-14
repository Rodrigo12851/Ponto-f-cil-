import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Employee } from '../types';
import {
  Camera,
  X,
  Check,
  Upload,
  RefreshCw,
  Shield,
  Sparkles,
  Loader2,
  UserCheck,
  Compass,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Dot,
  CheckCircle2,
  Layers,
  RotateCcw,
  Zap,
  Volume2
} from 'lucide-react';
import { processProfilePhoto } from '../utils/imageHelper';
import { estimateHeadPose } from '../utils/faceBiometrics';

interface FacialRegistrationModalProps {
  employee: Employee;
  onSavePhotos: (employeeId: string, photos: string[]) => void;
  onClose: () => void;
}

interface CalibrationStep {
  id: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  title: string;
  subtitle: string;
  icon: any;
  angleHint: string;
}

const CALIBRATION_STEPS: CalibrationStep[] = [
  {
    id: 'CENTER',
    title: '1. Rosto Frontal (Centro)',
    subtitle: 'Olhe diretamente para a lente da câmera com expressão natural.',
    icon: Dot,
    angleHint: 'Mantenha o rosto centralizado no visor',
  },
  {
    id: 'LEFT',
    title: '2. Vire para a Esquerda',
    subtitle: 'Gire suavemente o rosto para o seu lado esquerdo.',
    icon: ArrowLeft,
    angleHint: 'Vire o rosto para a esquerda ⬅️',
  },
  {
    id: 'RIGHT',
    title: '3. Vire para a Direita',
    subtitle: 'Gire suavemente o rosto para o seu lado direito.',
    icon: ArrowRight,
    angleHint: 'Vire o rosto para a direita ➡️',
  },
  {
    id: 'UP',
    title: '4. Incline para Cima',
    subtitle: 'Eleve o queixo e olhe levemente para cima.',
    icon: ArrowUp,
    angleHint: 'Incline a cabeça para cima ⬆️',
  },
  {
    id: 'DOWN',
    title: '5. Incline para Baixo',
    subtitle: 'Abaixe levemente a cabeça mantendo os olhos visíveis.',
    icon: ArrowDown,
    angleHint: 'Incline a cabeça para baixo ⬇️',
  },
];

export const FacialRegistrationModal: React.FC<FacialRegistrationModalProps> = ({
  employee,
  onSavePhotos,
  onClose,
}) => {
  // Existing registered photos
  const existing = employee.facialPhotos || [];
  const [photos, setPhotos] = useState<string[]>([
    existing[0] || employee.avatar || '',
    existing[1] || '',
    existing[2] || '',
    existing[3] || '',
    existing[4] || '',
  ]);

  // Mode: 'GUIDED_3D' (interactive movement calibration) or 'MANUAL_GRID' (slot view)
  const [mode, setMode] = useState<'GUIDED_3D' | 'MANUAL_GRID'>('GUIDED_3D');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(true);
  const [isAutoCapturePending, setIsAutoCapturePending] = useState<boolean>(false);
  const [detectedPoseAngle, setDetectedPoseAngle] = useState<string>('CENTER');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Manual slot state
  const [activeManualSlot, setActiveManualSlot] = useState<number | null>(null);

  // Camera streams
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio cues
  const playSound = useCallback((type: 'beep' | 'success' | 'shutter' | 'complete') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'shutter') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'complete') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      // Audio not supported
    }
  }, []);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    setIsCameraActive(false);
    setCameraError(null);

    if (navigator?.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        })
        .then((s) => {
          stream = s;
          setIsCameraActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('Camera error in registration:', err);
          setCameraError('Não foi possível acessar a webcam. Use o modo de envio por arquivo.');
        });
    } else {
      setCameraError('Webcam não suportada neste dispositivo.');
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Capture snapshot helper
  const captureCurrentAngleSnapshot = useCallback(async (slotIndex: number) => {
    if (!videoRef.current) return null;
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);
    playSound('shutter');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Center crop square
      const minDim = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      const sx = ((video.videoWidth || 480) - minDim) / 2;
      const sy = ((video.videoHeight || 480) - minDim) / 2;

      ctx.translate(480, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 480, 480);

      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const processed = await processProfilePhoto(rawDataUrl, 400, 400, 0.88);

      const updated = [...photos];
      updated[slotIndex] = processed;
      setPhotos(updated);

      return processed;
    } catch (e) {
      console.error('Error capturing angle photo:', e);
      return null;
    }
  }, [photos, playSound]);

  // Head pose continuous tracker in 3D Mode
  useEffect(() => {
    if (mode !== 'GUIDED_3D' || !isCameraActive || isCompleted || isProcessing) return;

    let isScanning = true;
    let matchHoldFrames = 0;

    const trackPose = () => {
      if (!isScanning) return;

      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, 160, 160);
          const pose = estimateHeadPose(canvas);
          setDetectedPoseAngle(pose.angle);

          const targetStep = CALIBRATION_STEPS[currentStepIndex];
          const expectedTarget = targetStep?.id;
          if (!expectedTarget) return;

          // If the detected angle matches what we asked the user to do:
          if (pose.angle === expectedTarget) {
            matchHoldFrames++;
            if (matchHoldFrames >= 8 && !isAutoCapturePending) {
              // Target angle held for enough frames -> Auto capture!
              setIsAutoCapturePending(true);
              playSound('success');
              captureCurrentAngleSnapshot(currentStepIndex).then(() => {
                setIsAutoCapturePending(false);
                matchHoldFrames = 0;

                if (currentStepIndex < CALIBRATION_STEPS.length - 1) {
                  setCurrentStepIndex((prev) => prev + 1);
                } else {
                  setIsCompleted(true);
                  playSound('complete');
                }
              });
            }
          } else {
            matchHoldFrames = Math.max(0, matchHoldFrames - 1);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(trackPose);
    };

    animationFrameRef.current = requestAnimationFrame(trackPose);

    return () => {
      isScanning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, isCameraActive, currentStepIndex, isCompleted, isProcessing, isAutoCapturePending, captureCurrentAngleSnapshot, playSound]);

  // Manual Click to advance angle
  const handleManualCaptureStep = async () => {
    setIsProcessing(true);
    await captureCurrentAngleSnapshot(currentStepIndex);
    playSound('success');
    setIsProcessing(false);

    if (currentStepIndex < CALIBRATION_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      playSound('complete');
    }
  };

  // Restart 3D Calibration
  const handleRestartCalibration = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
    setIsCalibrating(true);
    setPhotos(['', '', '', '', '']);
  };

  // Save all photos
  const handleSaveAndConfirm = () => {
    const validPhotos = photos.filter((p) => p && p.trim().length > 0);
    onSavePhotos(employee.id, validPhotos);
    onClose();
  };

  const validPhotosCount = photos.filter((p) => p && p.trim().length > 0).length;
  const safeStepIndex = Math.min(Math.max(0, currentStepIndex), CALIBRATION_STEPS.length - 1);
  const currentStep = CALIBRATION_STEPS[safeStepIndex] || CALIBRATION_STEPS[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-in fade-in select-none">
      
      {/* Flash Effect on Angle Capture */}
      {flashEffect && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200"></div>
      )}

      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-auto text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Calibração 3D Face ID</h3>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Multi-Ângulo
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Mapeamento facial completo para <strong>{employee.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-4">
          <button
            onClick={() => setMode('GUIDED_3D')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'GUIDED_3D'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Mapeamento 3D Guiado
          </button>
          <button
            onClick={() => setMode('MANUAL_GRID')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'MANUAL_GRID'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Galeria / Manual ({validPhotosCount}/5)
          </button>
        </div>

        {/* 3D GUIDED CALIBRATION VIEW */}
        {mode === 'GUIDED_3D' && (
          <div className="space-y-4">
            {!isCompleted ? (
              <>
                {/* Active Angle Target Banner */}
                <div className="bg-blue-950/60 border border-blue-700/50 rounded-2xl p-3.5 text-center relative overflow-hidden">
                  <div className="flex items-center justify-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Passo {safeStepIndex + 1} de {CALIBRATION_STEPS.length}: {currentStep?.title || ''}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-0.5">{currentStep?.subtitle || ''}</p>
                  <p className="text-[11px] text-blue-300 font-semibold">{currentStep?.angleHint || ''}</p>
                </div>

                {/* 360° Circular Biometric HUD Scanner */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
                  
                  {/* Outer 5-Segmented Multi-Angle Progress Ring */}
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                    {CALIBRATION_STEPS.map((step, idx) => {
                      const totalSteps = CALIBRATION_STEPS.length;
                      const segmentAngle = 360 / totalSteps;
                      const gap = 6;
                      const strokeDash = `${(segmentAngle - gap) * 0.72} ${1000}`;
                      const rotation = idx * segmentAngle;
                      const isFilled = idx < currentStepIndex || (photos[idx] && photos[idx].length > 0);
                      const isCurrent = idx === currentStepIndex;

                      return (
                        <circle
                          key={step.id}
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke={isFilled ? '#10b981' : isCurrent ? '#3b82f6' : '#334155'}
                          strokeWidth={isCurrent ? '5' : '3.5'}
                          strokeDasharray={strokeDash}
                          transform={`rotate(${rotation} 50 50)`}
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      );
                    })}
                  </svg>

                  {/* Circular Video Container */}
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full overflow-hidden border-4 border-slate-700 shadow-2xl bg-black flex items-center justify-center">
                    {isCameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                    ) : (
                      <div className="p-4 text-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                        <p className="text-xs">{cameraError || 'Iniciando câmera...'}</p>
                      </div>
                    )}

                    {/* Directional Overlay Arrow Hint */}
                    {isCameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3">
                        {/* Top Indicator */}
                        <div className={`p-1.5 rounded-full transition ${currentStep?.id === 'UP' ? 'bg-blue-500 text-white animate-bounce' : 'text-slate-600'}`}>
                          <ArrowUp className="w-5 h-5" />
                        </div>
                        <div className="w-full flex items-center justify-between">
                          <div className={`p-1.5 rounded-full transition ${currentStep?.id === 'LEFT' ? 'bg-blue-500 text-white animate-pulse' : 'text-slate-600'}`}>
                            <ArrowLeft className="w-5 h-5" />
                          </div>
                          <div className={`p-1.5 rounded-full transition ${currentStep?.id === 'CENTER' ? 'bg-emerald-500 text-white ring-4 ring-emerald-400/40' : 'text-slate-600'}`}>
                            <Dot className="w-5 h-5" />
                          </div>
                          <div className={`p-1.5 rounded-full transition ${currentStep?.id === 'RIGHT' ? 'bg-blue-500 text-white animate-pulse' : 'text-slate-600'}`}>
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                        {/* Bottom Indicator */}
                        <div className={`p-1.5 rounded-full transition ${currentStep?.id === 'DOWN' ? 'bg-blue-500 text-white animate-bounce' : 'text-slate-600'}`}>
                          <ArrowDown className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Indicators Pills */}
                <div className="flex items-center justify-center gap-2">
                  {CALIBRATION_STEPS.map((s, idx) => {
                    const isDone = !!photos[idx];
                    const isCurr = idx === currentStepIndex;
                    return (
                      <div
                        key={s.id}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition ${
                          isDone
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : isCurr
                            ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-500/50 animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                        <span>{s.id}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Calibration Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleManualCaptureStep}
                    disabled={!isCameraActive || isProcessing}
                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" /> CAPTURAR ÂNGULO AGORA
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Calibration Complete Screen */
              <div className="py-4 text-center space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">Mapeamento 3D Concluído!</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                    Todos os 5 ângulos faciais (frontal, lateral esquerdo, lateral direito, superior e inferior) foram registrados com sucesso.
                  </p>
                </div>

                {/* 5-Photo Preview Ribbon */}
                <div className="grid grid-cols-5 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden bg-slate-800 aspect-square border border-slate-700">
                      {p ? (
                        <img src={p} alt={`Ângulo ${idx}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">--</div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-black text-center text-slate-300 uppercase py-0.5">
                        {CALIBRATION_STEPS[idx]?.id || `Ângulo ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRestartCalibration}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Recalibrar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndConfirm}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                  >
                    <UserCheck className="w-4 h-4" /> SALVAR FACE ID NO SISTEMA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL GRID VIEW (Photos Gallery & Slot Editor) */}
        {mode === 'MANUAL_GRID' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Você pode capturar ou substituir fotos individuais para qualquer um dos 5 ângulos do Face ID.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CALIBRATION_STEPS.map((step, idx) => {
                const hasPhoto = !!photos[idx];
                return (
                  <div
                    key={step.id}
                    className={`p-3 rounded-2xl border transition flex flex-col items-center text-center ${
                      hasPhoto
                        ? 'bg-slate-950 border-emerald-500/50'
                        : 'bg-slate-950/50 border-dashed border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      {step.title.split('. ')[1] || step.title}
                    </span>

                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-800 mb-2 border border-slate-700">
                      {hasPhoto ? (
                        <img src={photos[idx]} alt={step.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <Camera className="w-5 h-5 mb-1" />
                          <span className="text-[9px] font-bold">Vazio</span>
                        </div>
                      )}

                      {hasPhoto && (
                        <div className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-md">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="w-full flex gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await captureCurrentAngleSnapshot(idx);
                        }}
                        className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Camera className="w-3 h-3" /> Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveManualSlot(idx);
                          fileInputRef.current?.click();
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer border border-slate-700"
                        title="Upload de arquivo"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">
                Status: <strong className="text-white">{validPhotosCount}/5 fotos calibradas</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndConfirm}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" /> Salvar Face ID
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden File Input for Manual Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || activeManualSlot === null) return;
            try {
              const processed = await processProfilePhoto(file, 400, 400, 0.88);
              const updated = [...photos];
              updated[activeManualSlot] = processed;
              setPhotos(updated);
            } catch (err) {
              console.error(err);
            } finally {
              setActiveManualSlot(null);
            }
          }}
        />

        {/* Hidden Canvas for Head Pose Analysis */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
