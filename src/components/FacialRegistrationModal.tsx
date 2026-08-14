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
  AlertCircle,
  Eye
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
  angleHint: string;
  icon: any;
}

const CALIBRATION_STEPS: CalibrationStep[] = [
  {
    id: 'CENTER',
    title: '1. Rosto Frontal (Centro)',
    subtitle: 'Olhe diretamente para a lente da câmera com expressão natural.',
    angleHint: 'Mantenha o rosto centralizado no visor',
    icon: Dot,
  },
  {
    id: 'LEFT',
    title: '2. Vire para a Esquerda',
    subtitle: 'Gire suavemente o rosto para o seu lado esquerdo.',
    angleHint: 'Vire o rosto para a esquerda ⬅️',
    icon: ArrowLeft,
  },
  {
    id: 'RIGHT',
    title: '3. Vire para a Direita',
    subtitle: 'Gire suavemente o rosto para o seu lado direito.',
    angleHint: 'Vire o rosto para a direita ➡️',
    icon: ArrowRight,
  },
  {
    id: 'UP',
    title: '4. Incline para Cima',
    subtitle: 'Eleve o queixo e olhe levemente para cima.',
    angleHint: 'Incline a cabeça para cima ⬆️',
    icon: ArrowUp,
  },
  {
    id: 'DOWN',
    title: '5. Incline para Baixo',
    subtitle: 'Abaixe levemente a cabeça mantendo os olhos visíveis.',
    angleHint: 'Incline a cabeça para baixo ⬇️',
    icon: ArrowDown,
  },
];

export const FacialRegistrationModal: React.FC<FacialRegistrationModalProps> = ({
  employee,
  onSavePhotos,
  onClose,
}) => {
  const existing = employee.facialPhotos || [];
  const [photos, setPhotos] = useState<string[]>([
    existing[0] || employee.avatar || '',
    existing[1] || '',
    existing[2] || '',
    existing[3] || '',
    existing[4] || '',
  ]);

  const [mode, setMode] = useState<'GUIDED_3D' | 'MANUAL_GRID'>('GUIDED_3D');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [detectedPoseAngle, setDetectedPoseAngle] = useState<string>('CENTER');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [activeManualSlot, setActiveManualSlot] = useState<number | null>(null);

  // Camera state & streams
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio effects
  const playSound = useCallback((type: 'shutter' | 'success' | 'complete') => {
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
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
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
      // Ignore if web audio blocked
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      setMediaStream(null);
    }
    setIsCameraActive(false);
  }, [mediaStream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraActive(false);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Acesso à câmera não suportado neste navegador.');
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Ideal constraints failed, attempting fallback...', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        } catch (err2) {
          console.warn('FacingMode fallback failed, attempting basic stream...', err2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        setMediaStream(stream);
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('Camera access error in 3D Registration:', err);
      setIsCameraActive(false);
      setCameraError('Não foi possível iniciar a câmera. Verifique as permissões de vídeo do seu navegador.');
    }
  }, []);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startCamera, stopCamera]);

  // Bind video element whenever mediaStream or mode updates
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      if (videoRef.current.srcObject !== mediaStream) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [mediaStream, mode, isCompleted]);

  // Capture snapshot helper
  const captureCurrentAngleSnapshot = useCallback(async (slotIndex: number) => {
    if (!videoRef.current) return null;
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 150);
    playSound('shutter');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const minDim = Math.min(vw, vh);
      const sx = (vw - minDim) / 2;
      const sy = (vh - minDim) / 2;

      // Mirror capture
      ctx.translate(640, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 640, 640);

      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const processed = await processProfilePhoto(rawDataUrl, 420, 420, 0.90);

      setPhotos((prev) => {
        const next = [...prev];
        next[slotIndex] = processed;
        return next;
      });

      return processed;
    } catch (e) {
      console.error('Error capturing angle photo:', e);
      return null;
    }
  }, [playSound]);

  // Continuous pose tracker in Guided 3D Mode
  useEffect(() => {
    if (mode !== 'GUIDED_3D' || !isCameraActive || isCompleted || isProcessing) return;

    let isScanning = true;

    const trackPose = () => {
      if (!isScanning) return;

      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, 160, 120);
          const pose = estimateHeadPose(canvas);
          setDetectedPoseAngle(pose.angle);
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
  }, [mode, isCameraActive, isCompleted, isProcessing, currentStepIndex]);

  // Manual Trigger for Current Step
  const handleManualCaptureStep = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const captured = await captureCurrentAngleSnapshot(currentStepIndex);
      if (captured) {
        playSound('success');

        if (currentStepIndex + 1 < CALIBRATION_STEPS.length) {
          setTimeout(() => {
            setCurrentStepIndex((prev) => prev + 1);
            setIsProcessing(false);
          }, 350);
        } else {
          // Completed all 5 steps
          playSound('complete');
          setIsCompleted(true);
          setIsProcessing(false);
        }
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      setIsProcessing(false);
    }
  };

  const handleRestartCalibration = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
    startCamera();
  };

  const handleSaveAndConfirm = () => {
    const valid = photos.filter((p) => p && p.trim().length > 0);
    if (valid.length === 0) {
      alert('Por favor, capture pelo menos a foto frontal do rosto.');
      return;
    }
    onSavePhotos(employee.id, photos);
    onClose();
  };

  const validPhotosCount = photos.filter((p) => p && p.trim().length > 0).length;
  const safeStepIndex = Math.min(Math.max(0, currentStepIndex), CALIBRATION_STEPS.length - 1);
  const currentStep = CALIBRATION_STEPS[safeStepIndex] || CALIBRATION_STEPS[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto p-3 sm:p-5 flex items-center justify-center animate-in fade-in select-none">
      
      {/* Flash Effect on Angle Capture */}
      {flashEffect && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-150"></div>
      )}

      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative my-auto text-white flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Calibração 3D Face ID</h3>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mapeamento 5 Ângulos
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Cadastro biométrico 3D para <strong>{employee.name}</strong>
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
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 my-3 shrink-0">
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
          <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-3">
            {!isCompleted ? (
              <>
                {/* Active Angle Target Banner */}
                <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-700/50 rounded-2xl p-3 text-center relative overflow-hidden shrink-0">
                  <div className="flex items-center justify-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider mb-0.5">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    <span>Passo {safeStepIndex + 1} de {CALIBRATION_STEPS.length}: {currentStep?.title || ''}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-0.5">{currentStep?.subtitle || ''}</p>
                  <p className="text-[11px] text-blue-300 font-semibold">{currentStep?.angleHint || ''}</p>
                </div>

                {/* EXPANDED & CLEAR CAMERA VIEWPORT */}
                <div className="relative w-full max-w-md h-[340px] sm:h-[390px] mx-auto rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black flex items-center justify-center shrink-0">
                  {isCameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <div className="p-6 text-center text-slate-400 max-w-xs flex flex-col items-center gap-3">
                      {cameraError ? (
                        <>
                          <AlertCircle className="w-10 h-10 text-amber-400" />
                          <p className="text-xs leading-relaxed text-rose-200">{cameraError}</p>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Reativar Câmera
                          </button>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                          <p className="text-xs font-medium">Iniciando câmera para calibração 3D...</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* High-Tech 3D Face ID Overlay Guide */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3">
                      
                      {/* Biometric Oval Mask with Dynamic Target Corners */}
                      <div className="w-60 h-72 sm:w-68 sm:h-80 border-2 border-blue-400/70 rounded-[50%] flex items-center justify-center relative shadow-[0_0_50px_rgba(59,130,246,0.35)] transition-all duration-300">
                        
                        {/* Target Corner Marks */}
                        <div className="absolute -top-3 -left-3 w-7 h-7 border-t-3 border-l-3 border-blue-400 rounded-tl-xl shadow-sm"></div>
                        <div className="absolute -top-3 -right-3 w-7 h-7 border-t-3 border-r-3 border-blue-400 rounded-tr-xl shadow-sm"></div>
                        <div className="absolute -bottom-3 -left-3 w-7 h-7 border-b-3 border-l-3 border-blue-400 rounded-bl-xl shadow-sm"></div>
                        <div className="absolute -bottom-3 -right-3 w-7 h-7 border-b-3 border-r-3 border-blue-400 rounded-br-xl shadow-sm"></div>

                        {/* Top Step Pill Badge */}
                        <div className="absolute -top-4 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg bg-blue-600 text-white border border-blue-300">
                          <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                          <span>{currentStep.title.split('. ')[1]}</span>
                        </div>

                        {/* Center Target Crosshair / Node */}
                        <div className="w-3 h-3 rounded-full bg-blue-400/40 border border-blue-300 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-white"></div>
                        </div>

                        {/* Directional Guidance Arrows */}
                        <div className="absolute inset-0 flex flex-col items-center justify-between p-2">
                          <div className={`p-2 rounded-full transition-all duration-200 ${currentStep.id === 'UP' ? 'bg-blue-500 text-white scale-125 shadow-lg animate-bounce ring-4 ring-blue-400/50' : 'text-slate-500/40'}`}>
                            <ArrowUp className="w-5 h-5" />
                          </div>
                          <div className="w-full flex items-center justify-between px-1">
                            <div className={`p-2 rounded-full transition-all duration-200 ${currentStep.id === 'LEFT' ? 'bg-blue-500 text-white scale-125 shadow-lg animate-pulse ring-4 ring-blue-400/50' : 'text-slate-500/40'}`}>
                              <ArrowLeft className="w-5 h-5" />
                            </div>
                            <div className={`p-2 rounded-full transition-all duration-200 ${currentStep.id === 'RIGHT' ? 'bg-blue-500 text-white scale-125 shadow-lg animate-pulse ring-4 ring-blue-400/50' : 'text-slate-500/40'}`}>
                              <ArrowRight className="w-5 h-5" />
                            </div>
                          </div>
                          <div className={`p-2 rounded-full transition-all duration-200 ${currentStep.id === 'DOWN' ? 'bg-blue-500 text-white scale-125 shadow-lg animate-bounce ring-4 ring-blue-400/50' : 'text-slate-500/40'}`}>
                            <ArrowDown className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      {/* Detected Pose Live Feedback Badge */}
                      <div className="absolute bottom-3 bg-slate-900/90 border border-slate-700 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-200 flex items-center gap-2 shadow-lg">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Detector Facial: <strong>{detectedPoseAngle}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5-Step Angle Progress Pills */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                  {CALIBRATION_STEPS.map((s, idx) => {
                    const isDone = !!photos[idx];
                    const isCurr = idx === currentStepIndex;
                    return (
                      <div
                        key={s.id}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border transition ${
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

                {/* Prominent Action Button for Angle Capture */}
                <div className="pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleManualCaptureStep}
                    disabled={!isCameraActive || isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98] border border-blue-400 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Mapeando Ponto Facial 3D...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-amber-300" /> CAPTURAR ÂNGULO {safeStepIndex + 1}/5 ({currentStep.title.split('. ')[1]})
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Calibration Complete Screen */
              <div className="py-6 text-center space-y-4 animate-in zoom-in-95 my-auto">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">Mapeamento 3D Concluído!</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                    Os 5 ângulos faciais (frontal, lateral esquerdo, lateral direito, superior e inferior) foram registrados com sucesso.
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

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleRestartCalibration}
                    className="py-3.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Recalibrar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndConfirm}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                  >
                    <UserCheck className="w-5 h-5" /> SALVAR FACE ID NO SISTEMA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL GRID VIEW (Photos Gallery & Slot Editor) */}
        {mode === 'MANUAL_GRID' && (
          <div className="flex-1 overflow-y-auto space-y-4 pt-1">
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

                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-800 mb-2 border border-slate-700">
                      {hasPhoto ? (
                        <img src={photos[idx]} alt={step.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <Camera className="w-6 h-6 mb-1" />
                          <span className="text-[9px] font-bold">Vazio</span>
                        </div>
                      )}

                      {hasPhoto && (
                        <div className="absolute top-1 right-1 bg-emerald-600 text-white p-1 rounded-full shadow-md">
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
                        className="flex-1 py-2 px-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] rounded-lg cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" /> Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveManualSlot(idx);
                          fileInputRef.current?.click();
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer border border-slate-700"
                        title="Upload de arquivo"
                      >
                        <Upload className="w-3.5 h-3.5" />
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
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndConfirm}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
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
              const processed = await processProfilePhoto(file, 420, 420, 0.90);
              setPhotos((prev) => {
                const updated = [...prev];
                updated[activeManualSlot] = processed;
                return updated;
              });
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
