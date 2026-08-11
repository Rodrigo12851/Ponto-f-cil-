import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Employee,
  CompanyGeofence,
  LocationData,
  ActiveTab,
  PunchType,
  PunchRecord,
  LunchMode,
} from './types';
import { INITIAL_EMPLOYEES } from './data/initialData';
import { DEFAULT_GEOFENCE, getCurrentLocation } from './utils/geolocation';
import { calculateDayWorkedMinutes } from './utils/timeFormatters';

import { Header } from './components/Header';
import { CalendarStrip } from './components/CalendarStrip';
import { PunchSection } from './components/PunchSection';
import { PunchList } from './components/PunchList';
import { HistoryTab } from './components/HistoryTab';
import { ReportsTab } from './components/ReportsTab';
import { AdminDashboard } from './components/AdminDashboard';
import { CameraModal } from './components/CameraModal';
import { EspelhoPontoPrint } from './components/EspelhoPontoPrint';
import { Navbar } from './components/Navbar';
import { DrawerMenu } from './components/DrawerMenu';

export default function App() {
  // Persistence state
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('sistema_ponto_funcionarios_v2');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [geofence, setGeofence] = useState<CompanyGeofence>(() => {
    const saved = localStorage.getItem('sistema_ponto_geofence');
    return saved ? JSON.parse(saved) : DEFAULT_GEOFENCE;
  });

  const [currentEmpId, setCurrentEmpId] = useState<string>('emp-1');
  const [selectedDay, setSelectedDay] = useState<number>(10); // Day 10 is Today
  const [activeTab, setActiveTab] = useState<ActiveTab>('inicio');
  const [isAdminView, setIsAdminView] = useState<boolean>(false);

  // Modals & Drawers
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraPunchType, setCameraPunchType] = useState<PunchType>('ENTRADA');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showEspelhoModal, setShowEspelhoModal] = useState<boolean>(false);
  const [selectedEmpForDetail, setSelectedEmpForDetail] = useState<Employee | null>(null);

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

  const currentEmployee = employees.find((e) => e.id === currentEmpId) || employees[0];
  const todayPonto = currentEmployee.days.find((d) => d.day === selectedDay) || currentEmployee.days[9];

  // Handle camera modal launch
  const handleOpenCamera = (type: PunchType) => {
    setCameraPunchType(type);
    setIsCameraOpen(true);
  };

  // Direct Punch without requiring photo/camera
  const handleDirectPunch = (type: PunchType) => {
    const now = new Date();
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
          if (day.day !== 10) return day;

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
    const now = new Date();
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

    // Update current employee's punches for today (Day 10)
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== currentEmployee.id) return emp;

        const updatedDays = emp.days.map((day) => {
          if (day.day !== 10) return day;

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
    const newEmp: Employee = {
      id: newId,
      name: newEmpData.name || 'Novo Colaborador',
      role: newEmpData.role || 'Analista',
      department: newEmpData.department || 'Tecnologia',
      avatar:
        newEmpData.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      email: newEmpData.email || 'colaborador@empresa.com.br',
      cpf: '987.654.321-00',
      pispasep: '987.65432.10-9',
      admissionDate: new Date().toLocaleDateString('pt-BR'),
      workSchedule: '08:00 às 17:00 (Seg a Sex)',
      dailyTargetHours: 8,
      isOnline: true,
      days: INITIAL_EMPLOYEES[0].days,
      bancoDeHorasMinutes: 0,
      lunchMode: newEmpData.lunchMode || 'AUTOMATICO',
      lunchDurationMinutes: newEmpData.lunchDurationMinutes || 60,
      lunchScheduledTime: newEmpData.lunchScheduledTime || '12:00 às 13:00',
    };

    setEmployees((prev) => [...prev, newEmp]);
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
            setIsAdminView(admin);
            if (admin) setActiveTab('admin');
            else setActiveTab('inicio');
          }}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />

        {/* Content Tabs Switcher */}
        <main className="flex-1">
          {activeTab === 'inicio' && !isAdminView && (
            <>
              {/* Day Calendar Selector Strip */}
              <CalendarStrip
                days={currentEmployee.days}
                selectedDay={selectedDay}
                today={10}
                onSelectDay={(dayNum) => setSelectedDay(dayNum)}
              />

              {/* Punch Registration Main Card */}
              <PunchSection
                employee={currentEmployee}
                location={location}
                geofence={geofence}
                onOpenCamera={handleOpenCamera}
                onDirectPunch={handleDirectPunch}
                onRefreshLocation={fetchCurrentLocation}
              />

              {/* Punch Timeline for Selected Day */}
              <PunchList
                dayPonto={todayPonto}
                isToday={selectedDay === 10}
              />
            </>
          )}

          {activeTab === 'historico' && !isAdminView && (
            <HistoryTab
              employee={currentEmployee}
              onRequestAdjustment={handleRequestAdjustment}
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsTab
              employee={currentEmployee}
              employees={employees}
              isAdmin={isAdminView}
              onOpenEspelhoPrint={() => setShowEspelhoModal(true)}
            />
          )}

          {(activeTab === 'admin' || isAdminView) && (
            <AdminDashboard
              employees={employees}
              geofence={geofence}
              onUpdateGeofence={(newFence) => setGeofence(newFence)}
              onAddEmployee={handleAddEmployee}
              onApprovePunch={() => {}}
              onSelectEmployeeForDetail={(emp) => {
                setSelectedEmpForDetail(emp);
                setShowEspelhoModal(true);
              }}
              onUpdateEmployeeLunch={handleUpdateEmployeeLunch}
            />
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
        {showEspelhoModal && (
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
            if (tab === 'admin') setIsAdminView(true);
            else setIsAdminView(false);
          }}
          currentEmployee={currentEmployee}
          employees={employees}
          onSelectEmployee={(emp) => setCurrentEmpId(emp.id)}
          isAdminView={isAdminView}
          onToggleAdminView={(admin) => setIsAdminView(admin)}
        />

        {/* Bottom Navigation Navbar */}
        <Navbar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'admin') setIsAdminView(true);
            else setIsAdminView(false);
          }}
          isAdminView={isAdminView}
        />

      </div>
    </div>
  );
}
