import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types';
import { Camera, X, Check, Upload, RefreshCw, Shield, Sparkles, Loader2, UserCheck } from 'lucide-react';
import { processProfilePhoto } from '../utils/imageHelper';

interface FacialRegistrationModalProps {
  employee: Employee;
  onSavePhotos: (employeeId: string, photos: string[]) => void;
  onClose: () => void;
}

export const FacialRegistrationModal: React.FC<FacialRegistrationModalProps> = ({
  employee,
  onSavePhotos,
  onClose,
}) => {
  // Initialize with existing facialPhotos or avatar fallback
  const existing = employee.facialPhotos || [];
  const [photos, setPhotos] = useState<string[]>([
    existing[0] || employee.avatar || '',
    existing[1] || '',
    existing[2] || '',
  ]);

  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start webcam when activeSlot is chosen
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (activeSlot !== null) {
      setIsCameraActive(true);
      setCameraError(null);

      if (navigator?.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'user', width: 640, height: 640 } })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
            }
          })
          .catch((err) => {
            console.warn('Camera access notice:', err);
            setCameraError('Não foi possível acessar a câmera do dispositivo. Utilize o envio por arquivo.');
            setIsCameraActive(false);
          });
      } else {
        setCameraError('Câmera não suportada neste dispositivo. Utilize o envio por arquivo.');
        setIsCameraActive(false);
      }
    } else {
      setIsCameraActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeSlot]);

  // Capture snapshot from webcam
  const handleCaptureSnapshot = async () => {
    if (!videoRef.current || activeSlot === null) return;
    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const processed = await processProfilePhoto(dataUrl);

        const newPhotos = [...photos];
        newPhotos[activeSlot] = processed;
        setPhotos(newPhotos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      setActiveSlot(null);
    }
  };

  // Upload file for active slot
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeSlot === null) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const raw = event.target?.result as string;
        if (raw) {
          const processed = await processProfilePhoto(raw);
          const newPhotos = [...photos];
          newPhotos[activeSlot] = processed;
          setPhotos(newPhotos);
        }
        setIsProcessing(false);
        setActiveSlot(null);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const slotLabels = [
    { title: 'Foto 1 - Vista Frontal', desc: 'Olhando diretamente para a câmera' },
    { title: 'Foto 2 - Leve Perfil Esquerdo', desc: 'Rosto levemente inclinado à esquerda' },
    { title: 'Foto 3 - Leve Perfil Direito', desc: 'Rosto levemente inclinado à direita' },
  ];

  const validPhotosCount = photos.filter((p) => p && p.trim().length > 0).length;

  const handleSave = () => {
    onSavePhotos(employee.id, photos.filter((p) => p && p.trim().length > 0));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm overflow-y-auto p-4 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Cadastro de Fotos Faciais</h3>
                <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Modo Tablet
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Cadastre até 3 fotos do colaborador <strong>{employee.name}</strong> para validação no Tablet da empresa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera View inside modal if slot active */}
        {activeSlot !== null && (
          <div className="mb-6 bg-slate-900 rounded-2xl p-4 text-white text-center">
            <h4 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">
              {slotLabels[activeSlot].title}
            </h4>
            <p className="text-xs text-slate-300 mb-3">{slotLabels[activeSlot].desc}</p>

            <div className="relative w-64 h-64 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-blue-500 shadow-xl mb-4">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-xs">{cameraError || 'Iniciando câmera...'}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                disabled={!isCameraActive || isProcessing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <span>Capturar {slotLabels[activeSlot].title.split(' - ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer border border-slate-700"
              >
                <Upload className="w-4 h-4" />
                <span>Enviar Arquivo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* 3 Photo Slots Display */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {slotLabels.map((slot, index) => {
            const hasPhoto = !!photos[index];
            return (
              <div
                key={index}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center text-center ${
                  hasPhoto
                    ? 'bg-slate-50 border-emerald-300 shadow-xs'
                    : 'bg-slate-50/50 border-dashed border-slate-300'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  {slot.title}
                </span>

                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-200 mb-3 border border-slate-300 shadow-inner group">
                  {hasPhoto ? (
                    <img
                      src={photos[index]}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Camera className="w-6 h-6 mb-1 text-slate-300" />
                      <span className="text-[10px] font-bold">Sem foto</span>
                    </div>
                  )}

                  {hasPhoto && (
                    <div className="absolute top-1 right-1 bg-emerald-600 text-white p-1 rounded-full shadow-md">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 mb-3 min-h-[28px]">{slot.desc}</p>

                <button
                  type="button"
                  onClick={() => setActiveSlot(index)}
                  className={`w-full py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    hasPhoto
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                  }`}
                >
                  {hasPhoto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" /> Recapturar
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" /> Adicionar
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 text-xs mb-6 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Como funciona a confirmação no Tablet da empresa?</p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Quando o funcionário bater o ponto no tablet da empresa, o sistema abrirá a câmera em tempo real, exibirá as fotos cadastradas e fará a confirmação visual no visor: <strong>"É você, {employee.name}?"</strong> antes de registrar o ponto.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-semibold">
            Status: <strong className="text-slate-900">{validPhotosCount}/3 fotos salvas</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Salvar Cadastro Facial
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
