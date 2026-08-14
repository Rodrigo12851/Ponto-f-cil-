import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Clock, Calendar as CalendarIcon, Users, Sparkles } from 'lucide-react';
import {
  Employee,
  CompanyGeofence,
  LocationData,
  ActiveTab,
  PunchType,
  PunchRecord,
  LunchMode,
  UserRole,
  OwnerSettings,
} from './types';
import { INITIAL_EMPLOYEES } from './data/initialData';
import { DEFAULT_GEOFENCE, getCurrentLocation } from './utils/geolocation';
import { calculateDayWorkedMinutes } from './utils/timeFormatters';
import { getOwnerSettings, saveOwnerSettings } from './utils/ownerStorage';
import { requestScreenWakeLock, releaseScreenWakeLock } from './utils/wakeLock';
import {
  subscribeEmployees,
  saveEmployeeToFirestore,
  subscribeGeofence,
  saveGeofenceToFirestore,
  subscribeOwnerSettings,
  saveOwnerSettingsToFirestore,
  clearAllEmployeesFromFirestore,
  clearAllAuditLogsFromFirestore,
  wipeAllDataFromFirestore,
} from './services/firebase';

import { Header } from './components/Header';
import { CalendarStrip } from './components/CalendarStrip';
import { PunchSection } from './components/PunchSection';
import { PunchList } from './components/PunchList';
import { HistoryTab } from './components/HistoryTab';
import { ReportsTab } from './components/ReportsTab';
import { AdminDashboard } from './components/AdminDashboard';
import { ManagerHomeDashboard } from './components/ManagerHomeDashboard';
import { OwnerPanel } from './components/OwnerPanel';
import { CameraModal } from './components/CameraModal';
import { EspelhoPontoPrint } from './components/EspelhoPontoPrint';
import { Navbar } from './components/Navbar';
import { DrawerMenu } from './components/DrawerMenu';
import { LoginScreen } from './components/LoginScreen';
import { TabletKioskModal } from './components/TabletKioskModal';
import { FacialRegistrationModal } from './components/FacialRegistrationModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { InstallPwaBanner } from './components/InstallPwaBanner';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ponto_facial_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Owner & Role state
  const [ownerSettings, setOwnerSettings] = useState<OwnerSettings>(getOwnerSettings);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    try {
      const saved = sessionStorage.getItem('ponto_facial_role');
      return (saved as UserRole) || 'COLABORADOR';
    } catch {
      return 'COLABORADOR';
    }
  });

  const handleUpdateOwnerSettings = (newSettings: OwnerSettings) => {
    setOwnerSettings(newSettings);
    saveOwnerSettings(newSettings);
    saveOwnerSettingsToFirestore(newSettings).catch((err) => {
      console.warn('Could not sync owner settings to Firestore:', err);
    });
  };

  // Clean initial state for testing
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('sistema_ponto_funcionarios_v4');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  // Purge any legacy sample data on first load so user starts with a 100% clean database
  useEffect(() => {
    try {
      const cleaned = localStorage.getItem('sistema_ponto_cleaned_v5');
      if (!cleaned) {
        localStorage.removeItem('sistema_ponto_funcionarios_v3');
        localStorage.removeItem('sistema_ponto_funcionarios_v2');
        localStorage.removeItem('sistema_ponto_funcionarios');
        localStorage.removeItem('facial_audit_logs_v1');
        localStorage.removeItem('sistema_ponto_owner_settings_v1');
        localStorage.setItem('sistema_ponto_funcionarios_v4', JSON.stringify([]));
        localStorage.setItem('sistema_ponto_cleaned_v5', 'true');
        setEmployees([]);
        wipeAllDataFromFirestore().catch(() => {});
      }
    } catch {}
  }, []);

  const [geofence, setGeofence] = useState<CompanyGeofence>(() => {
    try {
      const saved = localStorage.getItem('sistema_ponto_geofence');
      return saved ? JSON.parse(saved) : DEFAULT_GEOFENCE;
    } catch {
      return DEFAULT_GEOFENCE;
    }
  });

  const [currentEmpId, setCurrentEmpId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());
  const [activeTab, setActiveTab] = useState<ActiveTab>('inicio');
  const [isAdminView, setIsAdminView] = useState<boolean>(() => currentUserRole === 'GESTOR' || currentUserRole === 'PROPRIETARIO');

  // PWA Install Modal State
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Handle Login Action
  const handleLoginSuccess = (role: UserRole, employeeId?: string) => {
    setIsAuthenticated(true);
    setCurrentUserRole(role);
    try {
      sessionStorage.setItem('ponto_facial_auth', 'true');
      sessionStorage.setItem('ponto_facial_role', role);
    } catch {}

    if (employeeId) {
      setCurrentEmpId(employeeId);
    }

    if (role === 'COLABORADOR') {
      setIsAdminView(false);
      setActiveTab('inicio');
      if (!employeeId && employees.length > 0) setCurrentEmpId(employees[0].id);
    } else if (role === 'GESTOR') {
      setIsAdminView(true);
      setActiveTab('inicio');
      if (!employeeId && employees.length > 0) setCurrentEmpId(employees[0].id);
    } else if (role === 'PROPRIETARIO') {
      setIsAdminView(true);
      setActiveTab('proprietario');
    }
  };

  // Handle Logout Action
  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('ponto_facial_auth');
      sessionStorage.removeItem('ponto_facial_role');
    } catch {}
  };

  // Dynamic today number
  const todayNumber = new Date().getDate();

  // Auto-return timer to Today (40 seconds)
  const [autoReturnCountdown, setAutoReturnCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (selectedDay !== todayNumber) {
      setAutoReturnCountdown(40);
      const interval = setInterval(() => {
        setAutoReturnCountdown((prev) => {
          if (prev === null || prev <= 1) {
            setSelectedDay(todayNumber);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setAutoReturnCountdown(null);
    }
  }, [selectedDay, todayNumber]);

  // Modal & Drawer States
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraPunchType, setCameraPunchType] = useState<PunchType>('ENTRADA');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showEspelhoModal, setShowEspelhoModal] = useState<boolean>(false);
  const [showTabletKiosk, setShowTabletKiosk] = useState<boolean>(false);
  const [facialRegistrationEmp, setFacialRegistrationEmp] = useState<Employee | null>(null);

  // Screen WakeLock handling for Tablet Kiosk mode
  useEffect(() => {
    if (showTabletKiosk) {
      requestScreenWakeLock();

      const handleVisibilityOrFocus = () => {
        if (document.visibilityState === 'visible' && showTabletKiosk) {
          requestScreenWakeLock();
        }
      };

      const handleUserTouchOrClick = () => {
        if (showTabletKiosk) {
          requestScreenWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      window.addEventListener('focus', handleVisibilityOrFocus);
      window.addEventListener('touchstart', handleUserTouchOrClick, { passive: true });
      window.addEventListener('click', handleUserTouchOrClick, { passive: true });

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        window.removeEventListener('touchstart', handleUserTouchOrClick);
        window.removeEventListener('click', handleUserTouchOrClick);
        releaseScreenWakeLock();
      };
    } else {
      releaseScreenWakeLock();
    }
  }, [showTabletKiosk]);

  // Sync days when date changes or on load
  useEffect(() => {
    setEmployees((prev) =>
      prev.map((emp) => {
        let changed = false;
        const updatedDays = emp.days.map((d) => {
          if (d.day === todayNumber && d.status === 'FUTURO') {
            changed = true;
            return { ...d, status: 'EM_ANDAMENTO' as const };
          }
          if (d.day < todayNumber && d.status === 'FUTURO') {
            changed = true;
            const dateObj = new Date(new Date().getFullYear(), new Date().getMonth(), d.day);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            return { ...d, status: isWeekend ? ('FOLGA' as const) : ('TRABALHADO' as const) };
          }
          return d;
        });
        return changed ? { ...emp, days: updatedDays } : emp;
      })
    );
  }, [todayNumber]);

  // Live Location State
  const [location, setLocation] = useState<LocationData>({
    latitude: DEFAULT_GEOFENCE.latitude,
    longitude: DEFAULT_GEOFENCE.longitude,
    address: DEFAULT_GEOFENCE.address,
    inGeofence: true,
    distanceMeters: 12,
  });

  // Real-time Firestore Subscriptions on Mount
  useEffect(() => {
    const unsubEmployees = subscribeEmployees((remoteEmployees) => {
      if (remoteEmployees) {
        setEmployees(remoteEmployees);
      }
    });

    const unsubGeofence = subscribeGeofence((remoteGeofence) => {
      if (remoteGeofence) {
        setGeofence(remoteGeofence);
      }
    });

    const unsubOwner = subscribeOwnerSettings((remoteOwner) => {
      if (remoteOwner) {
        setOwnerSettings(remoteOwner);
      }
    });

    return () => {
      unsubEmployees();
      unsubGeofence();
      unsubOwner();
    };
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('sistema_ponto_funcionarios_v4', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('sistema_ponto_geofence', JSON.stringify(geofence));
  }, [geofence]);

  const handleUpdateGeofence = (newGf: CompanyGeofence) => {
    setGeofence(newGf);
    localStorage.setItem('sistema_ponto_geofence', JSON.stringify(newGf));
    saveGeofenceToFirestore(newGf).catch(() => {});
  };

  // Fetch initial location on load
  useEffect(() => {
    fetchCurrentLocation();
  }, [geofence]);

  const fetchCurrentLocation = async () => {
    const loc = await getCurrentLocation(geofence);
    setLocation(loc);
  };

  const currentEmployee: Employee | null =
    employees.find((e) => e.id === currentEmpId) || (employees.length > 0 ? employees[0] : null);
  const employeeDays = currentEmployee?.days || [];
  const todayPonto =
    employeeDays.find((d) => d.day === selectedDay) ||
    employeeDays.find((d) => d.day === todayNumber) ||
    (employeeDays.length > 0 ? employeeDays[0] : null);

  // Handle camera modal launch
  const handleOpenCamera = (type: PunchType) => {
    setCameraPunchType(type);
    setIsCameraOpen(true);
  };

  // Direct Punch without requiring photo/camera
  const handleDirectPunch = (type: PunchType) => {
    if (!currentEmployee) {
      alert('Nenhum colaborador selecionado.');
      return;
    }

    if (geofence.enforceGeofence !== false && !location.inGeofence) {
      alert(
        `REGISTRO DE PONTO BLOQUEADO!\n\nSua localização GPS atual está fora da área delimitada da empresa (${location.distanceMeters || 0}m de distância) e você não está conectado ao Wi-Fi seguro da empresa.`
      );
      return;
    }

    const now = new Date();
    const targetDay = todayNumber; // Live punch ALWAYS targets today!
    if (selectedDay !== todayNumber) {
      setSelectedDay(todayNumber);
    }

    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newPunch: PunchRecord = {
      id: `punch-${Date.now()}`,
      type,
      timestamp: now.toISOString(),
      timeFormatted,
      location: { ...location },
      status: 'APROVADO',
    };

    let updatedEmployeeToSync: Employee | null = null;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== currentEmployee.id) return emp;

        const updatedDays = emp.days.map((day) => {
          if (day.day !== targetDay) return day;

          const updatedPunches = [...day.punches, newPunch];
          const workedMins = calculateDayWorkedMinutes(
            updatedPunches,
            emp.lunchMode || 'AUTOMATICO',
            emp.lunchDurationMinutes || 60
          );
          const balance = workedMins - day.expectedHours * 60;

          return {
            ...day,
            punches: updatedPunches,
            workedMinutes: workedMins,
            balanceMinutes: balance,
            status: 'EM_ANDAMENTO' as const,
          };
        });

        const newBankMinutes = updatedDays
          .filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO')
          .reduce((acc, curr) => acc + curr.balanceMinutes, 0);

        const updated = {
          ...emp,
          days: updatedDays,
          lastPunchType: type,
          lastPunchTime: timeFormatted,
          bancoDeHorasMinutes: newBankMinutes,
        };
        updatedEmployeeToSync = updated;
        return updated;
      })
    );

    if (updatedEmployeeToSync) {
      saveEmployeeToFirestore(updatedEmployeeToSync).catch(() => {});
    }

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {
      console.warn('Confetti error', e);
    }
  };

  // Handle successful snapshot capture
  const handlePunchCapture = (photoDataUrl: string) => {
    if (!currentEmployee) return;

    if (geofence.enforceGeofence !== false && !location.inGeofence) {
      alert(
        `REGISTRO DE PONTO BLOQUEADO!\n\nSua localização GPS atual está fora da área delimitada da empresa (${location.distanceMeters || 0}m de distância) e você não está conectado ao Wi-Fi seguro da empresa.`
      );
      return;
    }

    const now = new Date();
    const targetDay = todayNumber; // Live punch ALWAYS targets today!
    if (selectedDay !== todayNumber) {
      setSelectedDay(todayNumber);
    }

    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newPunch: PunchRecord = {
      id: `punch-${Date.now()}`,
      type: cameraPunchType,
      timestamp: now.toISOString(),
      timeFormatted,
      photoUrl: photoDataUrl,
      location: { ...location },
      status: 'APROVADO',
    };

    let updatedEmpToSync: Employee | null = null;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== currentEmployee.id) return emp;

        const updatedDays = emp.days.map((day) => {
          if (day.day !== targetDay) return day;

          const updatedPunches = [...day.punches, newPunch];
          const workedMins = calculateDayWorkedMinutes(updatedPunches);
          const balance = workedMins - day.expectedHours * 60;

          return {
            ...day,
            punches: updatedPunches,
            workedMinutes: workedMins,
            balanceMinutes: balance,
            status: 'EM_ANDAMENTO' as const,
          };
        });

        // Recalculate accumulated bank of hours
        const newBankMinutes = updatedDays
          .filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO')
          .reduce((acc, curr) => acc + curr.balanceMinutes, 0);

        const updated = {
          ...emp,
          days: updatedDays,
          lastPunchType: cameraPunchType,
          lastPunchTime: timeFormatted,
          bancoDeHorasMinutes: newBankMinutes,
        };
        updatedEmpToSync = updated;
        return updated;
      })
    );

    if (updatedEmpToSync) {
      saveEmployeeToFirestore(updatedEmpToSync).catch(() => {});
    }

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {
      console.warn('Confetti error', e);
    }
  };

  // Tablet Kiosk Punch Registration
  const handleTabletPunch = (
    employeeId: string,
    punchType: PunchType,
    photoUrl?: string
  ) => {
    const now = new Date();
    const targetDay = todayNumber;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newPunch: PunchRecord = {
      id: `punch-tablet-${Date.now()}`,
      type: punchType,
      timestamp: now.toISOString(),
      timeFormatted,
      photoUrl: photoUrl || undefined,
      location: { ...location },
      status: 'APROVADO',
      verificationDetails: {
        method: 'TABLET_FACIAL_AI',
        confidenceScore: 98.5,
        livenessPassed: true,
      },
    };

    let updatedEmpToSync: Employee | null = null;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;

        const updatedDays = emp.days.map((day) => {
          if (day.day !== targetDay) return day;

          const updatedPunches = [...day.punches, newPunch];
          const workedMins = calculateDayWorkedMinutes(
            updatedPunches,
            emp.lunchMode || 'AUTOMATICO',
            emp.lunchDurationMinutes || 60
          );
          const balance = workedMins - day.expectedHours * 60;

          return {
            ...day,
            punches: updatedPunches,
            workedMinutes: workedMins,
            balanceMinutes: balance,
            status: 'EM_ANDAMENTO' as const,
          };
        });

        const newBankMinutes = updatedDays
          .filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO')
          .reduce((acc, curr) => acc + curr.balanceMinutes, 0);

        const updated = {
          ...emp,
          days: updatedDays,
          lastPunchType: punchType,
          lastPunchTime: timeFormatted,
          bancoDeHorasMinutes: newBankMinutes,
        };
        updatedEmpToSync = updated;
        return updated;
      })
    );

    if (updatedEmpToSync) {
      saveEmployeeToFirestore(updatedEmpToSync).catch(() => {});
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.warn('Confetti error', e);
    }
  };

  // Adjustments & Justifications Request Handlers
  const handleRequestAdjustment = (
    dayNum: number,
    originalTime: string,
    correctedTime: string,
    reason: string
  ) => {
    let updatedEmpToSync: Employee | null = null;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (!currentEmployee || emp.id !== currentEmployee.id) return emp;

        const updatedDays = emp.days.map((day) => {
          if (day.day !== dayNum) return day;

          const newAdjustments = [
            ...(day.adjustmentRequests || []),
            {
              id: `adj-${Date.now()}`,
              originalTime,
              correctedTime,
              reason,
              status: 'PENDENTE' as const,
              requestDate: new Date().toLocaleDateString('pt-BR'),
            },
          ];

          return {
            ...day,
            adjustmentRequests: newAdjustments,
          };
        });

        const updated = {
          ...emp,
          days: updatedDays,
        };
        updatedEmpToSync = updated;
        return updated;
      })
    );

    if (updatedEmpToSync) {
      saveEmployeeToFirestore(updatedEmpToSync).catch(() => {});
    }

    alert('Solicitação de ajuste de ponto enviada com sucesso ao Gestor do RH!');
  };

  // Admin / Manager Actions
  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [...prev, newEmp]);
    setCurrentEmpId(newEmp.id);
    saveEmployeeToFirestore(newEmp).catch(() => {});
  };

  const handleUpdateEmployee = (employeeId: string, updatedData: Partial<Employee>) => {
    let updatedEmpToSync: Employee | null = null;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const updated = { ...emp, ...updatedData };
        updatedEmpToSync = updated;
        return updated;
      })
    );

    if (updatedEmpToSync) {
      saveEmployeeToFirestore(updatedEmpToSync).catch(() => {});
    }
  };

  // Admin: Update employee lunch rules
  const handleUpdateEmployeeLunch = (
    employeeId: string,
    lunchMode: LunchMode,
    lunchDurationMinutes: number,
    lunchScheduledTime: string
  ) => {
    let updatedEmpToSync: Employee | null = null;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;

        const updatedDays = emp.days.map((day) => {
          const workedMins = calculateDayWorkedMinutes(
            day.punches,
            lunchMode,
            lunchDurationMinutes
          );
          return {
            ...day,
            workedMinutes: workedMins,
            balanceMinutes: workedMins - day.expectedHours * 60,
          };
        });

        const updated = {
          ...emp,
          lunchMode,
          lunchDurationMinutes,
          lunchScheduledTime,
          days: updatedDays,
        };
        updatedEmpToSync = updated;
        return updated;
      })
    );

    if (updatedEmpToSync) {
      saveEmployeeToFirestore(updatedEmpToSync).catch(() => {});
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen
          employees={employees}
          ownerSettings={ownerSettings}
          onLoginSuccess={handleLoginSuccess}
          onOpenTabletKiosk={() => setShowTabletKiosk(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
        />
        <InstallPwaModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 pb-28 sm:pb-32 font-sans selection:bg-blue-200 w-full max-w-full overflow-x-hidden">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto min-h-screen flex flex-col bg-slate-50/50 shadow-2xl shadow-slate-300/40 relative w-full max-w-full overflow-x-hidden">
        
        {/* PWA Floating Installation Top Banner */}
        <InstallPwaBanner onOpenInstallModal={() => setIsInstallModalOpen(true)} />

        {/* Header Bar */}
        <Header
          currentEmployee={currentEmployee}
          employees={employees}
          onSelectEmployee={(emp) => setCurrentEmpId(emp.id)}
          isAdminView={isAdminView}
          onToggleAdminView={(admin) => {
            if (currentUserRole !== 'COLABORADOR') {
              setIsAdminView(admin);
              if (admin) setActiveTab('admin');
              else setActiveTab('inicio');
            }
          }}
          onOpenMenu={() => setIsDrawerOpen(true)}
          onUpdateEmployee={handleUpdateEmployee}
          onLogout={handleLogout}
          currentUserRole={currentUserRole}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
        />

        {/* Content Tabs Switcher */}
        <main className="flex-1">
          {currentUserRole === 'PROPRIETARIO' ? (
            <OwnerPanel
              ownerSettings={ownerSettings}
              onUpdateOwnerSettings={handleUpdateOwnerSettings}
              currentUserRole={currentUserRole}
              onSwitchRole={(role) => {
                setCurrentUserRole(role);
                if (role === 'GESTOR' || role === 'PROPRIETARIO') {
                  setIsAdminView(true);
                }
              }}
              onOpenManagerDashboard={() => {
                setCurrentUserRole('GESTOR');
                setIsAdminView(true);
                setActiveTab('inicio');
              }}
              employeeCount={employees.length}
            />
          ) : (
            <>
              {activeTab === 'inicio' && (
                <>
                  {/* For Manager, show Manager Home Overview; For Employee, show Calendar & Punch Section */}
                  {currentUserRole === 'GESTOR' || isAdminView ? (
                    <ManagerHomeDashboard
                      employees={employees}
                      selectedDay={selectedDay}
                      onSelectEmployeeForHistory={(emp) => {
                        setCurrentEmpId(emp.id);
                        setActiveTab('historico');
                      }}
                      onSelectEmployeeForEspelho={(emp) => {
                        setCurrentEmpId(emp.id);
                        setShowEspelhoModal(true);
                      }}
                    />
                  ) : (
                    <>
                      {!currentEmployee ? (
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm m-4">
                          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center">
                            <Users className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-slate-900">
                              Nenhum Colaborador Cadastrado
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              O banco de dados foi inicializado limpo para seus testes. Entre como Gestor ou Proprietária para cadastrar o primeiro colaborador da sua empresa.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                            <button
                              onClick={() => {
                                setCurrentUserRole('GESTOR');
                                setIsAdminView(true);
                                setActiveTab('inicio');
                              }}
                              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                            >
                              Acessar Painel do Gestor
                            </button>
                            <button
                              onClick={() => {
                                setCurrentUserRole('PROPRIETARIO');
                                setActiveTab('proprietario');
                              }}
                              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                            >
                              Acessar Painel da Proprietária
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Day Calendar Selector Strip */}
                          <CalendarStrip
                            days={employeeDays}
                            selectedDay={selectedDay}
                            today={todayNumber}
                            onSelectDay={(dayNum) => setSelectedDay(dayNum)}
                          />

                          {/* Punch Registration Main Card - Employee Only */}
                          {selectedDay === todayNumber && (
                            <PunchSection
                              employee={currentEmployee}
                              location={location}
                              geofence={geofence}
                              todayNumber={todayNumber}
                              onOpenCamera={handleOpenCamera}
                              onDirectPunch={handleDirectPunch}
                              onRefreshLocation={fetchCurrentLocation}
                              onUpdateGeofence={(newGf) => {
                                handleUpdateGeofence(newGf);
                                fetchCurrentLocation();
                              }}
                              onOpenFaceIdCalibration={() => setFacialRegistrationEmp(currentEmployee)}
                            />
                          )}

                          {/* Punch Timeline for Selected Day */}
                          {todayPonto && (
                            <PunchList
                              dayPonto={todayPonto}
                              isToday={selectedDay === todayNumber}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {activeTab === 'historico' && (
                <HistoryTab
                  employee={currentEmployee || employees[0] || null}
                  employees={employees}
                  isAdmin={currentUserRole === 'GESTOR' || isAdminView}
                  onSelectEmployee={(emp) => {
                    setCurrentEmpId(emp.id);
                  }}
                  onRequestAdjustment={handleRequestAdjustment}
                  onOpenEspelhoPrint={currentUserRole === 'GESTOR' || isAdminView ? () => setShowEspelhoModal(true) : undefined}
                />
              )}

              {activeTab === 'relatorios' && (currentUserRole === 'GESTOR' || isAdminView) && (
                <ReportsTab
                  employee={currentEmployee || employees[0] || null}
                  employees={employees}
                  isAdmin={true}
                  onOpenEspelhoPrint={() => setShowEspelhoModal(true)}
                />
              )}

              {activeTab === 'admin' && (currentUserRole === 'GESTOR' || isAdminView) && (
                <AdminDashboard
                  employees={employees}
                  geofence={geofence}
                  onUpdateGeofence={handleUpdateGeofence}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onApprovePunch={() => {}}
                  onSelectEmployeeForDetail={(emp) => {
                    setCurrentEmpId(emp.id);
                    setShowEspelhoModal(true);
                  }}
                  onUpdateEmployeeLunch={handleUpdateEmployeeLunch}
                  onOpenTabletKiosk={() => setShowTabletKiosk(true)}
                />
              )}
            </>
          )}
        </main>

        {/* Camera Facial Recognition Overlay Modal */}
        {currentEmployee && (
          <CameraModal
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            punchType={cameraPunchType}
            location={location}
            employee={currentEmployee}
            employees={employees}
            onCapture={handlePunchCapture}
          />
        )}

        {/* Tablet Kiosk Modal */}
        {showTabletKiosk && (
          <TabletKioskModal
            employees={employees}
            onRegisterPunch={handleTabletPunch}
            onClose={() => setShowTabletKiosk(false)}
            managerPassword={ownerSettings.managerPassword || '1234'}
          />
        )}

        {/* Espelho de Ponto Printable View */}
        {showEspelhoModal && (isAdminView || currentUserRole === 'GESTOR' || currentUserRole === 'PROPRIETARIO') && (
          <EspelhoPontoPrint
            employee={currentEmployee || employees[0]}
            onClose={() => {
              setShowEspelhoModal(false);
            }}
          />
        )}

        {/* Slide-over Drawer Menu */}
        <DrawerMenu
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (currentUserRole === 'GESTOR' || currentUserRole === 'PROPRIETARIO' || tab === 'admin') {
              setIsAdminView(true);
            } else {
              setIsAdminView(false);
            }
          }}
          currentEmployee={currentEmployee}
          employees={employees}
          onSelectEmployee={(emp) => setCurrentEmpId(emp.id)}
          isAdminView={isAdminView}
          onToggleAdminView={(admin) => setIsAdminView(admin)}
          onUpdateEmployee={handleUpdateEmployee}
          currentUserRole={currentUserRole}
          onSwitchRole={(role) => setCurrentUserRole(role)}
          masterPassword={ownerSettings.masterPassword}
          onLogout={handleLogout}
          onOpenTabletKiosk={() => setShowTabletKiosk(true)}
          onOpenFaceIdRegistration={() => currentEmployee && setFacialRegistrationEmp(currentEmployee)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
        />

        {/* 3D Guided Facial Registration Modal */}
        {facialRegistrationEmp && (
          <FacialRegistrationModal
            employee={facialRegistrationEmp}
            onSavePhotos={(employeeId, photos) => {
              handleUpdateEmployee(employeeId, {
                facialPhotos: photos,
                avatar: photos[0] || facialRegistrationEmp.avatar,
              });
              setFacialRegistrationEmp(null);
            }}
            onClose={() => setFacialRegistrationEmp(null)}
          />
        )}

        {/* PWA Installation Guide Modal */}
        <InstallPwaModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />

        {/* Bottom Navigation Navbar */}
        <Navbar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (currentUserRole === 'GESTOR' || currentUserRole === 'PROPRIETARIO' || tab === 'admin') {
              setIsAdminView(true);
            } else {
              setIsAdminView(false);
            }
          }}
          isAdminView={isAdminView}
          currentUserRole={currentUserRole}
        />

      </div>
    </div>
  );
}
