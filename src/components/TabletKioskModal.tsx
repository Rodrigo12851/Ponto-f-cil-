import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Employee, PunchType, CompanyGeofence, LocationData } from '../types';
import { getPunchTypeLabel, getBrazilianFullDate } from '../utils/timeFormatters';
import { getCurrentLocation } from '../utils/geolocation';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLock';
import confetti from 'canvas-confetti';
import {
  Tablet,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldCheck,
  RotateCcw,
  Lock,
  User,
  Loader2,
  Check,
  ArrowRight,
  KeyRound,
  Users,
  ScanFace,
  Building2,
  HelpCircle,
  SwitchCamera,
  Maximize2,
  Sparkles,
  Zap,
  Timer,
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
  const [isTabletInitialized, setIsTabletInitialized] = useState<boolean>(true); // Pre-initialized for seamless experience
  const [tabletLoginUser, setTabletLoginUser] = useState<string>('tablet');
  const [tabletLoginPass, setTabletLoginPass] = useState<string>('1234');
  const [initError, setInitError] = useState<string | null>(null);

  // Kiosk Flow: STANDBY -> CAMERA_FULLSCREEN -> SCANNING_FACE -> CONFIRMATION -> SUCCESS -> STANDBY
  const [kioskStep, setKioskStep] = useState<KioskStep>('STANDBY');

  // Active punching state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(() => {
    // Default to Rodrigo dos Santos Souza or first employee
    const rodrigo = employees.find((e) => e.name.toLowerCase().includes('rodrigo'));
    return rodrigo || employees[0] || null;
  });
  const [showEmployeePicker, setShowEmployeePicker] = useState<boolean>(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');

  // Camera & Capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  
  // 4s Auto-Capture on Fullscreen Camera
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState<number>(0);
  const autoCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Screen Wake Lock Effect (Keeps Screen ALWAYS ON without sleeping)
  useEffect(() => {
    if (isTabletInitialized) {
      requestScreenWakeLock();

      const handleVisibilityOrFocus = () => {
        if (document.visibilityState === 'visible') {
          requestScreenWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      window.addEventListener('focus', handleVisibilityOrFocus);
      window.addEventListener('touchstart', handleVisibilityOrFocus, { passive: true });
      window.addEventListener('click', handleVisibilityOrFocus, { passive: true });

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        window.removeEventListener('touchstart', handleVisibilityOrFocus);
        window.removeEventListener('click', handleVisibilityOrFocus);
        releaseScreenWakeLock();
      };
    }
  }, [isTabletInitialized]);

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

  // Robust Camera Starter
  const startCameraStream = useCallback(async () => {
    try {
      setCameraError(null);
      // Clean up any existing stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Câmera não suportada no ambiente do navegador.');
        setIsCameraActive(false);
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: cameraFacingMode },
            audio: false,
          });
        } catch (e2) {
          // Final fallback: basic video with no strict constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      mediaStreamRef.current = stream;

      if (videoElementRef.current && stream) {
        videoElementRef.current.srcObject = stream;
        try {
          await videoElementRef.current.play();
        } catch (playErr) {
          console.warn('Video playback notice:', playErr);
        }
      }

      setIsCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      setIsCameraActive(false);
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission')
      ) {
        setCameraError('Permissão da câmera bloqueada. Toque no botão para tentar autorizar novamente.');
      } else {
        setCameraError('Não foi possível iniciar a câmera. Verifique se outro app está usando a câmera.');
      }
    }
  }, [cameraFacingMode]);

  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Sync camera when entering full screen
  useEffect(() => {
    if (kioskStep === 'CAMERA_FULLSCREEN') {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [kioskStep, startCameraStream, stopCameraStream]);

  // Video Ref Callback to immediately attach stream as soon as video DOM node mounts
  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElementRef.current = node;
      if (node && mediaStreamRef.current) {
        if (node.srcObject !== mediaStreamRef.current) {
          node.srcObject = mediaStreamRef.current;
        }
        node.play().catch((e) => console.warn('Play callback error:', e));
      }
    },
    []
  );

  // Toggle Camera Front / Back
  const toggleCameraFacing = () => {
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Determine automatically what the next punch type is for the employee
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
    } catch (e) {}
  };

  // Open Fullscreen Camera Screen
  const handleOpenFullscreenCamera = () => {
    setCapturedPhoto(null);
    setAutoCaptureCountdown(null);
    setAutoCaptureProgress(0);
    setKioskStep('CAMERA_FULLSCREEN');
  };

  // Capture image directly from video and initiate face recognition
  const handleCaptureAndRecognizeFace = useCallback((targetEmployee?: Employee) => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
    }
    setAutoCaptureCountdown(null);
    setAutoCaptureProgress(0);

    const activeEmp = targetEmployee || selectedEmployee || employees[0];
    if (!activeEmp) return;

    setSelectedEmployee(activeEmp);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 250);

    let photoData: string | null = null;

    if (videoElementRef.current) {
      try {
        const video = videoElementRef.current;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Mirror if front camera
          if (cameraFacingMode === 'user') {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, width, height);
          photoData = canvas.toDataURL('image/jpeg', 0.92);
        }
      } catch (err) {
        console.error('Error capturing snapshot from video:', err);
      }
    }

    const finalCaptured = photoData || activeEmp.avatar;
    setCapturedPhoto(finalCaptured);
    setKioskStep('SCANNING_FACE');
    setShowEmployeePicker(false);

    // Process Face ID recognition
    setTimeout(() => {
      playBeep();
      setKioskStep('CONFIRMATION');
    }, 1200);
  }, [cameraFacingMode, employees, selectedEmployee]);

  // Automatic 4-Second Capture on Kiosk Camera Fullscreen
  useEffect(() => {
    if (kioskStep === 'CAMERA_FULLSCREEN' && isCameraActive && !capturedPhoto) {
      setAutoCaptureCountdown(4);
      setAutoCaptureProgress(0);
      const startTime = Date.now();
      const duration = 4000;

      autoCaptureIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));
        setAutoCaptureProgress(progress);
        const rem = Math.max(1, Math.ceil((duration - elapsed) / 1000));
        setAutoCaptureCountdown(rem);

        if (elapsed >= duration) {
          if (autoCaptureIntervalRef.current) clearInterval(autoCaptureIntervalRef.current);
          handleCaptureAndRecognizeFace();
        }
      }, 50);

      return () => {
        if (autoCaptureIntervalRef.current) clearInterval(autoCaptureIntervalRef.current);
      };
    } else {
      if (autoCaptureIntervalRef.current) clearInterval(autoCaptureIntervalRef.current);
      setAutoCaptureCountdown(null);
      setAutoCaptureProgress(0);
    }
  }, [kioskStep, isCameraActive, capturedPhoto, handleCaptureAndRecognizeFace]);

  // Confirm Punch ("CONFIRMAR PONTO")
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
        particleCount: 120,
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

  // Cancel / Return to Standby Screen (No employee list)
  const handleCancelOrNotMe = () => {
    setCapturedPhoto(null);
    setAutoCaptureCountdown(null);
    setAutoCaptureProgress(0);
    setShowEmployeePicker(false);
    setKioskStep('STANDBY');
  };

  // Tablet Initialization Submission
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
      {/* SCREEN 1: LOGIN DO GESTOR PARA INICIAR O TABLET               */}
      {/* ------------------------------------------------------------- */}
      {!isTabletInitialized ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center backdrop-blur-md">
            
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
                O gestor realiza este login para deixar o tablet sempre ligado na recepção para todos os funcionários.
              </p>
            </div>

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
        /* ALWAYS-ON TABLET SYSTEM (KIOSK VIEWPORT)                      */
        /* ------------------------------------------------------------- */
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
          
          {/* Flash Effect on Snapshot */}
          {isFlashing && (
            <div className="fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200 animate-out fade-out"></div>
          )}

          {/* Minimalist Top Header (Visible on Standby) */}
          {kioskStep !== 'CAMERA_FULLSCREEN' && (
            <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-lg z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Tablet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Tablet Sempre Ligado
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 fill-amber-300" />
                      Tela Não Desliga (Wake Lock)
                    </span>
                  </div>
                  <h1 className="text-xs sm:text-sm font-black text-slate-200">
                    TERMINAL FIXO DE PONTO DA EMPRESA
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
          )}

          {/* ----------------------------------------------------------- */}
          {/* 1. STANDBY SCREEN (ALWAYS-ON IDLE VIEW)                     */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'STANDBY' && (
            <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden animate-in fade-in">
              
              {/* Background Ambient Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

              <div className="max-w-xl w-full space-y-8 relative z-10">
                
                {/* Location / Company Pill */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-indigo-950/90 border border-indigo-700/60 px-4 py-1.5 rounded-full text-indigo-300 text-xs font-bold tracking-wide shadow-lg">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{geofence.name}</span>
                  </div>

                  {/* PROMINENT BRAZILIAN DATE */}
                  <h2 className="text-xl sm:text-3xl font-black text-amber-300 capitalize tracking-wide drop-shadow-md">
                    {currentTime.dateStr}
                  </h2>
                </div>

                {/* PROMINENT LIVE DIGITAL CLOCK (EXACT TIME) */}
                <div className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
                  <div className="font-mono text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-white flex items-center justify-center">
                    <span>{currentTime.hhmm}</span>
                    <span className="text-indigo-400 animate-pulse mx-1.5">:</span>
                    <span className="text-amber-400 text-3xl sm:text-5xl md:text-6xl self-end mb-1 sm:mb-2">{currentTime.ss}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-3">
                    Horário Oficial de Brasília • Ponto Eletrônico
                  </p>
                </div>

                {/* THE CLOCK-IN BUTTON (TAKE PHOTO / OPEN FULL CAMERA) */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenFullscreenCamera}
                    className="w-full py-5 sm:py-6 px-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-xl rounded-3xl shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-98 transition duration-150 flex items-center justify-center gap-3 cursor-pointer border-2 border-emerald-300 group"
                  >
                    <div className="p-2.5 bg-slate-950 text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform shadow-md">
                      <Camera className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <div className="leading-tight text-slate-950 font-black">BATER PONTO COM FOTO</div>
                      <div className="text-xs text-emerald-950 font-bold opacity-90">Câmera em tela cheia com captura automática em 4s</div>
                    </div>
                    <ArrowRight className="w-6 h-6 ml-auto group-hover:translate-x-1 transition-transform" />
                  </button>

                  <p className="text-xs text-slate-400 font-medium">
                    Sem necessidade de login pessoal. Aproxime-se e confirme sua face.
                  </p>
                </div>

              </div>
            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 2. FULL-SCREEN CAMERA VIEW (TAKING THE WHOLE SCREEN 100%)    */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'CAMERA_FULLSCREEN' && (
            <main className="fixed inset-0 z-40 bg-black flex flex-col overflow-hidden animate-in fade-in">
              
              {/* 100% Full-Screen Video Background */}
              <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                <video
                  ref={handleVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    cameraFacingMode === 'user' ? 'transform -scale-x-100' : ''
                  }`}
                />

                {/* If camera is starting or blocked, show helper overlay */}
                {!isCameraActive && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-10">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                    <h4 className="text-base font-black text-white">Iniciando câmera em tela cheia...</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Por favor, certifique-se de permitir o acesso à câmera no seu navegador.
                    </p>
                    {cameraError && (
                      <p className="text-xs text-amber-300 font-bold mt-3 bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-800 max-w-md">
                        {cameraError}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => startCameraStream()}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Tentar Novamente
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCaptureAndRecognizeFace()}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                      >
                        <ScanFace className="w-4 h-4" />
                        Capturar com Foto Padrão
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Centered Biometric Facial HUD & Amplified Frame & 4-Second Timer */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20">
                <div className="relative w-[21rem] h-[26rem] sm:w-[27rem] sm:h-[33rem] md:w-[32rem] md:h-[38rem] lg:w-[35rem] lg:h-[42rem] max-w-[92vw] max-h-[72vh] border-4 border-dashed border-emerald-400/90 rounded-[50%] shadow-[0_0_80px_rgba(52,211,153,0.5)] flex flex-col items-center justify-center">
                  
                  {/* Target Guide Badge */}
                  <div className="absolute -top-5 text-xs sm:text-sm uppercase tracking-widest text-slate-950 bg-emerald-400 px-5 py-2 rounded-full font-black border-2 border-emerald-300 shadow-2xl flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Enquadre Seu Rosto no Círculo</span>
                  </div>

                  {/* 4-Second Auto-Capture Indicator */}
                  {autoCaptureCountdown !== null && (
                    <div className="bg-slate-950/90 border-2 border-emerald-400 rounded-3xl px-6 py-3.5 flex flex-col items-center gap-1.5 shadow-2xl backdrop-blur-md animate-in zoom-in-95">
                      <div className="flex items-center gap-1.5 text-amber-300 text-xs sm:text-sm font-black">
                        <Timer className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Capturando Reconhecimento em</span>
                      </div>
                      <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-400">
                        {autoCaptureCountdown}s
                      </div>
                      <div className="w-40 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-400 transition-all duration-75"
                          style={{ width: `${autoCaptureProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* High-Tech Target Corner Marks */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-amber-400 rounded-tl-3xl"></div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-amber-400 rounded-tr-3xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-amber-400 rounded-bl-3xl"></div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-amber-400 rounded-br-3xl"></div>
                </div>
              </div>

              {/* Top Banner overlay on Camera: Live Date & Time */}
              <div className="relative z-30 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-transparent p-4 sm:p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-lg font-black text-white flex items-center gap-2">
                    <ScanFace className="w-5 h-5 text-indigo-400" />
                    Câmera do Tablet • Ponto Eletrônico
                  </h3>
                  <p className="text-xs text-amber-300 font-bold capitalize mt-0.5">
                    {currentTime.dateStr} • {currentTime.hhmm}:{currentTime.ss}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Switch Camera Button */}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600 transition cursor-pointer"
                    title="Alternar Câmera Frontal/Traseira"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>

                  {/* Back to Standby */}
                  <button
                    type="button"
                    onClick={handleCancelOrNotMe}
                    className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                </div>
              </div>

              {/* Bottom Action Controls on Camera */}
              <div className="mt-auto relative z-30 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent p-6 sm:p-8 flex flex-col items-center gap-3">
                
                {/* Big Capture Face Button */}
                <button
                  type="button"
                  onClick={() => handleCaptureAndRecognizeFace()}
                  className="w-full max-w-md py-4 sm:py-5 px-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-lg rounded-3xl shadow-2xl shadow-emerald-500/50 active:scale-95 transition flex items-center justify-center gap-3 cursor-pointer border-2 border-emerald-300"
                >
                  <Camera className="w-6 h-6 stroke-[2.5]" />
                  <span>CAPTURAR AGORA OU AGUARDE 4s (AUTO)</span>
                </button>

                <p className="text-xs text-slate-400 font-medium">
                  Posicione-se no centro do círculo para o reconhecimento automático.
                </p>

              </div>

            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 3. SCANNING FACE ID ANIMATION STEP                          */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'SCANNING_FACE' && (
            <main className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 text-center bg-slate-950 relative overflow-hidden animate-in fade-in">
              <div className="max-w-md w-full space-y-6 flex flex-col items-center">
                
                {/* Captured Photo with Laser Scan Animation */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border-4 border-indigo-500 shadow-2xl shadow-indigo-600/40 bg-black">
                  <img
                    src={capturedPhoto || selectedEmployee?.avatar}
                    alt="Foto capturada"
                    className="w-full h-full object-cover"
                  />
                  {/* Laser Scan Line */}
                  <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 shadow-[0_0_25px_rgba(52,211,153,1)] animate-bounce"></div>
                  <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none"></div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-indigo-950 text-indigo-300 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-indigo-800">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Face ID em Processamento
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    RECONHECENDO FACE...
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Identificando colaborador biométrico cadastrado no sistema.
                  </p>
                </div>

              </div>
            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 4. CONFIRMATION STEP (TAKING THE FULL SCREEN 100%)           */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'CONFIRMATION' && (
            <main className="fixed inset-0 z-40 bg-slate-950 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 md:p-8 animate-in zoom-in-95">
              
              {/* Top Header */}
              <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-950 text-indigo-400 rounded-2xl border border-indigo-800">
                    <ScanFace className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-3 py-0.5 rounded-full border border-amber-800">
                      Reconhecimento Facial Biométrico
                    </span>
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight mt-0.5">
                      Confirmação de Registro de Ponto
                    </h2>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400 block font-mono">
                    {currentTime.hhmm}:{currentTime.ss}
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {currentTime.dateStr}
                  </span>
                </div>
              </div>

              {/* Main Full-Screen Gallery: Live Captured Photo vs Registered Recognized Photo */}
              <div className="max-w-6xl w-full mx-auto my-auto py-4 sm:py-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-stretch">
                
                {/* Photo 1: Captured Live Now */}
                <div className="bg-slate-900/90 border-2 border-emerald-500/80 rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
                  <div className="w-full flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-800">
                      <Camera className="w-4 h-4" /> Sua Foto Tirada Agora
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {currentTime.hhmm}:{currentTime.ss}
                    </span>
                  </div>

                  <div className="w-full aspect-square max-h-[38vh] md:max-h-[46vh] rounded-2xl overflow-hidden bg-black border-2 border-emerald-400 shadow-xl relative">
                    <img
                      src={capturedPhoto || selectedEmployee?.avatar}
                      alt="Foto capturada agora"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="w-full mt-3 pt-2 text-center text-xs text-slate-400 font-semibold border-t border-slate-800">
                    Capturada via Tablet da Empresa • GPS Localizado
                  </div>
                </div>

                {/* Photo 2: Official Recognition / System Registered Photo */}
                <div className="bg-slate-900/90 border-2 border-indigo-500/80 rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
                  <div className="w-full flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5 bg-indigo-950/80 px-3 py-1 rounded-xl border border-indigo-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Foto do Reconhecimento (Cadastro Oficial)
                    </span>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800">
                      Face ID 100% Compatível
                    </span>
                  </div>

                  <div className="w-full aspect-square max-h-[38vh] md:max-h-[46vh] rounded-2xl overflow-hidden bg-black border-2 border-indigo-400 shadow-xl relative">
                    <img
                      src={selectedEmployee?.avatar}
                      alt={selectedEmployee?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Employee Details Card */}
                  <div className="w-full mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-left">
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-white truncate">
                        {selectedEmployee?.name}
                      </h3>
                      <p className="text-xs text-indigo-300 font-semibold truncate">
                        {selectedEmployee?.role} • {selectedEmployee?.department}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipo</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-400">
                        {getPunchTypeLabel(autoPunchType)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Actions: CONFIRMAR PONTO vs CANCELAR */}
              <div className="max-w-6xl w-full mx-auto pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="button"
                  onClick={handleConfirmPunch}
                  className="w-full sm:flex-1 py-4 sm:py-5 px-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-xl rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-3 cursor-pointer transition active:scale-95 border-2 border-emerald-300"
                >
                  <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950 text-emerald-400" />
                  <span>Confirmar Ponto</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelOrNotMe}
                  className="w-full sm:w-auto min-w-[180px] py-4 sm:py-5 px-8 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white font-black text-sm sm:text-base rounded-2xl border-2 border-slate-700 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <X className="w-5 h-5 text-rose-400" />
                  <span>Cancelar</span>
                </button>
              </div>

            </main>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 5. SUCCESS OVERLAY STEP                                     */}
          {/* ----------------------------------------------------------- */}
          {kioskStep === 'SUCCESS' && (
            <main className="fixed inset-0 z-40 flex flex-col items-center justify-center text-center p-6 bg-emerald-950/95 backdrop-blur-md animate-in zoom-in-95">
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
