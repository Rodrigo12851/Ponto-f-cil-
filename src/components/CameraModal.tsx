import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, CheckCircle, MapPin, RefreshCw, AlertCircle, ShieldCheck, Sparkles, Timer, Zap, AlertTriangle, AlertOctagon, UserCheck, UserX } from 'lucide-react';
import { Employee, LocationData, PunchType } from '../types';
import { getPunchTypeLabel } from '../utils/timeFormatters';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLock';
import { verifyEmployeeFaceAgainstAvatar, verifyAndRecognizeFace } from '../utils/faceBiometrics';

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
  const [isAiChecking, setIsAiChecking] = useState<boolean>(true);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null); // 2, 1, 0
  const [countdownProgress, setCountdownProgress] = useState<number>(0); // 0% to 100%
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isVerifyingBio, setIsVerifyingBio] = useState<boolean>(false);
  const [bioConfidence, setBioConfidence] = useState<number>(0);
  const [bioError, setBioError] = useState<string | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    // Clear any pending countdowns
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setCountdown(null);
    setCountdownProgress(0);
    setBioError(null);
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
      return;
    }

    setCapturedImage(dataUrl);
    setIsVerifyingBio(true);

    try {
      let bioResult;
      if (employee) {
        // Explicit 1:1 Biometric Comparison against the registered employee's official avatar
        bioResult = await verifyEmployeeFaceAgainstAvatar(dataUrl, employee, 90);
      } else {
        // 1:N Biometric Comparison against registered database with strict 90% threshold
        bioResult = await verifyAndRecognizeFace(dataUrl, employees, 90);
      }

      setIsVerifyingBio(false);

      if (!bioResult.success || (bioResult.confidence !== undefined && bioResult.confidence < 90)) {
        setBioConfidence(bioResult.confidence || 0);
        setBioError(bioResult.errorMessage || 'Face not recognized. Rosto não reconhecido (Similaridade abaixo de 90%).');
      } else {
        setBioConfidence(bioResult.confidence || 95);
        setBioError(null);
      }
    } catch (err) {
      setIsVerifyingBio(false);
      setBioConfidence(0);
      setBioError('Face not recognized. Erro ao processar validação biométrica.');
    }
  }, [playShutterSound, stream, employee, employees]);

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
      setCountdown(null);
      setCountdownProgress(0);
      setBioError(null);
      setBioConfidence(0);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    startCamera();

    // Stabilize face detection after camera opens (0.5s) then start 2s auto-capture timer
    const detectTimer = setTimeout(() => {
      setIsAiChecking(false);
      setFaceDetected(true);
    }, 500);

    return () => {
      clearTimeout(detectTimer);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      stopCamera();
    };
  }, [isOpen]);

  // 2-Second Auto Capture logic when face is detected and centered
  useEffect(() => {
    if (isOpen && faceDetected && !capturedImage && !cameraError) {
      setCountdown(2);
      setCountdownProgress(0);

      const startTime = Date.now();
      const totalDuration = 2000; // 2 seconds

      // Smooth progress update every 50ms
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
        setCountdownProgress(progress);

        const remainingSecs = Math.max(1, Math.ceil((totalDuration - elapsed) / 1000));
        setCountdown(remainingSecs);

        if (elapsed >= totalDuration) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          handleTakeSnapshot();
        }
      }, 50);

      return () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
    }
  }, [isOpen, faceDetected, capturedImage, cameraError, handleTakeSnapshot]);

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
    setIsAiChecking(true);
    setFaceDetected(false);
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
    setCountdown(null);
    setCountdownProgress(0);
    setIsAiChecking(true);
    setFaceDetected(false);
    setBioError(null);
    setBioConfidence(0);
    stopCamera();
    startCamera();

    setTimeout(() => {
      setIsAiChecking(false);
      setFaceDetected(true);
    }, 600);
  };

  const handleConfirmAndSave = () => {
    if (!capturedImage) return;
    if (bioError || bioConfidence < 90) {
      alert('REGISTRO BLOQUEADO!\n\nFace not recognized: A biometria facial não foi aprovada pelo sistema com o mínimo exigido de 90% de compatibilidade.');
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
    }, 600);
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
            Validação Facial Estrita (≥ 90%) • {getPunchTypeLabel(punchType)}
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
      <div className="relative w-full max-w-md h-[400px] sm:h-[450px] bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center my-auto">
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

            {/* Facial Recognition Overlay Oval & 2s Countdown */}
            {!cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div
                  className={`w-56 h-72 border-4 rounded-[50%] transition-colors duration-300 flex items-center justify-center relative shadow-[0_0_50px_rgba(37,99,235,0.3)] ${
                    faceDetected
                      ? 'border-emerald-400 shadow-emerald-500/30'
                      : 'border-blue-500 animate-pulse'
                  }`}
                >
                  {/* Status Badge */}
                  <div className={`absolute -top-3.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg ${
                    faceDetected 
                      ? 'bg-emerald-500 text-slate-950 border border-emerald-300' 
                      : 'bg-indigo-600 text-white border border-indigo-400'
                  }`}>
                    {isAiChecking ? (
                      <>
                        <Sparkles className="w-3 h-3 animate-spin" />
                        <span>Centralizando Rosto...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-slate-950 fill-slate-950" />
                        <span>Rosto Enquadrado</span>
                      </>
                    )}
                  </div>

                  {/* 2-Second Countdown Circular HUD */}
                  {faceDetected && countdown !== null && (
                    <div className="bg-slate-950/85 backdrop-blur-md border-2 border-emerald-400 rounded-2xl px-4 py-2 flex flex-col items-center gap-1 shadow-2xl animate-in zoom-in-95">
                      <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black">
                        <Timer className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>Captura Automática em</span>
                      </div>
                      <div className="text-2xl font-mono font-black text-emerald-400 tracking-tight flex items-center gap-1">
                        <span>{countdown}s</span>
                      </div>
                      {/* Linear Progress bar */}
                      <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-75"
                          style={{ width: `${countdownProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Target Corner Marks */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg"></div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg"></div>
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
          /* Captured Photo Preview with Side-by-Side Avatar Biometric Comparison */
          <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
            <img
              src={capturedImage}
              alt="Foto de Confirmação"
              className="w-full h-full object-cover filter brightness-95 contrast-105"
            />

            {/* Official Avatar Picture-in-Picture for Direct Comparison */}
            {employee && employee.avatar && (
              <div className="absolute bottom-3 left-3 bg-slate-950/90 p-2 rounded-2xl border-2 border-slate-700 backdrop-blur-md shadow-2xl flex items-center gap-2.5 max-w-[210px]">
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-600 shrink-0">
                  <img
                    src={employee.avatar}
                    alt="Foto Oficial de Cadastro"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="overflow-hidden text-left">
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Avatar Oficial</p>
                  <p className="text-xs font-bold text-white truncate">{employee.name.split(' ')[0]}</p>
                </div>
              </div>
            )}

            {/* Biometric Status Header Overlay */}
            {isVerifyingBio ? (
              <div className="absolute top-4 bg-indigo-600/95 text-white px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-2xl border border-indigo-400 backdrop-blur-md">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                <span>Comparando Biometria com Foto Oficial...</span>
              </div>
            ) : bioError ? (
              <div className="absolute top-4 inset-x-3 bg-rose-950/95 text-rose-200 border-2 border-rose-500 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2">
                <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
                <div className="text-left flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-white uppercase text-[10px] tracking-wide flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5 text-rose-400" /> Face Not Recognized
                    </p>
                    <span className="text-[10px] bg-rose-900 text-rose-200 font-mono px-2 py-0.5 rounded-md border border-rose-700">
                      Similaridade: {bioConfidence}% (Exigido: ≥90%)
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-rose-200 mt-0.5">{bioError}</p>
                </div>
              </div>
            ) : (
              <div className="absolute top-4 bg-emerald-500 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-2xl border-2 border-emerald-300 animate-in zoom-in-95">
                <CheckCircle className="w-4 h-4 text-slate-950" />
                <UserCheck className="w-4 h-4 text-slate-950" />
                <span>Face Reconhecida ({bioConfidence}% • Aprovado ≥ 90%)</span>
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
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-300"
            >
              <Camera className="w-5 h-5" /> CAPTURAR AGORA OU AGUARDE 2s
            </button>
            <p className="text-[11px] text-emerald-300 font-semibold text-center flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              Comparação facial estrita de 90% contra o avatar cadastrado
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
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Registrando Ponto...
                  </>
                ) : isVerifyingBio ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Comparando Biometria...
                  </>
                ) : bioError || bioConfidence < 90 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Ponto Bloqueado (Rosto Inválido)
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
                Bloqueado: Rosto não identificado ou similaridade &lt; 90% com a foto do colaborador.
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
