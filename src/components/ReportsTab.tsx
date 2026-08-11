import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Employee } from '../types';
import {
  formatHoursAndMinutes,
  formatMinutesToHours,
} from '../utils/timeFormatters';
import {
  TrendingUp,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  Award,
  PieChart as PieIcon,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';

interface ReportsTabProps {
  employee: Employee;
  employees: Employee[];
  isAdmin: boolean;
  onOpenEspelhoPrint: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  employee,
  employees,
  isAdmin,
  onOpenEspelhoPrint,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('TODOS');

  // Daily hours dataset for bar chart
  const dailyChartData = employee.days
    .filter((d) => d.day <= 10 && d.status !== 'FOLGA')
    .map((d) => ({
      dia: `Dia ${d.day}`,
      Horas: Number((d.workedMinutes / 60).toFixed(1)),
      Meta: d.expectedHours,
    }));

  // Punctuality Pie chart dataset
  const pastDays = employee.days.filter((d) => d.day <= 10 && d.status === 'TRABALHADO');
  const onTimeDaysCount = pastDays.filter((d) => d.delayMinutes === 0).length;
  const delayedDaysCount = pastDays.filter((d) => d.delayMinutes > 0).length;

  const pieData = [
    { name: 'Pontual (Sem Atraso)', value: onTimeDaysCount || 1, color: '#10b981' },
    { name: 'Com Atraso', value: delayedDaysCount || 0, color: '#f59e0b' },
  ];

  // CSV Export Generator
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Dia,Data,Status,Horas Trabalhadas (min),Saldo (min),Atrasos (min)\n';

    employee.days.forEach((d) => {
      csvContent += `${d.day},${d.displayDate},${d.status},${d.workedMinutes},${d.balanceMinutes},${d.delayMinutes}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Relatorio_Ponto_${employee.name.replace(/\s+/g, '_')}_Agosto2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-4 pb-24 space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Relatórios em Tempo Real
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Desempenho & Jornada de Trabalho
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Análise gráfica de frequência, horas extras e pontualidade
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Exportar CSV
              </button>
              <button
                onClick={onOpenEspelhoPrint}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> PDF Espelho
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Horas Trabalhadas por Dia (Horas)
          </h3>
          <span className="text-xs text-slate-400 font-medium">Meta Diária: 8.0h</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Bar dataKey="Horas" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart & KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Punctuality Pie */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <PieIcon className="w-4 h-4 text-emerald-600" /> Índice de Pontualidade
          </h3>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Highlights & Accolades */}
        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl flex flex-col justify-between border border-emerald-900/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Status da Jornada
              </span>
            </div>
            <h3 className="text-lg font-bold">Excelente Desempenho!</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              O colaborador acumulou <strong className="text-emerald-400">{formatMinutesToHours(employee.bancoDeHorasMinutes)}</strong> em banco de horas neste ciclo de trabalho.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Biometrias Validadas:</span>
              <strong className="text-emerald-400 font-bold">100% OK</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Registros com Geolocalização:</span>
              <strong className="text-blue-400 font-bold">38 Marcações</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
