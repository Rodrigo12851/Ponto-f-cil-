import React, { useState } from 'react';
import { Employee } from '../types';
import { formatHoursAndMinutes, formatMinutesToHours } from '../utils/timeFormatters';
import {
  Users,
  Clock,
  CheckCircle2,
  Coffee,
  FileText,
  Search,
  Eye,
  Camera,
  TrendingUp,
  BarChart2,
  Award,
  Zap,
  AlertTriangle,
  Percent,
  Star,
  UserCheck,
  Sparkles,
  X,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ManagerHomeDashboardProps {
  employees: Employee[];
  selectedDay: number;
  onSelectEmployeeForHistory: (employee: Employee) => void;
  onSelectEmployeeForEspelho: (employee: Employee) => void;
}

type MetricView = 'worked' | 'punctuality' | 'bank' | 'delays';

export const ManagerHomeDashboard: React.FC<ManagerHomeDashboardProps> = ({
  employees,
  selectedDay,
  onSelectEmployeeForHistory,
  onSelectEmployeeForEspelho,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'TRABALHANDO' | 'INTERVALO' | 'CONCLUIDO' | 'AUSENTE'>('TODOS');
  const [chartMetric, setChartMetric] = useState<MetricView>('worked');
  const [selectedEmpForPerformance, setSelectedEmpForPerformance] = useState<Employee | null>(null);

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

  // Calculate team performance data for charts & KPIs
  const performanceData = employees.map((emp) => {
    const workedDays = emp.days.filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO');
    const totalWorkedMins = workedDays.reduce((acc, curr) => acc + curr.workedMinutes, 0);
    const totalExpectedMins = workedDays.reduce((acc, curr) => acc + curr.expectedHours * 60, 0);
    const totalDelayMins = workedDays.reduce((acc, curr) => acc + (curr.delayMinutes || 0), 0);
    const bankHoursMins = emp.bancoDeHorasMinutes || 0;

    const workedHours = Number((totalWorkedMins / 60).toFixed(1));
    const expectedHours = Number((totalExpectedMins / 60).toFixed(1));
    const delayHours = Number((totalDelayMins / 60).toFixed(1));
    const bankHours = Number((bankHoursMins / 60).toFixed(1));

    const totalPunches = workedDays.length;
    const latePunches = workedDays.filter((d) => (d.delayMinutes || 0) > 5).length;
    const punctualityRate = totalPunches > 0 ? Math.max(0, Math.round(((totalPunches - latePunches) / totalPunches) * 100)) : 100;

    return {
      id: emp.id,
      name: emp.name.split(' ')[0], // First name for chart label
      fullName: emp.name,
      role: emp.role,
      department: emp.department,
      avatar: emp.avatar,
      workedHours,
      expectedHours,
      delayHours,
      delayMinutes: totalDelayMins,
      bankHours,
      bankMinutes: bankHoursMins,
      punctualityRate,
      workedDaysCount: workedDays.length,
      rawEmp: emp,
    };
  });

  // Overall Team KPIs
  const totalTeamWorkedHours = performanceData.reduce((acc, curr) => acc + curr.workedHours, 0);
  const avgPunctualityRate = Math.round(
    performanceData.reduce((acc, curr) => acc + curr.punctualityRate, 0) / (performanceData.length || 1)
  );
  const totalTeamBankMins = performanceData.reduce((acc, curr) => acc + curr.bankMinutes, 0);
  
  // Top Punctual Employee Destaque
  const topEmployee = [...performanceData].sort((a, b) => b.punctualityRate - a.punctualityRate || b.workedHours - a.workedHours)[0];

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <img src={data.avatar} alt={data.fullName} className="w-7 h-7 rounded-full object-cover border border-amber-400" />
            <div>
              <p className="font-extrabold text-white">{data.fullName}</p>
              <p className="text-[10px] text-slate-400">{data.role}</p>
            </div>
          </div>
          {chartMetric === 'worked' && (
            <>
              <p className="text-slate-300">
                Horas Trabalhadas: <strong className="text-emerald-400">{data.workedHours}h</strong>
              </p>
              <p className="text-slate-400 text-[10px]">Carga Prevista: {data.expectedHours}h</p>
            </>
          )}
          {chartMetric === 'punctuality' && (
            <p className="text-slate-300">
              Índice de Pontualidade: <strong className="text-blue-400">{data.punctualityRate}%</strong>
            </p>
          )}
          {chartMetric === 'bank' && (
            <p className="text-slate-300">
              Saldo Banco de Horas:{' '}
              <strong className={data.bankMinutes >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatMinutesToHours(data.bankMinutes)}
              </strong>
            </p>
          )}
          {chartMetric === 'delays' && (
            <p className="text-slate-300">
              Atrasos Acumulados:{' '}
              <strong className="text-amber-400">{formatHoursAndMinutes(data.delayMinutes)}</strong>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-4 pb-24 space-y-6">
      {/* Live Metrics Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/80 flex items-center gap-1 w-fit">
              <Users className="w-3 h-3" /> Monitoramento da Equipe em Tempo Real
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold mt-1 text-white flex items-center gap-2">
              <span>Painel Geral do Gestor</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Visão consolidada do ponto presencial, indicadores de performance e acesso direto ao histórico
            </p>
          </div>
          <div className="text-right text-xs text-slate-300 bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-700 shadow-sm">
            Dia <strong className="text-amber-300">{selectedDay} de Agosto</strong>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setFilterStatus(filterStatus === 'TRABALHANDO' ? 'TODOS' : 'TRABALHANDO')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === 'TRABALHANDO'
                ? 'bg-emerald-950/90 border-emerald-500 ring-2 ring-emerald-500/40'
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
                ? 'bg-amber-950/90 border-amber-500 ring-2 ring-amber-500/40'
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
                ? 'bg-blue-950/90 border-blue-500 ring-2 ring-blue-500/40'
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
                ? 'bg-slate-800 border-slate-500 ring-2 ring-slate-500/40'
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

      {/* Team Performance Graph & KPIs Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Gráfico de Performance dos Colaboradores</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Análise comparativa de assiduidade, carga horária e banco de horas
                </p>
              </div>
            </div>
          </div>

          {/* Metric View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setChartMetric('worked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                chartMetric === 'worked'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⏱️ Carga Horária
            </button>
            <button
              onClick={() => setChartMetric('punctuality')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                chartMetric === 'punctuality'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎯 Pontualidade (%)
            </button>
            <button
              onClick={() => setChartMetric('bank')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                chartMetric === 'bank'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏦 Banco de Horas
            </button>
            <button
              onClick={() => setChartMetric('delays')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                chartMetric === 'delays'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚠️ Atrasos
            </button>
          </div>
        </div>

        {/* Team KPI Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl border border-indigo-100/80">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
              Pontualidade Média
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-indigo-950">{avgPunctualityRate}%</span>
              <Percent className="w-5 h-5 text-indigo-500 opacity-80" />
            </div>
            <p className="text-[10px] text-indigo-600/80 font-medium mt-1">Presença dentro do horário</p>
          </div>

          <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-100/80">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
              Horas Equipe (Mês)
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-emerald-950">{totalTeamWorkedHours.toFixed(0)}h</span>
              <Clock className="w-5 h-5 text-emerald-500 opacity-80" />
            </div>
            <p className="text-[10px] text-emerald-600/80 font-medium mt-1">Total trabalhado acumulado</p>
          </div>

          <div className="p-3 bg-gradient-to-br from-amber-50 to-yellow-50/50 rounded-2xl border border-amber-100/80">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
              Saldo Banco Equipe
            </span>
            <div className="flex items-center justify-between">
              <span
                className={`text-xl font-black ${
                  totalTeamBankMins >= 0 ? 'text-amber-950' : 'text-rose-700'
                }`}
              >
                {formatMinutesToHours(totalTeamBankMins)}
              </span>
              <TrendingUp className="w-5 h-5 text-amber-600 opacity-80" />
            </div>
            <p className="text-[10px] text-amber-700/80 font-medium mt-1">Crédito/Débito total</p>
          </div>

          {topEmployee && (
            <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-amber-50 rounded-2xl border border-amber-300/60 relative overflow-hidden">
              <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-800 uppercase tracking-wider mb-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-400" /> Colaborador Destaque
              </div>
              <div className="flex items-center gap-2">
                <img
                  src={topEmployee.avatar}
                  alt={topEmployee.fullName}
                  className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{topEmployee.fullName}</p>
                  <p className="text-[10px] font-extrabold text-amber-700">{topEmployee.punctualityRate}% de assiduidade</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              {chartMetric === 'worked' && (
                <Bar dataKey="workedHours" radius={[8, 8, 0, 0]} name="Horas Trabalhadas">
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                  ))}
                </Bar>
              )}
              {chartMetric === 'punctuality' && (
                <Bar dataKey="punctualityRate" radius={[8, 8, 0, 0]} name="Pontualidade %">
                  {performanceData.map((entry) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={entry.punctualityRate >= 90 ? '#10b981' : entry.punctualityRate >= 75 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              )}
              {chartMetric === 'bank' && (
                <Bar dataKey="bankHours" radius={[8, 8, 0, 0]} name="Horas Banco">
                  {performanceData.map((entry) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={entry.bankHours >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              )}
              {chartMetric === 'delays' && (
                <Bar dataKey="delayHours" radius={[8, 8, 0, 0]} name="Horas Atraso">
                  {performanceData.map((entry) => (
                    <Cell key={`cell-${entry.id}`} fill="#f59e0b" />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por colaborador, departamento ou cargo..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['TODOS', 'TRABALHANDO', 'INTERVALO', 'CONCLUIDO', 'AUSENTE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'TODOS'
                ? 'Todos'
                : st === 'TRABALHANDO'
                ? 'Trabalhando'
                : st === 'INTERVALO'
                ? 'Intervalo'
                : st === 'CONCLUIDO'
                ? 'Concluídos'
                : 'Ausentes'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Employees Cards with Direct Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((item) => {
          const { employee: emp, entryPunch, exitPunch, statusLabel, badgeBg, dotPulse, statusColor } = item;
          const perf = performanceData.find((p) => p.id === emp.id);

          return (
            <div
              key={emp.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 relative flex flex-col justify-between group"
            >
              <div>
                {/* Header with status dot and badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
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
                      <h3 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition">
                        <span>{emp.name}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {emp.role}
                      </p>
                      <span className="text-[10px] text-slate-400 font-bold truncate block">
                        {emp.department}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border ${badgeBg} shrink-0`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Punch timestamps & Entry photo thumbnail */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs space-y-2 mb-3">
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
                      <Camera className="w-3 h-3 text-indigo-600" /> Fotos Registradas:
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

                {/* Individual Performance Strip */}
                {perf && (
                  <div className="flex items-center justify-between bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-[11px] mb-3">
                    <div className="flex items-center gap-1 font-bold text-indigo-900">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span>Pontualidade: {perf.punctualityRate}%</span>
                    </div>
                    <div className="font-extrabold text-slate-700">
                      Banco:{' '}
                      <span className={perf.bankMinutes >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {formatMinutesToHours(perf.bankMinutes)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Action Buttons for Gestor (No need to go through Admin!) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectEmployeeForHistory(emp)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  title="Acessar o histórico de marcações deste colaborador sem passar pelo Admin"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600" /> Ver Histórico
                </button>
                <button
                  type="button"
                  onClick={() => onSelectEmployeeForEspelho(emp)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Abrir o Espelho de Ponto pronto para impressão diretamente"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" /> Espelho Ponto
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Individual Performance Modal */}
      {selectedEmpForPerformance && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={selectedEmpForPerformance.avatar}
                  alt={selectedEmpForPerformance.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500"
                />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedEmpForPerformance.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedEmpForPerformance.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpForPerformance(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700">Resumo de Desempenho do Mês:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Horas Trabalhadas</span>
                  <strong className="text-base font-black text-slate-900">
                    {formatMinutesToHours(
                      selectedEmpForPerformance.days
                        .filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO')
                        .reduce((a, b) => a + b.workedMinutes, 0)
                    )}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Banco de Horas</span>
                  <strong
                    className={`text-base font-black ${
                      (selectedEmpForPerformance.bancoDeHorasMinutes || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatMinutesToHours(selectedEmpForPerformance.bancoDeHorasMinutes || 0)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onSelectEmployeeForHistory(selectedEmpForPerformance);
                  setSelectedEmpForPerformance(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition"
              >
                Ir para Histórico
              </button>
              <button
                onClick={() => {
                  onSelectEmployeeForEspelho(selectedEmpForPerformance);
                  setSelectedEmpForPerformance(null);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl transition"
              >
                Abrir Espelho Ponto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
