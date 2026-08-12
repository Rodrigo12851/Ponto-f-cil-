import React from 'react';
import { Employee, DayPonto, PunchRecord } from '../types';
import { formatHoursAndMinutes, formatMinutesToHours } from '../utils/timeFormatters';
import {
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Calendar,
  FileText,
  Search,
  ChevronRight,
  ShieldCheck,
  Eye,
  Camera,
} from 'lucide-react';

interface ManagerHomeDashboardProps {
  employees: Employee[];
  selectedDay: number;
  onSelectEmployeeForHistory: (employee: Employee) => void;
  onSelectEmployeeForEspelho: (employee: Employee) => void;
}

export const ManagerHomeDashboard: React.FC<ManagerHomeDashboardProps> = ({
  employees,
  selectedDay,
  onSelectEmployeeForHistory,
  onSelectEmployeeForEspelho,
}) => {
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [filterStatus, setFilterStatus] = React.useState<'TODOS' | 'TRABALHANDO' | 'INTERVALO' | 'CONCLUIDO' | 'AUSENTE'>('TODOS');

  // Compute live statuses for each employee for the selected day
  const employeeStatuses = employees.map((emp) => {
    const dayPonto = emp.days.find((d) => d.day === selectedDay) || emp.days[0];
    const punches = dayPonto?.punches || [];
    const lastPunch = punches[punches.length - 1];

    let statusKey: 'TRABALHANDO' | 'INTERVALO' | 'CONCLUIDO' | 'AUSENTE' = 'AUSENTE';
    let statusLabel = 'Ausente / Folga';
    let statusColor = 'bg-slate-400';
    let badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
    let dotPulse = false;

    if (dayPonto?.status === 'FOLGA') {
      statusKey = 'AUSENTE';
      statusLabel = 'Folga Escala';
      statusColor = 'bg-rose-500';
      badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (dayPonto?.status === 'TRABALHADO' && punches.length >= 4) {
      statusKey = 'CONCLUIDO';
      statusLabel = 'Jornada Concluída';
      statusColor = 'bg-blue-500';
      badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (lastPunch) {
      if (lastPunch.type === 'ENTRADA' || lastPunch.type === 'RETORNO_ALMOCO') {
        statusKey = 'TRABALHANDO';
        statusLabel = 'Trabalhando Agora';
        statusColor = 'bg-emerald-500';
        badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dotPulse = true;
      } else if (lastPunch.type === 'PAUSA_ALMOCO') {
        statusKey = 'INTERVALO';
        statusLabel = 'Em Intervalo (Almoço)';
        statusColor = 'bg-amber-500';
        badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
        dotPulse = true;
      } else if (lastPunch.type === 'SAIDA') {
        statusKey = 'CONCLUIDO';
        statusLabel = 'Expediente Encerrado';
        statusColor = 'bg-blue-500';
        badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
      }
    } else if (emp.isOnline) {
      statusKey = 'TRABALHANDO';
      statusLabel = 'Trabalhando';
      statusColor = 'bg-emerald-500';
      badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotPulse = true;
    }

    // Get entry and exit punches
    const entryPunch = punches.find((p) => p.type === 'ENTRADA');
    const exitPunch = punches.find((p) => p.type === 'SAIDA');

    return {
      employee: emp,
      dayPonto,
      punches,
      lastPunch,
      entryPunch,
      exitPunch,
      statusKey,
      statusLabel,
      statusColor,
      badgeBg,
      dotPulse,
    };
  });

  // Filtered employees
  const filteredEmployees = employeeStatuses.filter((item) => {
    const matchesSearch =
      item.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'TODOS' || item.statusKey === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Counters
  const countTrabalhando = employeeStatuses.filter((i) => i.statusKey === 'TRABALHANDO').length;
  const countIntervalo = employeeStatuses.filter((i) => i.statusKey === 'INTERVALO').length;
  const countConcluido = employeeStatuses.filter((i) => i.statusKey === 'CONCLUIDO').length;
  const countAusente = employeeStatuses.filter((i) => i.statusKey === 'AUSENTE').length;

  return (
    <div className="px-4 pb-24 space-y-5">
      {/* Manager Welcome & Live Metrics Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800 flex items-center gap-1 w-fit">
              <Users className="w-3 h-3" /> Monitoramento da Equipe em Tempo Real
            </span>
            <h2 className="text-lg font-bold mt-1 text-white">
              Painel de Presença dos Colaboradores
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Visão consolidada dos funcionários em atividade, horário de entrada e registro fotográfico
            </p>
          </div>
          <div className="text-right text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            Dia <strong className="text-white">{selectedDay} de Agosto</strong>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setFilterStatus(filterStatus === 'TRABALHANDO' ? 'TODOS' : 'TRABALHANDO')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === 'TRABALHANDO'
                ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Trabalhando</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xl font-black text-emerald-400 mt-1">{countTrabalhando}</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'INTERVALO' ? 'TODOS' : 'INTERVALO')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === 'INTERVALO'
                ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Em Intervalo</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            </div>
            <p className="text-xl font-black text-amber-400 mt-1">{countIntervalo}</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'CONCLUIDO' ? 'TODOS' : 'CONCLUIDO')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === 'CONCLUIDO'
                ? 'bg-blue-950/80 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Concluído</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            </div>
            <p className="text-xl font-black text-blue-400 mt-1">{countConcluido}</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'AUSENTE' ? 'TODOS' : 'AUSENTE')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === 'AUSENTE'
                ? 'bg-slate-800 border-slate-500 ring-2 ring-slate-500/30'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Ausente / Folga</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            </div>
            <p className="text-xl font-black text-slate-300 mt-1">{countAusente}</p>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar colaborador ou cargo..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['TODOS', 'TRABALHANDO', 'INTERVALO', 'CONCLUIDO', 'AUSENTE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition shrink-0 cursor-pointer ${
                filterStatus === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'TODOS' ? 'Todos' : st === 'TRABALHANDO' ? 'Trabalhando' : st === 'INTERVALO' ? 'Intervalo' : st === 'CONCLUIDO' ? 'Concluídos' : 'Ausentes'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Employees Cards ("Bolinhas no Quadrado") */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredEmployees.map((item) => {
          const { employee: emp, entryPunch, exitPunch, statusLabel, badgeBg, dotPulse, statusColor } = item;

          return (
            <div
              key={emp.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 relative flex flex-col justify-between group"
            >
              <div>
                {/* Header with status dot and badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-slate-100 shadow-xs"
                      />
                      {/* Live status dot in square ("bolinha no quadrado") */}
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-xs">
                        {dotPulse && (
                          <span className={`animate-ping absolute inline-flex h-3 w-3 rounded-full ${statusColor} opacity-75`}></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor}`}></span>
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-blue-600 transition">
                        {emp.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {emp.role}
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold truncate block">
                        {emp.department}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${badgeBg} shrink-0`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Punch timestamps & Entry photo thumbnail */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Entrada Hoje:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {entryPunch ? entryPunch.timeFormatted : 'Não bateu'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Saída Final:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {exitPunch ? exitPunch.timeFormatted : 'Pendente'}
                    </span>
                  </div>

                  {/* Punch Photos Badge */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Camera className="w-3 h-3 text-blue-600" /> Fotos Registradas:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {entryPunch?.photoUrl ? (
                        <div className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Entrada
                        </div>
                      ) : null}
                      {exitPunch?.photoUrl ? (
                        <div className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-md border border-blue-200">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Saída
                        </div>
                      ) : null}
                      {!entryPunch?.photoUrl && !exitPunch?.photoUrl && (
                        <span className="text-[10px] text-slate-400 italic">Sem foto</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Gestor */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onSelectEmployeeForHistory(emp)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-slate-600" /> Ver Histórico
                </button>
                <button
                  onClick={() => onSelectEmployeeForEspelho(emp)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3" /> Espelho Ponto
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
