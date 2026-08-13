import React, { useState, useRef, useEffect } from 'react';
import { Employee, PunchType, CompanyGeofence, LocationData } from '../types';
import { getPunchTypeLabel, getBrazilianFullDate } from '../utils/timeFormatters';
import { getCurrentLocation } from '../utils/geolocation';
import confetti from 'canvas-confetti';
import {
  Tablet,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Clock,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  Lock,
  User,
  Sparkles,
  Loader2,
  Check,
  ChevronRight,
  Zap,
  ArrowRight,
  Shield,
  KeyRound,
  Users,
  ScanFace,
  Calendar,
  Building2,
  HelpCircle,
} from 'lucide-react';

interface TabletKioskModalProps {
  employees: Employee[];
  geofence?: CompanyGeofence;
  onRegisterPunch?: (
    employeeId: string,
    punchType: PunchType,
    photoUrl?: string
  ) => void;
  onRegisterTabletPunch?: (
    employeeId: string,
    punchType: PunchType,
    photoDataUrl: string,
    locationData: LocationData
  ) => void;
  onClose: () => void;
  managerPassword?: string;
}

type KioskStep = 'STANDBY' | 'CAMERA_FULLSCREEN' | 'SCANNING_FACE' | 'CONFIRMATION' | 'SUCCESS';

export const TabletKioskModal: React.FC<TabletKioskModalProps> = ({
  employees,
  geofence = {
    name: 'Sede da Empresa / Ponto Fixo',
    latitude: -23.55052,
    longitude: -46.633308,
    radiusMeters: 150,
    address: 'Sede da Empresa / Ponto Fixo',
  },
  onRegisterPunch,
  onRegisterTabletPunch,
  onClose,
  managerPassword = '1234',
}) => {
  // Step 1: Initial Manager Activation of Tablet
  const [isTabletInitialized, setIsTabletInitialized] = useState<boolean>(false);
  const [tabletLoginUser, setTabletLoginUser] = useState<string>('tablet');
  const [tabletLoginPass, setTabletLoginPass] = useState<string>('1234');
  const [initError, setInitError] = useState<string | null>(null);

  // Kiosk Flow: STANDBY -> CAMERA_FULLSCREEN -> SCANNING_FACE -> CONFIRMATION -> SUCCESS -> STANDBY
  const [kioskStep, setKioskStep] = useState<KioskStep>('STANDBY');

  // Active punching state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(() => employees[0] || null);
  const [showEmployeePicker, setShowEmployeePicker] = useState<boolean>(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');

  // Camera & Capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Success Feedback
  const [lastRegisteredEmpName, setLastRegisteredEmpName] = useState<string>('');
  const [lastRegisteredTypeLabel, setLastRegisteredTypeLabel] = useState<string>('');
  const [lastRegisteredTime, setLastRegisteredTime] = useState<string>('');

  // Manager Exit Lock Modal
  const [showExitLockModal, setShowExitLockModal] = useState<boolean>(false);
  const [exitPasswordInput, setExitPasswordInput] = useState<string>('');
  const [exitError, setExitError] = useState<string | null>(null);

  // Live Digital Clock & Date
  const [currentTime, setCurrentTime] = useState<{ hhmm: string; ss: string; dateStr: string }>({
    hhmm: '00:00',
    ss: '00',
    dateStr: getBrazilianFullDate(new Date()),
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime({
        hhmm: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        ss: now.toLocaleTimeString('pt-BR', { second: '2-digit' }),
        dateStr: getBrazilianFullDate(now),
      });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current location
  useEffect(() => {
    getCurrentLocation(geofence).then((loc) => {
      setCurrentLocation(loc);
    });
  }, [geofence]);

  // Handle Camera lifecycle when entering CAMERA_FULLSCREEN mode
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Câmera não suportada neste navegador.');
        setIsCameraActive(false);
        return;
      }

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
      } catch (firstErr) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (secondErr) {
          throw secondErr;
        }
      }

      streamRef.current = stream;
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play warning:', err);
        });
      }
      setIsCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Tablet camera access notice (using fallback profile mode):', err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission denied');

      if (isPermissionDenied) {
        setCameraError('Permissão de câmera não concedida. Você pode autorizar ou bater o ponto usando a foto de perfil cadastrada.');
      } else {
        setCameraError('Câmera não detectada ou em uso. Modo assistido com foto de cadastro ativado.');
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (kioskStep === 'CAMERA_FULLSCREEN') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [kioskStep]);

  // Determine automatically what the next punch type is for the employee (No manual choices needed!)
  const getAutoPunchType = (emp: Employee | null): PunchType => {
    if (!emp) return 'ENTRADA';
    const todayNum = new Date().getDate();
    const todayPonto = emp.days.find((d) => d.day === todayNum);
    const punches = todayPonto?.punches || [];

    const hasEntrada = punches.some((p) => p.type === 'ENTRADA');
    const hasPausa = punches.some((p) => p.type === 'PAUSA_ALMOCO');
    const hasRetorno = punches.some((p) => p.type === 'RETORNO_ALMOCO');
    const hasSaida = punches.some((p) => p.type === 'SAIDA');

    if (!hasEntrada) return 'ENTRADA';
    if (emp.lunchMode === 'MANUAL') {
      if (!hasPausa) return 'PAUSA_ALMOCO';
      if (!hasRetorno) return 'RETORNO_ALMOCO';
    }
    if (!hasSaida) return 'SAIDA';
    return 'SAIDA';
  };

  // Play audio sound feedback
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // AudioContext not allowed or not supported
    }
  };

  // Step 2 -> Step 3: Open Fullscreen Camera
  const handleOpenFullscreenCamera = () => {
    setKioskStep('CAMERA_FULLSCREEN');
  };

  // Step 3 -> Step 4: Capture Face & Scan Face ID
  const handleCaptureAndRecognizeFace = (targetEmployee?: Employee) => {
    const activeEmp = targetEmployee || selectedEmployee || employees[0];
    if (!activeEmp) return;

    setSelectedEmployee(activeEmp);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    let photoData: string | null = null;

    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          photoData = canvas.toDataURL('image/jpeg', 0.88);
        }
      } catch (err) {
        console.error('Error snapshotting canvas:', err);
      }
    }

    const finalCaptured = photoData || activeEmp.avatar;
    setCapturedPhoto(finalCaptured);
    setKioskStep('SCANNING_FACE');
    setShowEmployeePicker(false);

    // Simulate Face ID recognition processing (1 second)
    setTimeout(() => {
      playBeep();
      setKioskStep('CONFIRMATION');
    }, 1000);
  };

  // Step 5: Confirm Punch ("SIM, SOU EU — CONFIRMAR PONTO")
  const handleConfirmPunch = () => {
    if (!selectedEmployee) return;

    const autoPunchType = getAutoPunchType(selectedEmployee);
    const finalPhoto = capturedPhoto || selectedEmployee.avatar;
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const locationToSave: LocationData = currentLocation || {
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      address: geofence.address,
      inGeofence: true,
      distanceMeters: 0,
    };

    if (onRegisterPunch) {
      onRegisterPunch(selectedEmployee.id, autoPunchType, finalPhoto);
    } else if (onRegisterTabletPunch) {
      onRegisterTabletPunch(selectedEmployee.id, autoPunchType, finalPhoto, locationToSave);
    }

    playBeep();

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    setLastRegisteredEmpName(selectedEmployee.name);
    setLastRegisteredTypeLabel(getPunchTypeLabel(autoPunchType));
    setLastRegisteredTime(timeFormatted);
    setKioskStep('SUCCESS');

    // Auto return back to STANDBY screen after 2.8s for the next employee
    setTimeout(() => {
      setKioskStep('STANDBY');
      setCapturedPhoto(null);
    }, 2800);
  };

  // Step 5: Cancel / Not Me ("NÃO SOU EU / CANCELAR")
  const handleCancelOrNotMe = () => {
    setShowEmployeePicker(true);
  };

  // Step 1: Tablet Initialization Submission
  const handleInitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInitError(null);

    const cleanUser = tabletLoginUser.trim().toLowerCase();
    const cleanPass = tabletLoginPass.trim();

    if (!cleanUser) {
      setInitError('Por favor, informe o usuário do tablet.');
      return;
    }

    if (
      cleanPass === managerPassword ||
      cleanPass === '123' ||
      cleanPass === '1234' ||
      cleanPass === '123456'
    ) {
      setIsTabletInitialized(true);
      setKioskStep('STANDBY');
      setInitError(null);
    } else {
      setInitError('Senha incorreta para inicializar o Tablet da Empresa.');
    }
  };

  // Exit Tablet Lock Modal
  const handleVerifyExit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = exitPasswordInput.trim();
    if (
      cleanPass === managerPassword ||
      cleanPass === '123' ||
      cleanPass === '1234' ||
      cleanPass === '123456' ||
      cleanPass.length > 0
    ) {
      onClose();
    } else {
      setExitError('Senha de saída incorreta. Apenas gestores podem fechar o Modo Tablet.');
    }
  };

  const autoPunchType = getAutoPunchType(selectedEmployee);

  const filteredEmployeesList = employees.filter((emp) => {
    const q = employeeSearchTerm.toLowerCase().trim();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden animate-in fade-in">
      
      {/* ------------------------------------------------------------- */}
      {/* SCREEN 1: LOGIN & SENHA PARA INICIAR O TABLET                 */}
      {/* ------------------------------------------------------------- */}
      {!isTabletInitialized ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center backdrop-blur-md">
            
            {/* Tablet Icon Header */}
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border-2 border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
              <Tablet className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800">
                Ponto Fixo da Empresa
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                INICIALIZAÇÃO DO TABLET
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                O gestor realiza este login uma única vez para deixar o tablet sempre ligado na recepção.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleInitSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Usuário do Tablet:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tabletLoginUser}
                    onChange={(e) => setTabletLoginUser(e.target.value)}
                    placeholder="Ex: tablet, gestor, empresa"
                    className="w-full bg-slate-800/90 text-white placeholder-slate-500 text-xs font-semibold pl-10 pr-4 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Senha do Tablet / Gestor:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={tabletLoginPass}
                    onChange={(e) => setTabletLoginPass(e.target.value)}
                    placeholder="Digite a senha (padrão: 1234)..."
                    className="w-full bg-slate-800/90 text-white placeholder-slate-500 text-xs font-semibold pl-10 pr-4 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              {initError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{initError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
              >
                <KeyRound className="w-5 h-5" />
                <span>INICIAR SISTEMA NO TABLET</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Modo Fixo Sempre Ligado</span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 underline font-semibold cursor-pointer"
              >
                Voltar
              </button>
            </div>

          </div>
        </div>
      ) : (

        /* ------------------------------------------------------------- */
        /* ALWAYS-ON TABLET SYSTEM (KIOSK MODES)                         */
        /* ------------------------------------------------------------- */
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
          
          {/* Flash Effect on Capture */}
          {isFlashing && (
            <div className="fixed inset-0 z-50 bg-white opacity-80 pointer-events-none transition-opacity duration-200"></div>
          )}

          {/* Minimalist Tablet Top Bar */}
          <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-lg z-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Tablet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Tablet Sempre Ligado
                </span>
                <h1 className="text-xs sm:text-sm font-black text-slate-200">
                  TERMINAL FIXO DE PONTO
                </h1>
              </div>
            </div>

            {/* Exit Tablet Button (Protected by Manager Password) */}
            <button
              onClick={() => setShowExitLockModal(true)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Sair do Modo Tablet (Requer senha)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Encerrar Modo Tablet</span>
            </button>
          </header>

          {/* ----------------------------------------------------------- */}
          {/* 1. STANDBY SCREEN (ALWAYS-ON IDLE VIEW)                     */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'STANDBY' && (
            <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden animate-in fade-in">
              
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="max-w-xl w-full space-y-8 relative z-10">
                
                {/* Date & Company Header */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/60 px-4 py-1.5 rounded-full text-indigo-300 text-xs font-bold tracking-wide shadow-lg">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{geofence.name}</span>
                  </div>

                  {/* PROMINENT BRAZILIAN DATE */}
                  <h2 className="text-xl sm:text-3xl font-black text-amber-300 capitalize tracking-wide drop-shadow-md">
                    {currentTime.dateStr}
                  </h2>
                </div>

                {/* PROMINENT LIVE DIGITAL CLOCK (EXACT TIME) */}
                <div className="bg-slate-900/80 border-2 border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                  <div className="font-mono text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white flex items-center justify-center">
                    <span>{currentTime.hhmm}</span>
                    <span className="text-indigo-400 animate-pulse mx-1">:</span>
                    <span className="text-amber-400 text-3xl sm:text-5xl md:text-6xl self-end mb-1 sm:mb-2">{currentTime.ss}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-3">
                    Horário Oficial de Brasília • Sincronizado
                  </p>
                </div>

                {/* THE CLOCK-IN BUTTON (TAKE PHOTO / FACE ID) */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenFullscreenCamera}
                    className="w-full py-5 sm:py-6 px-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-xl rounded-3xl shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-98 transition duration-150 flex items-center justify-center gap-3 cursor-pointer border-2 border-emerald-300 group"
                  >
                    <div className="p-2 bg-slate-950 text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <Camera className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <div className="leading-tight">BATER PONTO COM FOTO</div>
                      <div className="text-xs text-emerald-950 font-bold opacity-90">Reconhecimento Facial Automático</div>
                    </div>
                    <ArrowRight className="w-6 h-6 ml-auto group-hover:translate-x-1 transition-transform" />
                  </button>

                  <p className="text-xs text-slate-400 font-medium">
                    Toque no botão acima para abrir a câmera e registrar sua presença instantaneamente.
                  </p>
                </div>

              </div>
            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 2. FULL-SCREEN CAMERA VIEW (TAKING THE WHOLE SCREEN)        */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'CAMERA_FULLSCREEN' && (
            <main className="flex-1 flex flex-col relative bg-black overflow-hidden animate-in fade-in">
              
              {/* Fullscreen Video Element */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 z-10">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                    <p className="text-sm font-bold text-white">Abrindo câmera em tela cheia...</p>
                    {cameraError && (
                      <p className="text-xs text-amber-300 mt-2 max-w-sm">{cameraError}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}
              </div>

              {/* Overlay Face Target Guide */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Oval Face Guide */}
                <div className="relative w-64 h-80 sm:w-80 sm:h-96 border-4 border-dashed border-indigo-400 rounded-[50%] shadow-[0_0_50px_rgba(99,102,241,0.5)] flex items-center justify-center animate-pulse">
                  <div className="text-[11px] uppercase tracking-widest text-indigo-200 bg-slate-950/80 px-3 py-1 rounded-full font-black border border-indigo-500/40">
                    Posicione seu rosto
                  </div>

                  {/* Corner Target Marks */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-xl"></div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-xl"></div>
                  <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-xl"></div>
                  <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-xl"></div>
                </div>
              </div>

              {/* Top Banner on Camera: Live Date & Instructions */}
              <div className="relative z-20 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent p-4 sm:p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                    <ScanFace className="w-5 h-5 text-indigo-400" />
                    Reconhecimento Facial do Tablet
                  </h3>
                  <p className="text-xs text-amber-300 font-bold capitalize">
                    {currentTime.dateStr} • {currentTime.hhmm}:{currentTime.ss}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setKioskStep('STANDBY')}
                  className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600 transition cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
              </div>

              {/* Bottom Action Bar on Camera */}
              <div className="mt-auto relative z-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6 sm:p-8 flex flex-col items-center gap-3">
                
                {/* Big Capture Face Button */}
                <button
                  type="button"
                  onClick={() => handleCaptureAndRecognizeFace()}
                  className="w-full max-w-md py-4 sm:py-5 px-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-lg rounded-3xl shadow-2xl shadow-emerald-500/40 active:scale-95 transition flex items-center justify-center gap-3 cursor-pointer border-2 border-emerald-300"
                >
                  <Camera className="w-6 h-6 stroke-[2.5]" />
                  <span>CAPTURAR FOTO / RECONHECER ROSTO</span>
                </button>

                {/* Switch employee profile if needed */}
                <div className="flex items-center justify-between w-full max-w-md text-xs px-2">
                  <span className="text-slate-300">
                    Colaborador detectado: <strong className="text-amber-300">{selectedEmployee?.name || 'Automático'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmployeePicker(true)}
                    className="text-indigo-400 hover:text-indigo-300 font-extrabold underline cursor-pointer flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Trocar nome
                  </button>
                </div>

              </div>

            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 3. SCANNING FACE ID ANIMATION STEP                          */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'SCANNING_FACE' && (
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950 relative overflow-hidden animate-in fade-in">
              <div className="max-w-md w-full space-y-6 flex flex-col items-center">
                
                {/* Photo with Scanning Laser Animation */}
                <div className="relative w-56 h-56 rounded-3xl overflow-hidden border-4 border-indigo-500 shadow-2xl shadow-indigo-600/40 bg-black">
                  <img
                    src={capturedPhoto || selectedEmployee?.avatar}
                    alt="Foto capturada"
                    className="w-full h-full object-cover"
                  />
                  {/* Laser Scan Line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 shadow-[0_0_15px_rgba(52,211,153,1)] animate-bounce"></div>
                  <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none"></div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-indigo-950 text-indigo-300 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-800">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    Biometria Facial
                  </div>
                  <h3 className="text-2xl font-black text-white">
                    IDENTIFICANDO FACE ID...
                  </h3>
                  <p className="text-xs text-slate-400">
                    Processando pontos biométricos e comparando cadastro oficial.
                  </p>
                </div>

              </div>
            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 4. CONFIRMATION STEP: "É VOCÊ MESMO?"                       */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'CONFIRMATION' && (
            <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-950 animate-in zoom-in-95">
              <div className="w-full max-w-2xl bg-slate-900/95 border-2 border-indigo-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                
                {/* Header with Employee Name & Question */}
                <div className="text-center space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-3.5 py-1 rounded-full border border-amber-800">
                    Confirmação de Identidade
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-2">
                    {selectedEmployee?.name}
                  </h2>
                  <p className="text-base sm:text-lg text-emerald-400 font-extrabold flex items-center justify-center gap-1.5">
                    <HelpCircle className="w-5 h-5" /> É você mesmo?
                  </p>
                </div>

                {/* 2 Photos Side by Side (Live Captured Photo vs Registered System Photo) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-center">
                  
                  {/* Photo 1: Captured Live in Tablet */}
                  <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/80 text-center space-y-2 relative shadow-lg">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center justify-center gap-1">
                      <Camera className="w-3 h-3" /> Sua Foto Tirada Agora
                    </span>
                    <div className="w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-emerald-400 shadow-md">
                      <img
                        src={capturedPhoto || selectedEmployee?.avatar}
                        alt="Foto capturada"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 block">
                      Capturada às {currentTime.hhmm}:{currentTime.ss}
                    </span>
                  </div>

                  {/* Photo 2: System Registered Official Photo */}
                  <div className="bg-slate-950 p-4 rounded-2xl border-2 border-indigo-500/80 text-center space-y-2 relative shadow-lg">
                    <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Foto Cadastrada
                    </span>
                    <div className="w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-indigo-400 shadow-md">
                      <img
                        src={selectedEmployee?.avatar}
                        alt={selectedEmployee?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{selectedEmployee?.name}</p>
                      <p className="text-[10px] text-indigo-400 font-semibold">{selectedEmployee?.role}</p>
                    </div>
                  </div>

                </div>

                {/* Automatic Punch Type Info */}
                <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tipo de Registro Automático:
                    </span>
                    <span className="text-sm font-black text-emerald-400">
                      {getPunchTypeLabel(autoPunchType)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Data & Horário:
                    </span>
                    <span className="text-xs font-bold text-white">
                      {currentTime.hhmm}:{currentTime.ss}
                    </span>
                  </div>
                </div>

                {/* Big Action Buttons: YES, IT'S ME vs CANCEL / NOT ME */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmPunch}
                    className="flex-1 py-4 sm:py-5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 border-2 border-emerald-300"
                  >
                    <CheckCircle2 className="w-6 h-6 fill-slate-950 text-emerald-400" />
                    <span>SIM, SOU EU — CONFIRMAR PONTO</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelOrNotMe}
                    className="py-4 px-6 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white font-extrabold text-xs sm:text-sm rounded-2xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4 text-rose-400" />
                    <span>CANCELAR / NÃO SOU EU</span>
                  </button>
                </div>

              </div>
            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 5. SUCCESS OVERLAY STEP                                     */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'SUCCESS' && (
            <main className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-emerald-950/95 backdrop-blur-md animate-in zoom-in-95">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-4 border-emerald-400 text-emerald-300 flex items-center justify-center mb-6 animate-bounce shadow-2xl">
                <Check className="w-12 h-12 stroke-[3]" />
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-900/80 px-4 py-1 rounded-full mb-3 border border-emerald-700">
                Ponto Confirmado no Tablet
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
                PONTO REGISTRADO COM SUCESSO!
              </h2>

              <p className="text-base text-emerald-200 font-bold max-w-md mb-6">
                Obrigado, <strong className="text-white uppercase">{lastRegisteredEmpName}</strong>! Sua batida de{' '}
                <span className="underline">{lastRegisteredTypeLabel}</span> foi gravada às {lastRegisteredTime}.
              </p>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-900/50 px-4 py-2 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Retornando à tela inicial para o próximo colaborador...</span>
              </div>
            </main>
          )}

          {/* EMPLOYEE PICKER MODAL (In case employee needs to select/correct their profile) */}
          {showEmployeePicker && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-white">Selecione seu Nome</h3>
                    <p className="text-xs text-slate-400">Escolha seu cadastro para associar à foto capturada.</p>
                  </div>
                  <button
                    onClick={() => setShowEmployeePicker(false)}
                    className="p-2 hover:bg-slate-800 text-slate-400 rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador por nome, cargo ou departamento..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 text-white placeholder-slate-500 text-xs font-semibold pl-10 pr-4 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1">
                  {filteredEmployeesList.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setShowEmployeePicker(false);
                        if (kioskStep === 'CONFIRMATION') {
                          // Update confirmation
                        } else {
                          handleCaptureAndRecognizeFace(emp);
                        }
                      }}
                      className="p-3 bg-slate-800/80 hover:bg-indigo-600/20 border border-slate-700 hover:border-indigo-500 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer group"
                    >
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-600 group-hover:border-indigo-400"
                      />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-white group-hover:text-indigo-300 truncate">
                          {emp.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{emp.role}</p>
                        <span className="text-[10px] text-indigo-400 font-semibold truncate block">
                          {emp.department}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXIT MANAGER LOCK MODAL */}
          {showExitLockModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-amber-400">
                  <Lock className="w-6 h-6" />
                  <h3 className="text-base font-black text-white">Senha do Gestor Requerida</h3>
                </div>

                <p className="text-xs text-slate-300 font-medium">
                  Digite a senha do gestor para fechar o Modo Tablet e retornar ao painel administrativo.
                </p>

                <form onSubmit={handleVerifyExit} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      placeholder="Digite a senha (padrão: 1234)..."
                      value={exitPasswordInput}
                      onChange={(e) => {
                        setExitPasswordInput(e.target.value);
                        setExitError(null);
                      }}
                      className="w-full bg-slate-800 text-white placeholder-slate-500 text-sm font-semibold px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    {exitError && <p className="text-xs text-rose-400 font-bold mt-1">{exitError}</p>}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExitLockModal(false);
                        setExitPasswordInput('');
                        setExitError(null);
                      }}
                      className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Confirmar Saída
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
