import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, CheckCircle, MapPin, RefreshCw, AlertCircle, ShieldCheck, Sparkles, Zap, AlertTriangle, AlertOctagon, UserCheck, UserX, Database, Lock } from 'lucide-react';
import { Employee, LocationData, PunchType } from '../types';
import { getPunchTypeLabel } from '../utils/timeFormatters';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLock';
import { verifyEmployeeFaceAgainstAvatar, verifyAndRecognizeFace } from '../utils/faceBiometrics';
import { addFacialAuditLog } from '../utils/facialAuditStorage';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  punchType: PunchType;
  location: LocationData;
  employee?: Employee;
  employees?: Employee[];
  onCapture: (photoDataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  punchType,
  location,
  employee,
  employees = [],
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isVerifyingBio, setIsVerifyingBio] = useState<boolean>(false);
  const [bioConfidence, setBioConfidence] = useState<number>(0);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioErrorCode, setBioErrorCode] = useState<string | null>(null);
  const [bioStageFailed, setBioStageFailed] = useState<string | null>(null);
  const [bioQuality, setBioQuality] = useState<{ overallQuality?: number; sharpnessScore?: number; brightnessScore?: number } | null>(null);

  // Play camera shutter sound using Web Audio API
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio effect failed', e);
    }
  }, []);

  const handleTakeSnapshot = useCallback(async () => {
    setBioError(null);
    setBioErrorCode(null);
    setBioStageFailed(null);
    setBioQuality(null);
    setBioConfidence(0);

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
    playShutterSound();

    let dataUrl: string | null = null;

    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror horizontally
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      }
    }

    if (!dataUrl) {
      setBioError('Face not recognized. Não foi possível capturar o quadro da câmera.');
      setBioErrorCode('IMAGE_ERROR');
      return;
    }

    setCapturedImage(dataUrl);
    setIsVerifyingBio(true);

    try {
      let bioResult;
      if (employee) {
        // Multi-Stage Verification: Stage 1 (1 Face count + Quality/Sharpness Pre-filter) -> Stage 2 (Biometric Match against Firestore Avatar ONLY)
        bioResult = await verifyEmployeeFaceAgainstAvatar(dataUrl, employee, 90);
      } else {
        bioResult = await verifyAndRecognizeFace(dataUrl, employees, 90);
      }

      setIsVerifyingBio(false);

      if (!bioResult.success || (bioResult.confidence !== undefined && bioResult.confidence < 90)) {
        setBioConfidence(bioResult.confidence || 0);
        setBioError(bioResult.errorMessage || 'Face not recognized. Validação facial reprovada.');
        setBioErrorCode(bioResult.error || 'FACE_NOT_MATCHED');
        setBioStageFailed(bioResult.stageFailed || null);
        setBioQuality(bioResult.quality || null);

        // Record audit log for failed verification
        addFacialAuditLog({
          attemptType: 'MOBILE_APP_11',
          result: 'FAILURE',
          employeeId: employee?.id,
          employeeName: employee?.name || 'Não identificado',
          employeeAvatar: employee?.avatar,
          employeeRole: employee?.role,
          employeeDepartment: employee?.department,
          confidence: bioResult.confidence || 0,
          minThreshold: 90,
          faceCount: bioResult.faceCount !== undefined ? bioResult.faceCount : (bioResult.error === 'MULTIPLE_FACES_DETECTED' ? 2 : bioResult.error === 'NO_FACE_DETECTED' ? 0 : 1),
          stageFailed: bioResult.stageFailed || 'BIOMETRIC_MATCH',
          errorCode: bioResult.error || 'FACE_NOT_MATCHED',
          failureReason: bioResult.errorMessage,
          debugInfo: bioResult.debugInfo,
          qualityMetrics: bioResult.quality ? {
            brightnessScore: bioResult.quality.brightnessScore,
            sharpnessScore: bioResult.quality.sharpnessScore,
            contrastScore: bioResult.quality.contrastScore,
            symmetryScore: bioResult.quality.symmetryScore,
            overallQuality: bioResult.quality.overallQuality,
          } : undefined,
          photoSnapshot: dataUrl,
          deviceLabel: 'Smartphone Pessoal (App Ponto - Firestore Avatar Match)',
          ipOrLocation: location.address || 'Localização Ponto',
        });
      } else {
        setBioConfidence(bioResult.confidence || 95);
        setBioError(null);
        setBioErrorCode(null);
        setBioStageFailed(null);
        setBioQuality(bioResult.quality || null);

        const matched = bioResult.matchedEmployee || employee;
        // Record audit log for successful verification
        addFacialAuditLog({
          attemptType: 'MOBILE_APP_11',
          result: 'SUCCESS',
          employeeId: matched?.id,
          employeeName: matched?.name || 'Colaborador',
          employeeAvatar: matched?.avatar,
          employeeRole: matched?.role,
          employeeDepartment: matched?.department,
          confidence: bioResult.confidence || 96,
          minThreshold: 90,
          faceCount: 1,
          stageFailed: 'NONE',
          errorCode: 'NONE',
          debugInfo: `Autenticado com ${bioResult.confidence || 96}% contra avatar do Firestore`,
          qualityMetrics: bioResult.quality ? {
            brightnessScore: bioResult.quality.brightnessScore,
            sharpnessScore: bioResult.quality.sharpnessScore,
            contrastScore: bioResult.quality.contrastScore,
            symmetryScore: bioResult.quality.symmetryScore,
            overallQuality: bioResult.quality.overallQuality,
          } : undefined,
          photoSnapshot: dataUrl,
          deviceLabel: 'Smartphone Pessoal (App Ponto - Firestore Avatar Match)',
          ipOrLocation: location.address || 'Localização Ponto',
        });
      }
    } catch (err) {
      setIsVerifyingBio(false);
      setBioConfidence(0);
      setBioError('Face not recognized. Erro ao processar validação biométrica.');
      setBioErrorCode('IMAGE_ERROR');

      addFacialAuditLog({
        attemptType: 'MOBILE_APP_11',
        result: 'FAILURE',
        employeeId: employee?.id,
        employeeName: employee?.name,
        confidence: 0,
        minThreshold: 90,
        faceCount: 0,
        stageFailed: 'IMAGE_QUALITY',
        errorCode: 'IMAGE_ERROR',
        failureReason: 'Erro durante o processamento do quadro de imagem.',
        photoSnapshot: dataUrl,
        deviceLabel: 'Smartphone Pessoal (App Ponto - Firestore Avatar Match)',
        ipOrLocation: location.address || 'Localização Ponto',
      });
    }
  }, [playShutterSound, stream, employee, employees, location]);

  // Keep screen awake while modal is open
  useEffect(() => {
    if (isOpen) {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
    return () => {
      releaseScreenWakeLock();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      setBioError(null);
      setBioConfidence(0);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Ensure video element receives stream whenever it mounts or when capturedImage becomes null
  useEffect(() => {
    if (isOpen && !capturedImage && videoRef.current) {
      if (stream && stream.active) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Video play error:', err));
      } else {
        startCamera();
      }
    }
  }, [isOpen, capturedImage, stream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setBioError(null);
    setBioConfidence(0);
    stopCamera();
    startCamera();
  };

  const handleConfirmAndSave = () => {
    if (!capturedImage) return;
    if (bioError || bioConfidence < 90) {
      alert('ACESSO E REGISTRO BLOQUEADOS!\n\nFace not recognized: O rosto capturado não correspondeu ao avatar cadastrado no Firestore com o mínimo de 90% de similaridade.');
      return;
    }
    if (!location.inGeofence) {
      alert(`REGISTRO DE PONTO BLOQUEADO!\n\nSua localização atual está fora da área permitida da empresa (${location.distanceMeters || 0}m de distância) e o dispositivo não está conectado a uma rede Wi-Fi confiável.`);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      onCapture(capturedImage);
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between items-center p-4 md:p-6 text-white animate-in fade-in duration-200 select-none overflow-y-auto">
      
      {/* Flash Effect on Capture */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200 animate-out fade-out"></div>
      )}

      {/* Top Header */}
      <div className="w-full max-w-lg flex items-center justify-between z-20">
        <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            Validação Facial • {getPunchTypeLabel(punchType)}
          </span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 font-mono">
            <Database className="w-2.5 h-2.5" /> Firestore Avatar
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Viewport / Preview */}
      <div className="relative w-full max-w-md h-[390px] sm:h-[430px] bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center my-auto">
        {!capturedImage ? (
          <>
            {/* Live Video Feed */}
            {!cameraError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="p-6 text-center text-slate-300 max-w-xs flex flex-col items-center gap-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-xs leading-relaxed">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="mt-2 text-xs font-bold text-blue-400 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                </button>
              </div>
            )}

            {/* Facial Recognition Overlay Guide Oval with Pre-Filter Requirements */}
            {!cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="w-56 h-72 border-4 border-blue-400/80 rounded-[50%] flex items-center justify-center relative shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                  
                  {/* Status Badge */}
                  <div className="absolute -top-3.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg bg-blue-600 text-white border border-blue-400">
                    <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>Enquadre 1 Rosto Nítido no Círculo</span>
                  </div>

                  {/* Target Corner Marks */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl-lg"></div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br-lg"></div>
                </div>

                {/* Pre-filter Notice Pill */}
                <div className="mt-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-[10px] text-slate-300 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  Pré-filtro rigoroso: 1 único rosto humano nítido + avatar Firestore
                </div>
              </div>
            )}

            {/* GPS Geofence badge inside camera */}
            <div
              className={`absolute bottom-4 left-4 right-4 backdrop-blur-md p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 shadow-lg ${
                location.inGeofence
                  ? 'bg-slate-900/85 border-slate-700 text-white'
                  : 'bg-rose-950/90 border-rose-600 text-rose-100'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin
                  className={`w-4 h-4 shrink-0 ${
                    location.inGeofence ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                />
                <div className="truncate">
                  <p className="font-semibold truncate">{location.address}</p>
                  <p
                    className={`text-[10px] font-bold ${
                      location.inGeofence ? 'text-emerald-400' : 'text-rose-300'
                    }`}
                  >
                    {location.inGeofence
                      ? '✓ Dentro da cerca geográfica da empresa'
                      : `❌ FORA DA ÁREA PERMITIDA (${location.distanceMeters || 0}m) - Registro Bloqueado`}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Captured Photo Preview with Side-by-Side Firestore Avatar Biometric Comparison */
          <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
            <img
              src={capturedImage}
              alt="Foto de Confirmação"
              className="w-full h-full object-cover filter brightness-95 contrast-105"
            />

            {/* Official Firestore Avatar Picture-in-Picture for Direct Visual Comparison */}
            {employee && employee.avatar && (
              <div className="absolute bottom-3 left-3 bg-slate-950/95 p-2 rounded-2xl border-2 border-indigo-500/50 backdrop-blur-md shadow-2xl flex items-center gap-2.5 max-w-[220px]">
                <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-indigo-400 shrink-0">
                  <img
                    src={employee.avatar}
                    alt="Avatar Oficial do Firestore"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="overflow-hidden text-left">
                  <p className="text-[9px] uppercase font-black tracking-wider text-indigo-300 flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" /> Avatar Firestore
                  </p>
                  <p className="text-xs font-bold text-white truncate">{employee.name.split(' ')[0]}</p>
                </div>
              </div>
            )}

            {/* Biometric Status Header Overlay */}
            {isVerifyingBio ? (
              <div className="absolute top-4 bg-indigo-600/95 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-2xl border border-indigo-400 backdrop-blur-md">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                <span>Executando Pré-Filtro & Comparação com Firestore...</span>
              </div>
            ) : bioError ? (
              <div className="absolute top-3 inset-x-3 bg-rose-950/95 text-rose-200 border-2 border-rose-500 px-4 py-3 rounded-2xl text-xs font-bold flex items-start gap-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2">
                <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-left flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <p className="font-black text-white uppercase text-[10px] tracking-wide flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                      {bioStageFailed === 'FACE_COUNT'
                        ? 'Pré-Filtro: Contagem Facial'
                        : bioStageFailed === 'IMAGE_QUALITY'
                        ? 'Pré-Filtro: Nitidez & Qualidade'
                        : 'Comparação: Avatar Firestore'}
                    </p>
                    {bioStageFailed === 'BIOMETRIC_MATCH' && (
                      <span className="text-[10px] bg-rose-900 text-rose-200 font-mono px-2 py-0.5 rounded-md border border-rose-700 font-bold">
                        Similaridade: {bioConfidence}% (Exigido: ≥90%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-snug text-rose-200">{bioError}</p>
                  <p className="text-[10px] text-rose-400 font-black uppercase tracking-wider mt-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-rose-400" /> ACESSO E REGISTRO BLOQUEADOS
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute top-4 bg-emerald-500 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-2xl border-2 border-emerald-300 animate-in zoom-in-95">
                <CheckCircle className="w-4 h-4 text-slate-950" />
                <UserCheck className="w-4 h-4 text-slate-950" />
                <span>Validação Aprovada • Avatar Firestore ({bioConfidence}% ≥ 90%)</span>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md flex flex-col items-center gap-3 z-20 mt-2">
        {!capturedImage ? (
          <div className="w-full space-y-2">
            <button
              onClick={handleTakeSnapshot}
              disabled={!!cameraError}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/30 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer border border-blue-400 disabled:opacity-50"
            >
              <Camera className="w-5 h-5" /> TIRAR FOTO DO PONTO
            </button>
            <p className="text-[11px] text-slate-400 font-medium text-center">
              Posicione 1 único rosto no centro, com boa iluminação, e clique no botão acima.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-2">
            <div className="w-full flex gap-3">
              <button
                onClick={handleRetakePhoto}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-2xl transition cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                Tirar Outra Foto
              </button>
              
              <button
                disabled={isSubmitting || isVerifyingBio || Boolean(bioError) || bioConfidence < 90}
                onClick={handleConfirmAndSave}
                className={`flex-2 py-3.5 font-extrabold text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 ${
                  bioError || isVerifyingBio || bioConfidence < 90
                    ? 'bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800 opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Registrando Ponto...
                  </>
                ) : isVerifyingBio ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Validando Biometria...
                  </>
                ) : bioError || bioConfidence < 90 ? (
                  <>
                    <Lock className="w-4 h-4 text-rose-400" /> Acesso Bloqueado (Não Reconhecido)
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> CONFIRMAR E SALVAR PONTO
                  </>
                )}
              </button>
            </div>

            {bioError && (
              <p className="text-[11px] text-rose-400 font-bold text-center flex items-center justify-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                Acesso bloqueado: Rosto não identificado ou dissimilar com o avatar cadastrado no Firestore (&lt; 90%).
              </p>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center">
          Sua foto e localização GPS são criptografadas e gravadas com selo de integridade no espelho de ponto.
        </p>
      </div>
    </div>
  );
};

