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
  CartesianGrid,
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
  Users,
  Building2,
  Filter,
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

  // Filter employees by department
  const filteredEmployees = employees.filter((emp) => {
    if (selectedDept === 'TODOS') return true;
    return emp.department === selectedDept;
  });

  // Extract unique departments
  const departments = ['TODOS', ...Array.from(new Set(employees.map((e) => e.department)))];

  // Employee Worked Hours Chart Dataset
  const employeesWorkedHoursData = filteredEmployees.map((emp) => {
    const totalWorkedMins = emp.days
      .filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO')
      .reduce((acc, curr) => acc + curr.workedMinutes, 0);

    return {
      name: emp.name.split(' ')[0] + ' ' + (emp.name.split(' ')[1]?.[0] || '') + '.',
      fullName: emp.name,
      Horas: Number((totalWorkedMins / 60).toFixed(1)),
      bancoMins: emp.bancoDeHorasMinutes,
    };
  });

  // Employee Bank Balance Dataset
  const employeesBankData = filteredEmployees.map((emp) => {
    return {
      name: emp.name.split(' ')[0],
      fullName: emp.name,
      SaldoHoras: Number((emp.bancoDeHorasMinutes / 60).toFixed(1)),
    };
  });

  // Employee Delay Dataset
  const employeesDelayData = filteredEmployees.map((emp) => {
    const totalDelay = emp.days.reduce((acc, curr) => acc + (curr.delayMinutes || 0), 0);
    return {
      name: emp.name.split(' ')[0],
      fullName: emp.name,
      AtrasosMin: totalDelay,
    };
  });

  // Team Punctuality Pie chart dataset
  const totalOnTimePunches = filteredEmployees.reduce((acc, emp) => {
    return acc + emp.days.filter((d) => d.status === 'TRABALHADO' && d.delayMinutes === 0).length;
  }, 0);

  const totalDelayedPunches = filteredEmployees.reduce((acc, emp) => {
    return acc + emp.days.filter((d) => d.status === 'TRABALHADO' && d.delayMinutes > 0).length;
  }, 0);

  const pieTeamData = [
    { name: 'Entradas Pontuais', value: totalOnTimePunches || 1, color: '#10b981' },
    { name: 'Entradas com Atraso', value: totalDelayedPunches || 0, color: '#f59e0b' },
  ];

  // Individual Employee Daily Chart (For non-admin employee view)
  const dailyChartData = employee.days
    .filter((d) => d.day <= 10 && d.status !== 'FOLGA')
    .map((d) => ({
      dia: `Dia ${d.day}`,
      Horas: Number((d.workedMinutes / 60).toFixed(1)),
      Meta: d.expectedHours,
    }));

  // CSV Export Generator (Export Team data when Admin, or single employee when not)
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (isAdmin) {
      csvContent += 'Nome,Cargo,Departamento,Horas Trabalhadas (Horas),Saldo Banco (Minutos),Atrasos Acumulados (Minutos)\n';
      filteredEmployees.forEach((emp) => {
        const totalWorkedMins = emp.days
          .filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO')
          .reduce((acc, curr) => acc + curr.workedMinutes, 0);
        const totalDelay = emp.days.reduce((acc, curr) => acc + (curr.delayMinutes || 0), 0);

        csvContent += `"${emp.name}","${emp.role}","${emp.department}",${(totalWorkedMins / 60).toFixed(1)},${emp.bancoDeHorasMinutes},${totalDelay}\n`;
      });
    } else {
      csvContent += 'Dia,Data,Status,Horas Trabalhadas (min),Saldo (min),Atrasos (min)\n';
      employee.days.forEach((d) => {
        csvContent += `${d.day},${d.displayDate},${d.status},${d.workedMinutes},${d.balanceMinutes},${d.delayMinutes}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Relatorio_${isAdmin ? 'Equipe' : employee.name.replace(/\s+/g, '_')}_Agosto2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-4 pb-24 space-y-5">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 w-fit">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              {isAdmin ? 'Relatórios Consolidados de Gestão' : 'Relatórios em Tempo Real'}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {isAdmin ? 'Análise Comparativa de Colaboradores' : 'Desempenho & Jornada de Trabalho'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isAdmin
                ? 'Gráficos de horas trabalhadas, banco de horas e pontualidade por funcionário'
                : 'Análise gráfica de frequência, horas extras e pontualidade'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Exportar CSV
            </button>
            <button
              onClick={onOpenEspelhoPrint}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> PDF Espelho
            </button>
          </div>
        </div>

        {/* Department Filter for Gestor */}
        {isAdmin && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 overflow-x-auto">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Departamento:
            </span>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedDept === dept
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ADMIN GESTOR CHARTS VIEW */}
      {isAdmin ? (
        <>
          {/* Chart 1: Worked Hours per Colaborador */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Total de Horas Trabalhadas por Colaborador
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Comparação acumulada do mês vigente (Horas)
                </p>
              </div>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                {filteredEmployees.length} Funcionários
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeesWorkedHoursData} margin={{ top: 15, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    formatter={(value: any) => [`${value} horas`, 'Trabalhado']}
                  />
                  <Bar dataKey="Horas" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid with 2 Secondary Charts: Bank Balance & Delays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 2: Bank of Hours Balance */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Saldo do Banco de Horas (Horas)
                </h3>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeesBankData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        border: 'none',
                      }}
                      formatter={(value: any) => [`${value} h`, 'Saldo Banco']}
                    />
                    <Bar dataKey="SaldoHoras" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Delays Comparison */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Atrasos Acumulados por Colaborador (Minutos)
                </h3>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeesDelayData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        border: 'none',
                      }}
                      formatter={(value: any) => [`${value} min`, 'Atrasos']}
                    />
                    <Bar dataKey="AtrasosMin" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Team Ranking & Performance Table */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Tabela do Histórico da Equipe
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3 rounded-l-xl">Colaborador</th>
                    <th className="p-3">Cargo / Depto</th>
                    <th className="p-3 text-center">Horas Trab.</th>
                    <th className="p-3 text-center">Banco de Horas</th>
                    <th className="p-3 text-center rounded-r-xl">Atrasos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => {
                    const totalWorkedMins = emp.days
                      .filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO')
                      .reduce((acc, curr) => acc + curr.workedMinutes, 0);
                    const totalDelay = emp.days.reduce((acc, curr) => acc + (curr.delayMinutes || 0), 0);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 flex items-center gap-2.5">
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <span className="font-extrabold text-slate-900">{emp.name}</span>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{emp.role}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{emp.department}</p>
                        </td>
                        <td className="p-3 text-center font-bold text-blue-600 font-mono">
                          {formatHoursAndMinutes(totalWorkedMins)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
                              emp.bancoDeHorasMinutes >= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {formatMinutesToHours(emp.bancoDeHorasMinutes)}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-amber-600">
                          {totalDelay} min
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* NON-ADMIN EMPLOYEE INDIVIDUAL VIEW */
        <>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <PieIcon className="w-4 h-4 text-emerald-600" /> Índice de Pontualidade
              </h3>

              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieTeamData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieTeamData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

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
        </>
      )}
    </div>
  );
};
