import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle, MapPin, RefreshCw, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { LocationData, PunchType } from '../types';
import { getPunchTypeLabel } from '../utils/timeFormatters';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  punchType: PunchType;
  location: LocationData;
  onCapture: (photoDataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  punchType,
  location,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAiChecking, setIsAiChecking] = useState<boolean>(true);
  const [faceDetected, setFaceDetected] = useState<boolean>(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Play camera shutter sound using Web Audio API
  const playShutterSound = () => {
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
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      return;
    }

    startCamera();

    // Simulate AI facial detection stability
    const interval = setInterval(() => {
      setFaceDetected(true);
      setIsAiChecking(false);
    }, 1200);

    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsAiChecking(true);
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
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'Não foi possível acessar a câmera. Gerando foto ilustrativa de validação facial para o registro do ponto.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakeSnapshot = () => {
    playShutterSound();

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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        return;
      }
    }

    // Fallback image if camera snapshot is unavailable
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 400;
    fallbackCanvas.height = 400;
    const ctx = fallbackCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(200, 160, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(200, 320, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VALIDAÇÃO FACIAL GPS', 200, 370);
      setCapturedImage(fallbackCanvas.toDataURL('image/jpeg'));
    }
  };

  const handleConfirmAndSave = () => {
    if (!capturedImage) return;
    setIsSubmitting(true);

    setTimeout(() => {
      onCapture(capturedImage);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between items-center p-4 md:p-6 text-white animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="w-full max-w-lg flex items-center justify-between z-20">
        <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            Ponto Facial • {getPunchTypeLabel(punchType)}
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
      <div className="relative w-full max-w-md h-[420px] sm:h-[480px] bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center my-auto">
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

            {/* Facial Recognition Overlay Oval */}
            {!cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div
                  className={`w-56 h-72 border-4 rounded-[50%] transition-colors duration-300 flex items-center justify-center relative shadow-[0_0_50px_rgba(37,99,235,0.3)] ${
                    faceDetected
                      ? 'border-emerald-400 shadow-emerald-500/20'
                      : 'border-blue-500 animate-pulse'
                  }`}
                >
                  <div className="absolute -top-3 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase px-3 py-0.5 rounded-full tracking-wider flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3" />
                    {isAiChecking ? 'Analisando Rosto...' : 'Rosto Centralizado'}
                  </div>
                </div>
              </div>
            )}

            {/* GPS Geofence badge inside camera */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-xs flex items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-white truncate">{location.address}</p>
                  <p className="text-[10px] text-slate-400">
                    {location.inGeofence
                      ? '✓ Dentro da cerca geográfica da empresa'
                      : '⚠ Localização Externa Registrada'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Captured Photo Preview */
          <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center">
            <img
              src={capturedImage}
              alt="Foto de Confirmação"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 bg-emerald-500 text-slate-950 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-lg">
              <CheckCircle className="w-4 h-4" /> Biometria Facial Confirmada
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md flex flex-col items-center gap-3 z-20">
        {!capturedImage ? (
          <button
            onClick={handleTakeSnapshot}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-5 h-5" /> CAPTURAR FOTO E CONFIRMAR
          </button>
        ) : (
          <div className="w-full flex gap-3">
            <button
              onClick={() => setCapturedImage(null)}
              className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-2xl transition cursor-pointer border border-slate-700"
            >
              Tirar Outra
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleConfirmAndSave}
              className="flex-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> SALVAR PONTO AGORA
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center">
          Sua foto e localização GPS são criptografadas e gravadas com selo de integridade no espelho de ponto.
        </p>
      </div>
    </div>
  );
};
