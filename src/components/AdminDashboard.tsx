import React, { useState } from 'react';
import { Employee, CompanyGeofence, PunchType, LunchMode } from '../types';
import { GeofenceMapModal } from './GeofenceMapModal';
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
} from 'lucide-react';

export type StatusCategory = 'TODOS' | 'TRABALHANDO' | 'ALMOCO' | 'FOLGA' | 'AUSENTE';

interface AdminDashboardProps {
  employees: Employee[];
  geofence: CompanyGeofence;
  onUpdateGeofence: (newGeofence: CompanyGeofence) => void;
  onAddEmployee: (newEmp: Partial<Employee>) => void;
  onApprovePunch: (employeeId: string, punchId: string) => void;
  onSelectEmployeeForDetail: (emp: Employee) => void;
  onUpdateEmployeeLunch?: (
    employeeId: string,
    lunchMode: LunchMode,
    lunchDurationMinutes: number,
    lunchScheduledTime: string
  ) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  geofence,
  onUpdateGeofence,
  onAddEmployee,
  onApprovePunch,
  onSelectEmployeeForDetail,
  onUpdateEmployeeLunch,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('TODOS');
  const [statusCategoryFilter, setStatusCategoryFilter] = useState<StatusCategory>('TODOS');
  const [showAddEmpModal, setShowAddEmpModal] = useState<boolean>(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState<boolean>(false);

  // Selected employee for lunch config modal
  const [selectedEmpForLunch, setSelectedEmpForLunch] = useState<Employee | null>(null);
  const [lunchModeState, setLunchModeState] = useState<LunchMode>('AUTOMATICO');
  const [lunchDurationState, setLunchDurationState] = useState<number>(60);
  const [lunchScheduleState, setLunchScheduleState] = useState<string>('12:00 às 13:00');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New employee form state
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpRole, setNewEmpRole] = useState<string>('');
  const [newEmpDept, setNewEmpDept] = useState<string>('Tecnologia');
  const [newEmpEmail, setNewEmpEmail] = useState<string>('');
  const [newEmpLunchMode, setNewEmpLunchMode] = useState<LunchMode>('AUTOMATICO');
  const [newEmpLunchDuration, setNewEmpLunchDuration] = useState<number>(60);

  // Categorize employee lists
  const workingEmployees = employees.filter(
    (e) => e.lastPunchType === 'ENTRADA' || e.lastPunchType === 'RETORNO_ALMOCO'
  );
  const lunchEmployees = employees.filter((e) => e.lastPunchType === 'PAUSA_ALMOCO');
  const offEmployees = employees.filter((e) => {
    const today = e.days.find((d) => d.day === 10);
    return today?.status === 'FOLGA' || e.lastPunchType === 'SAIDA';
  });
  const absentEmployees = employees.filter((e) => {
    const today = e.days.find((d) => d.day === 10);
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
      const today = emp.days.find((d) => d.day === 10);
      matchesStatus = today?.status === 'FOLGA' || emp.lastPunchType === 'SAIDA';
    } else if (statusCategoryFilter === 'AUSENTE') {
      const today = emp.days.find((d) => d.day === 10);
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
      role: newEmpRole || 'Colaborador',
      department: newEmpDept,
      email: newEmpEmail || `${newEmpName.toLowerCase().replace(/\s+/g, '.')}@empresa.com.br`,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
      workSchedule: '08:00 às 17:00 (Seg a Sex)',
      dailyTargetHours: 8,
      lunchMode: newEmpLunchMode,
      lunchDurationMinutes: newEmpLunchDuration,
      lunchScheduledTime: newEmpLunchDuration === 60 ? '12:00 às 13:00' : newEmpLunchDuration === 90 ? '12:00 às 13:30' : '12:00 às 14:00',
    });

    setShowAddEmpModal(false);
    setNewEmpName('');
    setNewEmpRole('');
    setToastMessage('Colaborador cadastrado com regras de almoço configuradas!');
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGeofenceModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md cursor-pointer border border-emerald-500"
            >
              <Map className="w-4 h-4" /> Delimitar Área no Mapa
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
            <Map className="w-4 h-4 text-emerald-600" /> Mapa de Presença e Quadrado do Terreno
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
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{emp.name}</h4>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          emp.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      ></span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {emp.role} • <span className="text-blue-600">{emp.department}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-slate-500">
                        Banco: <strong>{formatMinutesToHours(emp.bancoDeHorasMinutes)}</strong>
                      </span>
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        <Utensils className="w-2.5 h-2.5 text-amber-600" />
                        {(emp.lunchMode || 'AUTOMATICO') === 'AUTOMATICO'
                          ? `Almoço Pré-assinalado (${emp.lunchDurationMinutes || 60}m)`
                          : 'Almoço Manual'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    onClick={() => openLunchConfigModal(emp)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title="Configurar Regras de Almoço"
                  >
                    <Utensils className="w-3.5 h-3.5 text-amber-700" /> Regra Almoço
                  </button>

                  <button
                    onClick={() => onSelectEmployeeForDetail(emp)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Espelho ➔
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowAddEmpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">Cadastrar Colaborador</h3>
            <p className="text-xs text-slate-500 mb-4">
              Adicione um novo membro para registro de ponto com biometria.
            </p>

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo:</label>
                <input
                  type="text"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="Ex: Roberto Alves"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo:</label>
                  <input
                    type="text"
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    placeholder="Ex: Analista de Dados"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento:</label>
                  <select
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                  >
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Vendas">Vendas</option>
                    <option value="Design">Design</option>
                    <option value="Financeiro">Financeiro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail Corporativo:</label>
                <input
                  type="email"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  placeholder="roberto.alves@empresa.com.br"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer mt-2"
              >
                CADASTRAR E ATIVAR
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
                <h3 className="text-base font-bold text-slate-900">Configurar Intervalo de Almoço</h3>
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
    </div>
  );
};
