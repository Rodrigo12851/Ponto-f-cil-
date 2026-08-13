import React, { useState } from 'react';
import { Employee, CompanyGeofence, PunchType, LunchMode, ScheduleType } from '../types';
import { GeofenceMapModal } from './GeofenceMapModal';
import { FacialRegistrationModal } from './FacialRegistrationModal';
import {
  getPunchTypeLabel,
  getPunchTypeBadgeColor,
  formatMinutesToHours,
} from '../utils/timeFormatters';
import {
  Shield,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  UserPlus,
  Settings,
  Clock,
  Sparkles,
  Map,
  X,
  AlertCircle,
  Filter,
  Utensils,
  Edit2,
  Check,
  UserCheck,
  Coffee,
  Calendar,
  AlertTriangle,
  User,
  Briefcase,
  Wifi,
  Camera,
  Loader2,
  Tablet,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { processProfilePhoto } from '../utils/imageHelper';

export type StatusCategory = 'TODOS' | 'TRABALHANDO' | 'ALMOCO' | 'FOLGA' | 'AUSENTE';

interface AdminDashboardProps {
  employees: Employee[];
  geofence: CompanyGeofence;
  onUpdateGeofence: (newGeofence: CompanyGeofence) => void;
  onAddEmployee: (newEmp: Partial<Employee>) => void;
  onUpdateEmployee?: (employeeId: string, updatedData: Partial<Employee>) => void;
  onApprovePunch: (employeeId: string, punchId: string) => void;
  onSelectEmployeeForDetail: (emp: Employee) => void;
  onUpdateEmployeeLunch?: (
    employeeId: string,
    lunchMode: LunchMode,
    lunchDurationMinutes: number,
    lunchScheduledTime: string
  ) => void;
  onOpenTabletKiosk?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  geofence,
  onUpdateGeofence,
  onAddEmployee,
  onUpdateEmployee,
  onApprovePunch,
  onSelectEmployeeForDetail,
  onUpdateEmployeeLunch,
  onOpenTabletKiosk,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('TODOS');
  const [statusCategoryFilter, setStatusCategoryFilter] = useState<StatusCategory>('TODOS');
  const [showAddEmpModal, setShowAddEmpModal] = useState<boolean>(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState<boolean>(false);

  // Selected employee for 3 Facial Photos Modal
  const [selectedEmpForFacial, setSelectedEmpForFacial] = useState<Employee | null>(null);

  // Selected employee for lunch config modal
  const [selectedEmpForLunch, setSelectedEmpForLunch] = useState<Employee | null>(null);
  const [lunchModeState, setLunchModeState] = useState<LunchMode>('AUTOMATICO');
  const [lunchDurationState, setLunchDurationState] = useState<number>(60);
  const [lunchScheduleState, setLunchScheduleState] = useState<string>('12:00 às 13:00');

  // Selected employee for Edit modal
  const [selectedEmpForEdit, setSelectedEmpForEdit] = useState<Employee | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editAvatar, setEditAvatar] = useState<string>('');
  const [editCpf, setEditCpf] = useState<string>('');
  const [editPispasep, setEditPispasep] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('');
  const [editDept, setEditDept] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAdmission, setEditAdmission] = useState<string>('');
  const [editScheduleType, setEditScheduleType] = useState<ScheduleType>('FIXO');
  const [editWorkSchedule, setEditWorkSchedule] = useState<string>('');
  const [editIncludesSundays, setEditIncludesSundays] = useState<boolean>(false);
  const [editDailyHours, setEditDailyHours] = useState<number>(8);
  const [editWeeklyHours, setEditWeeklyHours] = useState<number>(44);
  const [editBankMode, setEditBankMode] = useState<boolean>(true);
  const [isEditingPhotoLoading, setIsEditingPhotoLoading] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New employee form state
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpCpf, setNewEmpCpf] = useState<string>('123.456.789-00');
  const [newEmpPispasep, setNewEmpPispasep] = useState<string>('123.45678.90-1');
  const [newEmpRole, setNewEmpRole] = useState<string>('');
  const [newEmpDept, setNewEmpDept] = useState<string>('Tecnologia');
  const [newEmpEmail, setNewEmpEmail] = useState<string>('');
  const [newEmpAdmission, setNewEmpAdmission] = useState<string>(new Date().toLocaleDateString('pt-BR'));
  const [newEmpScheduleType, setNewEmpScheduleType] = useState<ScheduleType>('FIXO');
  const [newEmpWorkSchedule, setNewEmpWorkSchedule] = useState<string>('08:00 às 17:00 (Seg a Sex)');
  const [newEmpIncludesSundays, setNewEmpIncludesSundays] = useState<boolean>(false);
  const [newEmpDailyHours, setNewEmpDailyHours] = useState<number>(8);
  const [newEmpWeeklyHours, setNewEmpWeeklyHours] = useState<number>(44);
  const [newEmpBankMode, setNewEmpBankMode] = useState<boolean>(true);
  const [newEmpLunchMode, setNewEmpLunchMode] = useState<LunchMode>('AUTOMATICO');
  const [newEmpLunchDuration, setNewEmpLunchDuration] = useState<number>(60);

  const realTodayNum = new Date().getDate();

  // Categorize employee lists
  const workingEmployees = employees.filter(
    (e) => e.lastPunchType === 'ENTRADA' || e.lastPunchType === 'RETORNO_ALMOCO'
  );
  const lunchEmployees = employees.filter((e) => e.lastPunchType === 'PAUSA_ALMOCO');
  const offEmployees = employees.filter((e) => {
    const today = e.days.find((d) => d.day === realTodayNum);
    return today?.status === 'FOLGA' || e.lastPunchType === 'SAIDA';
  });
  const absentEmployees = employees.filter((e) => {
    const today = e.days.find((d) => d.day === realTodayNum);
    return !e.lastPunchType && today?.status !== 'FOLGA';
  });

  // Filtered employees list based on search, department AND interactive status card click
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      departmentFilter === 'TODOS' || emp.department === departmentFilter;

    let matchesStatus = true;
    if (statusCategoryFilter === 'TRABALHANDO') {
      matchesStatus = emp.lastPunchType === 'ENTRADA' || emp.lastPunchType === 'RETORNO_ALMOCO';
    } else if (statusCategoryFilter === 'ALMOCO') {
      matchesStatus = emp.lastPunchType === 'PAUSA_ALMOCO';
    } else if (statusCategoryFilter === 'FOLGA') {
      const today = emp.days.find((d) => d.day === realTodayNum);
      matchesStatus = today?.status === 'FOLGA' || emp.lastPunchType === 'SAIDA';
    } else if (statusCategoryFilter === 'AUSENTE') {
      const today = emp.days.find((d) => d.day === realTodayNum);
      matchesStatus = !emp.lastPunchType && today?.status !== 'FOLGA';
    }

    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = ['TODOS', ...Array.from(new Set(employees.map((e) => e.department)))];

  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    onAddEmployee({
      name: newEmpName,
      cpf: newEmpCpf || '123.456.789-00',
      pispasep: newEmpPispasep || '123.45678.90-1',
      role: newEmpRole || 'Colaborador',
      department: newEmpDept,
      email: newEmpEmail || `${newEmpName.toLowerCase().replace(/\s+/g, '.')}@empresa.com.br`,
      admissionDate: newEmpAdmission || new Date().toLocaleDateString('pt-BR'),
      scheduleType: newEmpScheduleType,
      workSchedule: newEmpWorkSchedule,
      includesSundays: newEmpIncludesSundays,
      dailyTargetHours: Number(newEmpDailyHours) || 8,
      weeklyTargetHours: Number(newEmpWeeklyHours) || 44,
      bankModeEnabled: newEmpBankMode,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
      lunchMode: newEmpLunchMode,
      lunchDurationMinutes: newEmpLunchDuration,
      lunchScheduledTime: newEmpLunchDuration === 60 ? '12:00 às 13:00' : newEmpLunchDuration === 90 ? '12:00 às 13:30' : '12:00 às 14:00',
    });

    setShowAddEmpModal(false);
    setNewEmpName('');
    setNewEmpRole('');
    setToastMessage(`Colaborador ${newEmpName} cadastrado com sucesso e jornada configurada!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmpForEdit(emp);
    setEditName(emp.name);
    setEditAvatar(emp.avatar);
    setEditCpf(emp.cpf || '123.456.789-00');
    setEditPispasep(emp.pispasep || '123.45678.90-1');
    setEditRole(emp.role);
    setEditDept(emp.department);
    setEditEmail(emp.email);
    setEditAdmission(emp.admissionDate || '15/01/2023');
    setEditScheduleType(emp.scheduleType || 'FIXO');
    setEditWorkSchedule(emp.workSchedule || '08:00 às 17:00 (Seg a Sex)');
    setEditIncludesSundays(emp.includesSundays || false);
    setEditDailyHours(emp.dailyTargetHours || 8);
    setEditWeeklyHours(emp.weeklyTargetHours || 44);
    setEditBankMode(emp.bankModeEnabled ?? true);
  };

  const handleEditEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForEdit) return;

    if (onUpdateEmployee) {
      onUpdateEmployee(selectedEmpForEdit.id, {
        name: editName,
        avatar: editAvatar || selectedEmpForEdit.avatar,
        cpf: editCpf,
        pispasep: editPispasep,
        role: editRole,
        department: editDept,
        email: editEmail,
        admissionDate: editAdmission,
        scheduleType: editScheduleType,
        workSchedule: editWorkSchedule,
        includesSundays: editIncludesSundays,
        dailyTargetHours: Number(editDailyHours) || 8,
        weeklyTargetHours: Number(editWeeklyHours) || 44,
        bankModeEnabled: editBankMode,
      });
    }

    setSelectedEmpForEdit(null);
    setToastMessage(`Cadastro e jornada do colaborador ${editName} atualizados!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveGeofenceMap = (updatedGeofence: CompanyGeofence) => {
    onUpdateGeofence(updatedGeofence);
    setShowGeofenceModal(false);
    setToastMessage('Perímetro quadrado da cerca GPS da empresa salvo com sucesso!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openLunchConfigModal = (emp: Employee) => {
    setSelectedEmpForLunch(emp);
    setLunchModeState(emp.lunchMode || 'AUTOMATICO');
    setLunchDurationState(emp.lunchDurationMinutes || 60);
    setLunchScheduleState(emp.lunchScheduledTime || '12:00 às 13:00');
  };

  const handleSaveLunchConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForLunch) return;

    if (onUpdateEmployeeLunch) {
      onUpdateEmployeeLunch(
        selectedEmpForLunch.id,
        lunchModeState,
        lunchDurationState,
        lunchScheduleState
      );
    }

    setSelectedEmpForLunch(null);
    setToastMessage(`Regras de intervalo do colaborador ${selectedEmpForLunch.name} salvas!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="px-4 pb-24 space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in">
          <span>✅ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 text-white shadow-xl border border-slate-700/60">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/80 flex items-center gap-1 w-fit">
              <Shield className="w-3 h-3 fill-amber-400" /> Controle da Equipe
            </span>
            <h2 className="text-lg font-bold mt-1">Gestão de Presença & Cerca no Mapa</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenTabletKiosk && (
              <button
                onClick={onOpenTabletKiosk}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg cursor-pointer border border-indigo-400/50"
              >
                <Tablet className="w-4 h-4 text-amber-300" /> Modo Tablet (Empresa)
              </button>
            )}
            <button
              onClick={() => setShowGeofenceModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md cursor-pointer border border-emerald-500"
            >
              <Map className="w-4 h-4" /> Delimitar Área
            </button>
            <button
              onClick={() => setShowAddEmpModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Novo Colaborador
            </button>
          </div>
        </div>

        {/* Realtime KPI Status Cards (Quadradinhos Interativos com filtro) */}
        <div className="space-y-1 pt-3 border-t border-slate-800">
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider text-left mb-2">
            Clique no quadradinho para filtrar funcionários por status:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {/* 1. Trabalhando Agora */}
            <button
              onClick={() => setStatusCategoryFilter(statusCategoryFilter === 'TRABALHANDO' ? 'TODOS' : 'TRABALHANDO')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                statusCategoryFilter === 'TRABALHANDO'
                  ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-400 scale-[1.02] shadow-lg'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-emerald-400 font-extrabold uppercase">Trabalhando</p>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg font-black text-white mt-1">{workingEmployees.length}</p>
              <span className="text-[9px] text-emerald-300 font-medium block mt-0.5">Clique p/ listar ➔</span>
            </button>

            {/* 2. Em Almoço / Pausa */}
            <button
              onClick={() => setStatusCategoryFilter(statusCategoryFilter === 'ALMOCO' ? 'TODOS' : 'ALMOCO')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                statusCategoryFilter === 'ALMOCO'
                  ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400 scale-[1.02] shadow-lg'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-amber-400 font-extrabold uppercase">Em Almoço</p>
                <Coffee className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-lg font-black text-white mt-1">{lunchEmployees.length}</p>
              <span className="text-[9px] text-amber-300 font-medium block mt-0.5">Clique p/ listar ➔</span>
            </button>

            {/* 3. De Folga */}
            <button
              onClick={() => setStatusCategoryFilter(statusCategoryFilter === 'FOLGA' ? 'TODOS' : 'FOLGA')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                statusCategoryFilter === 'FOLGA'
                  ? 'bg-purple-950/90 border-purple-400 ring-2 ring-purple-400 scale-[1.02] shadow-lg'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-purple-300 font-extrabold uppercase">De Folga</p>
                <Calendar className="w-4 h-4 text-purple-300" />
              </div>
              <p className="text-lg font-black text-white mt-1">{offEmployees.length}</p>
              <span className="text-[9px] text-purple-300 font-medium block mt-0.5">Clique p/ listar ➔</span>
            </button>

            {/* 4. Ausentes / Faltas */}
            <button
              onClick={() => setStatusCategoryFilter(statusCategoryFilter === 'AUSENTE' ? 'TODOS' : 'AUSENTE')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                statusCategoryFilter === 'AUSENTE'
                  ? 'bg-rose-950/90 border-rose-400 ring-2 ring-rose-400 scale-[1.02] shadow-lg'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-rose-400 font-extrabold uppercase">Ausentes</p>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-lg font-black text-white mt-1">{absentEmployees.length}</p>
              <span className="text-[9px] text-rose-300 font-medium block mt-0.5">Clique p/ listar ➔</span>
            </button>

            {/* 5. Total Equipe */}
            <button
              onClick={() => setStatusCategoryFilter('TODOS')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                statusCategoryFilter === 'TODOS'
                  ? 'bg-blue-950/90 border-blue-400 ring-2 ring-blue-400 scale-[1.02] shadow-lg'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-blue-300 font-extrabold uppercase">Total Equipe</p>
                <Users className="w-4 h-4 text-blue-300" />
              </div>
              <p className="text-lg font-black text-white mt-1">{employees.length}</p>
              <span className="text-[9px] text-blue-300 font-medium block mt-0.5">Ver Todos ➔</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Banner */}
      {statusCategoryFilter !== 'TODOS' && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>
              Exibindo apenas colaboradores:{' '}
              <strong className="uppercase underline">
                {statusCategoryFilter === 'TRABALHANDO' && 'Trabalhando Agora'}
                {statusCategoryFilter === 'ALMOCO' && 'Em Almoço / Pausa'}
                {statusCategoryFilter === 'FOLGA' && 'De Folga'}
                {statusCategoryFilter === 'AUSENTE' && 'Ausentes / Sem Registro'}
              </strong>{' '}
              ({filteredEmployees.length} encontrados)
            </span>
          </div>
          <button
            onClick={() => setStatusCategoryFilter('TODOS')}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
          >
            Limpar Filtro (Ver Todos)
          </button>
        </div>
      )}

      {/* Live Map Radar Visual Simulation */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Map className="w-4 h-4 text-emerald-600" />
            <span>Mapa de Presença e Quadrado do Terreno</span>
          </h3>
          <button
            onClick={() => setShowGeofenceModal(true)}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-600" />
            Delimitar no Google Maps ({geofence.squarePerimeter?.widthMeters || 200}m x {geofence.squarePerimeter?.heightMeters || 200}m)
          </button>
        </div>

        <div className="relative w-full h-52 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-4">
          {/* Background Map Grid Graphic */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>

          {/* Central Geofence Square perimeter */}
          <div className="relative w-48 h-36 rounded-xl border-4 border-emerald-500 bg-emerald-500/15 flex flex-col items-center justify-between p-2 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <span className="text-[9px] bg-slate-900 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/40 -mt-3 shadow">
              Início da Empresa
            </span>

            <div className="text-center bg-slate-900/90 text-white font-extrabold text-[10px] px-2 py-1 rounded-md border border-emerald-400">
              {geofence.name}
            </div>

            <span className="text-[9px] bg-slate-900 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/40 -mb-3 shadow">
              Final da Empresa
            </span>
          </div>

          {/* Employee Pin Markers */}
          {filteredEmployees.map((emp, i) => {
            const offsets = [
              { top: '35%', left: '42%' },
              { top: '50%', left: '55%' },
              { top: '25%', left: '60%' },
              { top: '65%', left: '30%' },
            ];
            const pos = offsets[i % offsets.length];

            return (
              <div
                key={emp.id}
                onClick={() => onSelectEmployeeForDetail(emp)}
                style={{ top: pos.top, left: pos.left }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
                title={`${emp.name} - ${emp.lastPunchType || 'Entrada'}`}
              >
                <div className="relative flex items-center justify-center">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-8 h-8 rounded-full border-2 border-emerald-400 shadow-md group-hover:scale-125 transition-transform object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900"></span>
                </div>
                <div className="hidden group-hover:block absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl border border-slate-700 z-20">
                  {emp.name} ({emp.lastPunchTime || '08:00'})
                </div>
              </div>
            );
          })}
        </div>

        {/* Trusted Wi-Fi Quick Info Bar */}
        <div className="mt-3 bg-blue-50/80 border border-blue-200/80 p-2.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-xl shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 text-xs">Wi-Fi Confiável (Trusted Wi-Fi):</span>
                <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                  {geofence.wifiSsid || geofence.trustedWifiSsid || 'WIFI_EMPRESA_SEDE'}
                </span>
                {geofence.trustedWifiSsids && geofence.trustedWifiSsids.length > 0 && (
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                    +{geofence.trustedWifiSsids.length} rede(s)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-600 font-medium leading-tight mt-0.5">
                Dispositivos conectados às redes cadastradas possuem localização validada automaticamente, <strong>isenta de erros por GPS drift</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGeofenceModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
          >
            Gerenciar SSIDs Confiáveis
          </button>
        </div>
      </div>

      {/* Employee Search and Department Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por colaborador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                departmentFilter === dept
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Directory List */}
      <div className="space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhum colaborador encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Nenhum colaborador se encaixa nesse filtro de status ou busca.</p>
            <button
              onClick={() => {
                setStatusCategoryFilter('TODOS');
                setSearchTerm('');
                setDepartmentFilter('TODOS');
              }}
              className="mt-3 px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 min-w-0">
                <img
                  src={emp.avatar}
                  alt={emp.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">{emp.name}</h4>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        emp.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      }`}
                      title={emp.isOnline ? 'Ativo no sistema' : 'Inativo no momento'}
                    ></span>

                    {/* Schedule Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        emp.scheduleType === 'FLEXIVEL'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : emp.scheduleType === 'ESCALA_6X1' || emp.scheduleType === 'ESCALA_12X36'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {emp.scheduleType === 'FLEXIVEL'
                        ? '🔀 Flexível / Supermercado'
                        : emp.scheduleType === 'ESCALA_6X1'
                        ? '📅 Escala 6x1'
                        : emp.scheduleType === 'ESCALA_12X36'
                        ? '⏱️ Escala 12x36'
                        : '🟢 Jornada Fixa'}
                    </span>

                    {emp.includesSundays && (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                        ☀️ Inclui Domingos
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    <strong>{emp.role}</strong> • <span className="text-blue-600 font-bold">{emp.department}</span>
                  </p>

                  <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 flex-wrap text-[11px] text-slate-500 font-medium">
                    <span>📄 <strong>CPF:</strong> {emp.cpf}</span>
                    <span>📑 <strong>PIS:</strong> {emp.pispasep}</span>
                    <span>📅 <strong>Admissão:</strong> {emp.admissionDate}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Work Schedule text */}
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 font-semibold">
                      ⏰ {emp.workSchedule}
                    </span>

                    {/* Banco de Horas tag */}
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-lg border font-bold flex items-center gap-1 ${
                        emp.bancoDeHorasMinutes >= 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      Banco: {formatMinutesToHours(emp.bancoDeHorasMinutes)}{' '}
                      {emp.bancoDeHorasMinutes >= 0 ? '(Crédito)' : '(Débito / Horas Devidas)'}
                    </span>

                    {/* Lunch Mode Tag */}
                    <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                      <Utensils className="w-2.5 h-2.5 text-amber-600" />
                      {(emp.lunchMode || 'AUTOMATICO') === 'AUTOMATICO'
                        ? `Almoço Pré-assinalado (${emp.lunchDurationMinutes || 60}m)`
                        : 'Almoço Manual'}
                    </span>

                    {/* Personal App Punch Status Tag */}
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = emp.allowPersonalPunch === false ? true : false;
                        if (onUpdateEmployee) {
                          onUpdateEmployee(emp.id, { allowPersonalPunch: newVal });
                          setToastMessage(
                            newVal
                              ? `Ponto no celular liberado para ${emp.name}!`
                              : `Ponto no celular bloqueado para ${emp.name} (Somente no Tablet)!`
                          );
                          setTimeout(() => setToastMessage(null), 3500);
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1 border transition cursor-pointer ${
                        emp.allowPersonalPunch !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                      }`}
                      title="Clique para ativar/desativar se este colaborador pode bater ponto pelo próprio celular/login"
                    >
                      {emp.allowPersonalPunch !== false ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Ponto no App: Liberado</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-2.5 h-2.5 text-rose-600" />
                          <span>Ponto no App: Bloqueado (Só Tablet)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0 flex-wrap">
                <button
                  onClick={() => setSelectedEmpForFacial(emp)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="Cadastrar 3 fotos faciais para o tablet"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>3 Fotos Tablet ({emp.facialPhotos?.length || 0}/3)</span>
                </button>

                <button
                  onClick={() => openEditModal(emp)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="Editar dados e jornada do colaborador"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-700" /> Editar
                </button>

                <button
                  onClick={() => openLunchConfigModal(emp)}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="Configurar Regras de Almoço"
                >
                  <Utensils className="w-3.5 h-3.5 text-amber-700" /> Almoço
                </button>

                <button
                  onClick={() => onSelectEmployeeForDetail(emp)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Espelho ➔
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cadastrar Colaborador Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative border border-slate-100 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddEmpModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  <span>Cadastrar Colaborador</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cadastre dados pessoais, CPF, PIS/PASEP e tipo de jornada flexível/fixa.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4 text-xs">
              {/* Section 1: Dados Pessoais & Documentos */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> 1. DADOS PESSOAIS & DOCUMENTOS
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo do Colaborador:</label>
                  <input
                    type="text"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CPF (11 dígitos):</label>
                    <input
                      type="text"
                      value={newEmpCpf}
                      onChange={(e) => setNewEmpCpf(e.target.value)}
                      placeholder="123.456.789-00"
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">PIS / PASEP / NIT:</label>
                    <input
                      type="text"
                      value={newEmpPispasep}
                      onChange={(e) => setNewEmpPispasep(e.target.value)}
                      placeholder="123.45678.90-1"
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Corporativo:</label>
                  <input
                    type="email"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    placeholder="joao.silva@empresa.com.br"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Section 2: Profissional */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-600" /> 2. DADOS PROFISSIONAIS
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cargo:</label>
                    <input
                      type="text"
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                      placeholder="Ex: Desenvolvedor Front-End"
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Departamento / Setor:</label>
                    <select
                      value={newEmpDept}
                      onChange={(e) => setNewEmpDept(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    >
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Supermercado">Supermercado</option>
                      <option value="Recursos Humanos">Recursos Humanos</option>
                      <option value="Vendas">Vendas</option>
                      <option value="Design">Design</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Operações">Operações</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data de Admissão:</label>
                    <input
                      type="text"
                      value={newEmpAdmission}
                      onChange={(e) => setNewEmpAdmission(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Jornada de Trabalho & Flexibilidade */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" /> 3. JORNADA DE TRABALHO & BANCO DE HORAS
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Tipo de Jornada de Trabalho:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'FIXO', label: '🟢 Fixa', desc: '08h às 17h (Seg-Sex)' },
                      { id: 'FLEXIVEL', label: '🔀 Flexível', desc: 'Supermercado (Turnos 08h ou 13h)' },
                      { id: 'ESCALA_6X1', label: '📅 6x1', desc: 'Inclui Domingos' },
                      { id: 'ESCALA_12X36', label: '⏱️ 12x36', desc: 'Plantão 12h' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          const type = st.id as ScheduleType;
                          setNewEmpScheduleType(type);
                          if (type === 'FIXO') {
                            setNewEmpWorkSchedule('08:00 às 17:00 (Seg a Sex)');
                            setNewEmpIncludesSundays(false);
                          } else if (type === 'FLEXIVEL') {
                            setNewEmpWorkSchedule('Flexível Supermercado (Entrada 08:00h ou 13:00h - Domingos Inclusos)');
                            setNewEmpIncludesSundays(true);
                          } else if (type === 'ESCALA_6X1') {
                            setNewEmpWorkSchedule('Escala 6x1 (08:00 às 16:20 - Seg a Dom com folga semanal)');
                            setNewEmpIncludesSundays(true);
                          } else if (type === 'ESCALA_12X36') {
                            setNewEmpWorkSchedule('Escala 12x36 (07:00 às 19:00)');
                            setNewEmpIncludesSundays(true);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                          newEmpScheduleType === st.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs">{st.label}</div>
                        <div className="text-[9px] font-normal opacity-90 mt-0.5 leading-tight">{st.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Descrição / Detalhamento da Jornada:</label>
                  <input
                    type="text"
                    value={newEmpWorkSchedule}
                    onChange={(e) => setNewEmpWorkSchedule(e.target.value)}
                    placeholder="Ex: 08:00 às 17:00 (Seg a Sex) ou Flexível 08h / 13h"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="newIncludesSundays"
                    checked={newEmpIncludesSundays}
                    onChange={(e) => setNewEmpIncludesSundays(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="newIncludesSundays" className="font-bold text-slate-800 text-xs cursor-pointer">
                    Escala de trabalho inclui Domingos e Feriados
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Carga Diária Alvo (horas):</label>
                    <input
                      type="number"
                      value={newEmpDailyHours}
                      onChange={(e) => setNewEmpDailyHours(Number(e.target.value))}
                      min={1}
                      max={12}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Carga Semanal Alvo (horas):</label>
                    <input
                      type="number"
                      value={newEmpWeeklyHours}
                      onChange={(e) => setNewEmpWeeklyHours(Number(e.target.value))}
                      min={1}
                      max={60}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                  <strong>💡 Regras do Banco de Horas na Jornada Flexível:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li>O funcionário deve cumprir a carga exigida pela CLT/contrato.</li>
                    <li>Se não cumprir a carga diária/semanal, o saldo fica <strong>negativo (devendo horas)</strong>.</li>
                    <li>Se trabalhar a mais por solicitação do proprietário/gestão, acumula <strong>saldo positivo no Banco de Horas</strong>.</li>
                  </ul>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <Check className="w-4 h-4" /> CADASTRAR COLABORADOR & ATIVAR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Editar Colaborador Modal */}
      {selectedEmpForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative border border-slate-100 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedEmpForEdit(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl border border-slate-200">
                <Edit2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  <span>Editar Cadastro & Jornada</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">{selectedEmpForEdit.name}</p>
              </div>
            </div>

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4 text-xs">
              {/* Personal & Docs */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs">DADOS PESSOAIS & FOTO DE PERFIL</h4>
                
                {/* Profile Photo Selector in Modal */}
                <div className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-slate-200">
                  <div className="relative shrink-0">
                    <img
                      src={editAvatar || selectedEmpForEdit.avatar}
                      alt={editName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-800 text-xs mb-1">
                      Foto do Colaborador:
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200 transition cursor-pointer">
                      {isEditingPhotoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>Escolher Foto (Galeria ou Câmera)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setIsEditingPhotoLoading(true);
                            const photoUrl = await processProfilePhoto(file);
                            setEditAvatar(photoUrl);
                          } catch (err: any) {
                            alert(err?.message || 'Erro ao carregar imagem.');
                          } finally {
                            setIsEditingPhotoLoading(false);
                          }
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      Selecione uma imagem da galeria do dispositivo.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo:</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CPF:</label>
                    <input
                      type="text"
                      value={editCpf}
                      onChange={(e) => setEditCpf(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">PIS / PASEP:</label>
                    <input
                      type="text"
                      value={editPispasep}
                      onChange={(e) => setEditPispasep(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Corporativo:</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Professional */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs">CARGO & DEPARTAMENTO</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cargo:</label>
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Departamento:</label>
                    <input
                      type="text"
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admissão:</label>
                    <input
                      type="text"
                      value={editAdmission}
                      onChange={(e) => setEditAdmission(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs">JORNADA & BANCO DE HORAS</h4>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Tipo de Jornada:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'FIXO', label: '🟢 Fixa' },
                      { id: 'FLEXIVEL', label: '🔀 Flexível Supermercado' },
                      { id: 'ESCALA_6X1', label: '📅 Escala 6x1' },
                      { id: 'ESCALA_12X36', label: '⏱️ Escala 12x36' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setEditScheduleType(st.id as ScheduleType)}
                        className={`p-2 rounded-xl border font-bold text-xs cursor-pointer ${
                          editScheduleType === st.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horário de Trabalho / Escala:</label>
                  <input
                    type="text"
                    value={editWorkSchedule}
                    onChange={(e) => setEditWorkSchedule(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIncludesSundays"
                    checked={editIncludesSundays}
                    onChange={(e) => setEditIncludesSundays(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="editIncludesSundays" className="font-bold text-slate-800 text-xs cursor-pointer">
                    Jornada inclui Domingos e Feriados na escala
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Carga Diária (h):</label>
                    <input
                      type="number"
                      value={editDailyHours}
                      onChange={(e) => setEditDailyHours(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Carga Semanal (h):</label>
                    <input
                      type="number"
                      value={editWeeklyHours}
                      onChange={(e) => setEditWeeklyHours(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <Check className="w-4 h-4" /> SALVAR ALTERAÇÕES DO COLABORADOR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Geofence Settings Google Map Modal */}
      {showGeofenceModal && (
        <GeofenceMapModal
          geofence={geofence}
          onSave={handleSaveGeofenceMap}
          onClose={() => setShowGeofenceModal(false)}
        />
      )}

      {/* Employee Lunch Rules Configuration Modal */}
      {selectedEmpForLunch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setSelectedEmpForLunch(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  <span>Configurar Intervalo de Almoço</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedEmpForLunch.name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveLunchConfig} className="space-y-4 text-xs">
              <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
                <strong>💡 Regime de Almoço (Art. 74 § 2º CLT):</strong><br />
                Permite pré-assinalar o horário de almoço do colaborador, eliminando a necessidade de bater o ponto na saída/retorno do almoço.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Regime da Pausa de Almoço:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLunchModeState('AUTOMATICO')}
                    className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                      lunchModeState === 'AUTOMATICO'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="text-xs">Pré-assinalado</div>
                    <div className="text-[10px] font-normal opacity-90 mt-0.5">Dispensa marcação</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLunchModeState('MANUAL')}
                    className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                      lunchModeState === 'MANUAL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="text-xs">Manual</div>
                    <div className="text-[10px] font-normal opacity-90 mt-0.5">Exige bater ponto</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Duração do Intervalo de Almoço:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mins: 60, label: '1 Hora (60 min)' },
                    { mins: 90, label: '1h 30min (90 min)' },
                    { mins: 120, label: '2 Horas (120 min)' },
                  ].map((item) => (
                    <button
                      key={item.mins}
                      type="button"
                      onClick={() => {
                        setLunchDurationState(item.mins);
                        if (item.mins === 60) setLunchScheduleState('12:00 às 13:00');
                        else if (item.mins === 90) setLunchScheduleState('12:00 às 13:30');
                        else setLunchScheduleState('12:00 às 14:00');
                      }}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                        lunchDurationState === item.mins
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Horário Previsto para o Almoço:</label>
                <input
                  type="text"
                  value={lunchScheduleState}
                  onChange={(e) => setLunchScheduleState(e.target.value)}
                  placeholder="Ex: 12:00 às 13:00"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer mt-2 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> SALVAR REGRAS DE ALMOÇO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Facial Registration Modal (3 Photos for Tablet) */}
      {selectedEmpForFacial && (
        <FacialRegistrationModal
          employee={selectedEmpForFacial}
          onSavePhotos={(employeeId, photos) => {
            if (onUpdateEmployee) {
              onUpdateEmployee(employeeId, { facialPhotos: photos });
              setToastMessage(`3 fotos faciais cadastradas com sucesso para o tablet!`);
              setTimeout(() => setToastMessage(null), 3500);
            }
          }}
          onClose={() => setSelectedEmpForFacial(null)}
        />
      )}
    </div>
  );
};
