import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
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
  };
  // Persistence state
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('sistema_ponto_funcionarios_v2');
      if (!saved) return INITIAL_EMPLOYEES;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_EMPLOYEES;

      return parsed.map((emp) => {
        if (!emp.days || !Array.isArray(emp.days) || emp.days.length === 0) {
          return { ...emp, days: INITIAL_EMPLOYEES[0].days };
        }
        return emp;
      });
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [geofence, setGeofence] = useState<CompanyGeofence>(() => {
    try {
      const saved = localStorage.getItem('sistema_ponto_geofence');
      return saved ? JSON.parse(saved) : DEFAULT_GEOFENCE;
    } catch {
      return DEFAULT_GEOFENCE;
    }
  });

  const [currentEmpId, setCurrentEmpId] = useState<string>('emp-1');
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());
  const [activeTab, setActiveTab] = useState<ActiveTab>('inicio');
  const [isAdminView, setIsAdminView] = useState<boolean>(() => currentUserRole === 'GESTOR' || currentUserRole === 'PROPRIETARIO');

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
      if (!employeeId) setCurrentEmpId('emp-1');
    } else if (role === 'GESTOR') {
      setIsAdminView(true);
      setActiveTab('inicio');
      if (!employeeId) setCurrentEmpId('emp-3');
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
            clearInterval(interval);
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

  // Modals & Drawers
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraPunchType, setCameraPunchType] = useState<PunchType>('ENTRADA');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showEspelhoModal, setShowEspelhoModal] = useState<boolean>(false);
  const [selectedEmpForDetail, setSelectedEmpForDetail] = useState<Employee | null>(null);

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

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('sistema_ponto_funcionarios_v2', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('sistema_ponto_geofence', JSON.stringify(geofence));
  }, [geofence]);

  // Fetch initial location on load
  useEffect(() => {
    fetchCurrentLocation();
  }, [geofence]);

  const fetchCurrentLocation = async () => {
    const loc = await getCurrentLocation(geofence);
    setLocation(loc);
  };

  const currentEmployee =
    employees.find((e) => e.id === currentEmpId) || employees[0] || INITIAL_EMPLOYEES[0];
  const employeeDays = currentEmployee?.days || INITIAL_EMPLOYEES[0].days;
  const todayPonto =
    employeeDays.find((d) => d.day === selectedDay) ||
    employeeDays.find((d) => d.day === todayNumber) ||
    employeeDays[0];

  // Handle camera modal launch
  const handleOpenCamera = (type: PunchType) => {
    setCameraPunchType(type);
    setIsCameraOpen(true);
  };

  // Direct Punch without requiring photo/camera
  const handleDirectPunch = (type: PunchType) => {
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

        return {
          ...emp,
          days: updatedDays,
          lastPunchType: type,
          lastPunchTime: timeFormatted,
          bancoDeHorasMinutes: newBankMinutes,
        };
      })
    );

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

        return {
          ...emp,
          days: updatedDays,
          lastPunchType: cameraPunchType,
          lastPunchTime: timeFormatted,
          bancoDeHorasMinutes: newBankMinutes,
        };
      })
    );

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

  // Manual Punch Adjustment Request by employee
  const handleRequestAdjustment = (
    dayNumber: number,
    type: PunchType,
    time: string,
    reason: string
  ) => {
    const timeFormatted = `${time}:00`;
    const newPunch: PunchRecord = {
      id: `adj-${Date.now()}`,
      type,
      timestamp: `2026-08-${String(dayNumber).padStart(2, '0')}T${timeFormatted}`,
      timeFormatted,
      isManual: true,
      notes: reason,
      status: 'PENDENTE',
    };

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== currentEmployee.id) return emp;

        const updatedDays = emp.days.map((day) => {
          if (day.day !== dayNumber) return day;
          const updatedPunches = [...day.punches, newPunch];
          const workedMins = calculateDayWorkedMinutes(updatedPunches);
          return {
            ...day,
            punches: updatedPunches,
            workedMinutes: workedMins,
            balanceMinutes: workedMins - day.expectedHours * 60,
          };
        });

        return {
          ...emp,
          days: updatedDays,
        };
      })
    );
  };

  // Admin: Add new employee
  const handleAddEmployee = (newEmpData: Partial<Employee>) => {
    const newId = `emp-${Date.now()}`;
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const newEmp: Employee = {
      id: newId,
      name: newEmpData.name || 'Novo Colaborador',
      role: newEmpData.role || 'Colaborador',
      department: newEmpData.department || 'Tecnologia',
      avatar:
        newEmpData.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      email: newEmpData.email || 'colaborador@empresa.com.br',
      cpf: newEmpData.cpf || '123.456.789-00',
      pispasep: newEmpData.pispasep || '123.45678.90-1',
      admissionDate: newEmpData.admissionDate || todayStr,
      workSchedule: newEmpData.workSchedule || '08:00 às 17:00 (Seg a Sex)',
      scheduleType: newEmpData.scheduleType || 'FIXO',
      includesSundays: newEmpData.includesSundays ?? false,
      dailyTargetHours: newEmpData.dailyTargetHours || 8,
      weeklyTargetHours: newEmpData.weeklyTargetHours || 44,
      bankModeEnabled: newEmpData.bankModeEnabled ?? true,
      isOnline: true,
      days: INITIAL_EMPLOYEES[0].days,
      bancoDeHorasMinutes: 0,
      lunchMode: newEmpData.lunchMode || 'AUTOMATICO',
      lunchDurationMinutes: newEmpData.lunchDurationMinutes || 60,
      lunchScheduledTime: newEmpData.lunchScheduledTime || '12:00 às 13:00',
    };

    setEmployees((prev) => [...prev, newEmp]);
  };

  // Admin: Update general employee registration & schedule data
  const handleUpdateEmployee = (
    employeeId: string,
    updatedData: Partial<Employee>
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        return {
          ...emp,
          ...updatedData,
        };
      })
    );
  };

  // Admin: Update employee lunch rules
  const handleUpdateEmployeeLunch = (
    employeeId: string,
    lunchMode: LunchMode,
    lunchDurationMinutes: number,
    lunchScheduledTime: string
  ) => {
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

        return {
          ...emp,
          lunchMode,
          lunchDurationMinutes,
          lunchScheduledTime,
          days: updatedDays,
        };
      })
    );
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        employees={employees}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 pb-28 sm:pb-32 font-sans selection:bg-blue-200 w-full max-w-full overflow-x-hidden">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto min-h-screen flex flex-col bg-slate-50/50 shadow-2xl shadow-slate-300/40 relative w-full max-w-full overflow-x-hidden">
        
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
        />

        {/* Content Tabs Switcher */}
        <main className="flex-1">
          {currentUserRole === 'PROPRIETARIO' ? (
            <OwnerPanel
              ownerSettings={ownerSettings}
              onUpdateOwnerSettings={handleUpdateOwnerSettings}
              currentUserRole={currentUserRole}
              onSwitchRole={(role) => setCurrentUserRole(role)}
              onOpenManagerDashboard={() => {
                setIsAdminView(true);
                setActiveTab('admin');
              }}
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
                        setSelectedEmpForDetail(emp);
                        setShowEspelhoModal(true);
                      }}
                    />
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
                            setGeofence(newGf);
                            fetchCurrentLocation();
                          }}
                        />
                      )}

                      {/* Punch Timeline for Selected Day */}
                      <PunchList
                        dayPonto={todayPonto}
                        isToday={selectedDay === todayNumber}
                      />
                    </>
                  )}
                </>
              )}

              {activeTab === 'historico' && (
                <HistoryTab
                  employee={currentEmployee}
                  employees={employees}
                  isAdmin={currentUserRole === 'GESTOR' || isAdminView}
                  onSelectEmployee={(emp) => setCurrentEmpId(emp.id)}
                  onRequestAdjustment={handleRequestAdjustment}
                  onOpenEspelhoPrint={currentUserRole === 'GESTOR' || isAdminView ? () => setShowEspelhoModal(true) : undefined}
                />
              )}

              {activeTab === 'relatorios' && (currentUserRole === 'GESTOR' || isAdminView) && (
                <ReportsTab
                  employee={currentEmployee}
                  employees={employees}
                  isAdmin={true}
                  onOpenEspelhoPrint={() => setShowEspelhoModal(true)}
                />
              )}

              {activeTab === 'admin' && (currentUserRole === 'GESTOR' || isAdminView) && (
                <AdminDashboard
                  employees={employees}
                  geofence={geofence}
                  onUpdateGeofence={(newFence) => setGeofence(newFence)}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onApprovePunch={() => {}}
                  onSelectEmployeeForDetail={(emp) => {
                    setSelectedEmpForDetail(emp);
                    setShowEspelhoModal(true);
                  }}
                  onUpdateEmployeeLunch={handleUpdateEmployeeLunch}
                />
              )}
            </>
          )}
        </main>

        {/* Camera Facial Recognition Overlay Modal */}
        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          punchType={cameraPunchType}
          location={location}
          onCapture={handlePunchCapture}
        />

        {/* Espelho de Ponto Printable View */}
        {showEspelhoModal && (isAdminView || currentUserRole === 'GESTOR' || currentUserRole === 'PROPRIETARIO') && (
          <EspelhoPontoPrint
            employee={selectedEmpForDetail || currentEmployee}
            onClose={() => {
              setShowEspelhoModal(false);
              setSelectedEmpForDetail(null);
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
