import React from 'react';
import { Employee } from '../types';
import {
  formatMinutesToHours,
  formatHoursAndMinutes,
  getPunchTypeLabel,
} from '../utils/timeFormatters';
import { Printer, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface EspelhoPontoPrintProps {
  employee: Employee;
  onClose: () => void;
}

export const EspelhoPontoPrint: React.FC<EspelhoPontoPrintProps> = ({
  employee,
  onClose,
}) => {
  const pastWorkedDays = employee.days.filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO');
  const totalWorkedMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.workedMinutes, 0);
  const totalBalanceMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.balanceMinutes, 0);
  const totalDelayMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.delayMinutes, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs overflow-y-auto p-1 sm:p-4 md:p-8 animate-in fade-in flex sm:items-center justify-center min-h-screen">
      <div className="w-full max-w-5xl my-auto bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-6 md:p-10 shadow-2xl relative border border-slate-200">
        
        {/* Print / Close Toolbar (hidden during actual window.print) */}
        <div className="flex items-center justify-between pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-slate-200 print:hidden gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[11px] sm:text-xs font-bold text-blue-700 bg-blue-50 px-2.5 sm:px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Portaria 671 MTP - Autenticado
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" /> <span className="hidden xs:inline">IMPRIMIR</span> ESPELHO
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
            ESPELHO DE PONTO ELETRÔNICO
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">
            Relatório de Frequência Individual do Colaborador • Mês de Agosto / 2026
          </p>
        </div>

        {/* Employer & Employee Legal Header Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 text-xs mb-4 sm:mb-6">
          <div className="space-y-1">
            <p><strong>Empregador:</strong> Ponto Facial Tecnologia S.A.</p>
            <p><strong>CNPJ:</strong> 12.345.678/0001-90</p>
            <p><strong>Endereço:</strong> Av. Paulista, 1000 - Bela Vista, São Paulo - SP</p>
            <p><strong>Período das Marcações:</strong> 01/08/2026 a 31/08/2026</p>
          </div>

          <div className="space-y-1 md:border-l md:border-slate-300 md:pl-4">
            <p><strong>Colaborador:</strong> {employee.name}</p>
            <p><strong>CPF:</strong> {employee.cpf} | <strong>PIS/PASEP:</strong> {employee.pispasep}</p>
            <p><strong>Cargo:</strong> {employee.role} ({employee.department})</p>
            <p><strong>Admissão:</strong> {employee.admissionDate} | <strong>Jornada ({employee.scheduleType || 'FIXO'}):</strong> {employee.workSchedule}</p>
            <p>
              <strong>Regime de Horas:</strong> Carga Legal de {employee.weeklyTargetHours || 44}h/sem ({employee.dailyTargetHours || 8}h/dia)
              {employee.includesSundays && ' • Domingos/Feriados Inclusos na Escala'}
            </p>
          </div>
        </div>

        {/* Monthly Attendance Matrix Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border border-slate-900">
                <th className="p-2 text-center">Dia</th>
                <th className="p-2">Data</th>
                <th className="p-2">Entrada 1</th>
                <th className="p-2">Saída 1</th>
                <th className="p-2">Entrada 2</th>
                <th className="p-2">Saída 2</th>
                <th className="p-2 text-center">Trabalhado</th>
                <th className="p-2 text-center">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {employee.days.map((d) => {
                const isAutoLunch = (employee.lunchMode || 'AUTOMATICO') === 'AUTOMATICO';
                const hasEntrada = d.punches.some((p) => p.type === 'ENTRADA');

                const ent1 = d.punches.find((p) => p.type === 'ENTRADA')?.timeFormatted || '-';
                let sai1 = d.punches.find((p) => p.type === 'PAUSA_ALMOCO')?.timeFormatted;
                let ent2 = d.punches.find((p) => p.type === 'RETORNO_ALMOCO')?.timeFormatted;
                const sai2 = d.punches.find((p) => p.type === 'SAIDA')?.timeFormatted || '-';

                if (!sai1 && isAutoLunch && hasEntrada) {
                  sai1 = '12:00*';
                } else if (!sai1) {
                  sai1 = '-';
                }

                if (!ent2 && isAutoLunch && hasEntrada) {
                  ent2 = '13:00*';
                } else if (!ent2) {
                  ent2 = '-';
                }

                return (
                  <tr
                    key={d.day}
                    className={`border border-slate-200 ${
                      d.status === 'FOLGA' ? 'bg-rose-50/40 text-rose-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-2 text-center font-bold">{d.day}</td>
                    <td className="p-2 font-medium">{d.displayDate}</td>
                    <td className="p-2 font-mono">{ent1}</td>
                    <td className="p-2 font-mono text-amber-800 font-semibold">{sai1}</td>
                    <td className="p-2 font-mono text-amber-800 font-semibold">{ent2}</td>
                    <td className="p-2 font-mono">{sai2}</td>
                    <td className="p-2 text-center font-bold text-slate-800">
                      {d.status === 'FOLGA'
                        ? 'FOLGA'
                        : d.status === 'FUTURO'
                        ? '-'
                        : formatHoursAndMinutes(d.workedMinutes)}
                    </td>
                    <td className="p-2 text-center font-bold">
                      {d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO'
                        ? formatMinutesToHours(d.balanceMinutes)
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-amber-800 font-semibold mt-2">
            * Horário de intervalo pré-assinalado nos termos do Art. 74, § 2º da CLT e Portaria 671 MTP (dispensa a marcação de ponto de entrada/saída de almoço).
          </p>
        </div>

        {/* Totals & Signatures Block */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs mb-8">
          <h4 className="font-bold text-slate-900 mb-2">Resumo da Jornada no Mês:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700 font-semibold">
            <div>Total Horas Trabalhadas: <strong className="text-blue-700">{formatHoursAndMinutes(totalWorkedMinutes)}</strong></div>
            <div>Atrasos no Mês: <strong className="text-amber-700">{totalDelayMinutes} min</strong></div>
            <div>Saldo Anterior do Banco: <strong>+00:00</strong></div>
            <div>Saldo Atual Acumulado: <strong className="text-emerald-700">{formatMinutesToHours(employee.bancoDeHorasMinutes)}</strong></div>
          </div>
        </div>

        {/* Legal Signatures Block */}
        <div className="pt-10 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
            <p className="font-bold text-slate-800">{employee.name}</p>
            <p className="text-[10px] text-slate-500">Assinatura do Colaborador</p>
          </div>

          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
            <p className="font-bold text-slate-800">Departamento de Recursos Humanos</p>
            <p className="text-[10px] text-slate-500">Gestor Responsável / Ponto Facial</p>
          </div>
        </div>

        {/* Digital Stamp Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-400 font-mono">
          Documento gerado eletronicamente com selo de biometria facial e localização GPS em {new Date().toLocaleDateString('pt-BR')}.
        </div>

      </div>
    </div>
  );
};
