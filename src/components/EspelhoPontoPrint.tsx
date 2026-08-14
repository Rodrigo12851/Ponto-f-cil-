import React from 'react';
import { Employee } from '../types';
import {
  formatMinutesToHours,
  formatHoursAndMinutes,
  getPunchTypeLabel,
} from '../utils/timeFormatters';
import { Printer, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface EspelhoPontoPrintProps {
  employee?: Employee | null;
  onClose: () => void;
}

export const EspelhoPontoPrint: React.FC<EspelhoPontoPrintProps> = ({
  employee,
  onClose,
}) => {
  if (!employee || !employee.days) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center space-y-3 max-w-sm w-full">
          <p className="text-sm font-bold text-slate-800">Nenhum colaborador selecionado para o Espelho de Ponto.</p>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer">Fechar</button>
        </div>
      </div>
    );
  }

  const pastWorkedDays = employee.days.filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO');
  const totalWorkedMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.workedMinutes, 0);
  const totalBalanceMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.balanceMinutes, 0);
  const totalDelayMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.delayMinutes, 0);

  return (
    <div className="espelho-print-wrapper espelho-print-backdrop fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs overflow-y-auto p-1 sm:p-4 md:p-6 animate-in fade-in flex sm:items-center justify-center min-h-screen print:p-0 print:m-0 print:bg-white print:static print:block">
      <div className="espelho-print-paper w-full max-w-4xl my-auto bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 shadow-2xl relative border border-slate-200 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none print:max-w-full print:w-full">
        
        {/* Print / Close Toolbar (hidden during actual window.print) */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-200 print:hidden gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[11px] sm:text-xs font-bold text-blue-700 bg-blue-50 px-2.5 sm:px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Portaria 671 MTP - Autenticado
            </span>
            <span className="text-[10px] text-slate-500 font-semibold hidden md:inline">
              Formato A4 Otimizado para Folha Única
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" /> <span className="hidden xs:inline">IMPRIMIR (FOLHA A4)</span>
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
        <div className="text-center mb-2.5 sm:mb-4 print:mb-1.5">
          <h1 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 print:text-[13pt] print:mb-0.5">
            ESPELHO DE PONTO ELETRÔNICO
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 font-semibold print:text-[8pt]">
            Relatório de Frequência Individual do Colaborador • Mês de Agosto / 2026
          </p>
        </div>

        {/* Employer & Employee Legal Header Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs mb-2.5 sm:mb-3 print:p-2 print:gap-1.5 print:mb-2 print:text-[8pt] print:leading-tight print:bg-slate-50/80">
          <div className="space-y-0.5">
            <p><strong>Empregador:</strong> Ponto Facial Tecnologia S.A.</p>
            <p><strong>CNPJ:</strong> 12.345.678/0001-90</p>
            <p><strong>Endereço:</strong> Av. Paulista, 1000 - Bela Vista, São Paulo - SP</p>
            <p><strong>Período:</strong> 01/08/2026 a 31/08/2026</p>
          </div>

          <div className="space-y-0.5 sm:border-l sm:border-slate-300 sm:pl-3 print:border-l print:border-slate-300 print:pl-2">
            <p><strong>Colaborador:</strong> {employee.name}</p>
            <p><strong>CPF:</strong> {employee.cpf} | <strong>PIS:</strong> {employee.pispasep}</p>
            <p><strong>Cargo:</strong> {employee.role} ({employee.department})</p>
            <p><strong>Admissão:</strong> {employee.admissionDate} | <strong>Jornada:</strong> {employee.workSchedule}</p>
            <p>
              <strong>Carga Legal:</strong> {employee.weeklyTargetHours || 44}h/sem ({employee.dailyTargetHours || 8}h/dia)
              {employee.includesSundays && ' • Dom/Fer. Inclusos'}
            </p>
          </div>
        </div>

        {/* Monthly Attendance Matrix Table */}
        <div className="overflow-x-auto mb-2.5 sm:mb-3 print:mb-1.5 print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border border-slate-900 print:bg-slate-900 print:text-white">
                <th className="p-1 sm:p-1.5 text-center print:py-0.5 print:px-1 print:text-[7.5pt]">Dia</th>
                <th className="p-1 sm:p-1.5 print:py-0.5 print:px-1 print:text-[7.5pt]">Data</th>
                <th className="p-1 sm:p-1.5 print:py-0.5 print:px-1 print:text-[7.5pt]">Entrada 1</th>
                <th className="p-1 sm:p-1.5 print:py-0.5 print:px-1 print:text-[7.5pt]">Saída 1</th>
                <th className="p-1 sm:p-1.5 print:py-0.5 print:px-1 print:text-[7.5pt]">Entrada 2</th>
                <th className="p-1 sm:p-1.5 print:py-0.5 print:px-1 print:text-[7.5pt]">Saída 2</th>
                <th className="p-1 sm:p-1.5 text-center print:py-0.5 print:px-1 print:text-[7.5pt]">Trabalhado</th>
                <th className="p-1 sm:p-1.5 text-center print:py-0.5 print:px-1 print:text-[7.5pt]">Saldo</th>
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
                    <td className="p-1 sm:p-1.5 text-center font-bold print:py-[1.2px] print:px-1 print:text-[7.5pt]">{d.day}</td>
                    <td className="p-1 sm:p-1.5 font-medium print:py-[1.2px] print:px-1 print:text-[7.5pt]">{d.displayDate}</td>
                    <td className="p-1 sm:p-1.5 font-mono print:py-[1.2px] print:px-1 print:text-[7.5pt]">{ent1}</td>
                    <td className="p-1 sm:p-1.5 font-mono text-amber-800 font-semibold print:py-[1.2px] print:px-1 print:text-[7.5pt]">{sai1}</td>
                    <td className="p-1 sm:p-1.5 font-mono text-amber-800 font-semibold print:py-[1.2px] print:px-1 print:text-[7.5pt]">{ent2}</td>
                    <td className="p-1 sm:p-1.5 font-mono print:py-[1.2px] print:px-1 print:text-[7.5pt]">{sai2}</td>
                    <td className="p-1 sm:p-1.5 text-center font-bold text-slate-800 print:py-[1.2px] print:px-1 print:text-[7.5pt]">
                      {d.status === 'FOLGA'
                        ? 'FOLGA'
                        : d.status === 'FUTURO'
                        ? '-'
                        : formatHoursAndMinutes(d.workedMinutes)}
                    </td>
                    <td className="p-1 sm:p-1.5 text-center font-bold print:py-[1.2px] print:px-1 print:text-[7.5pt]">
                      {d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO'
                        ? formatMinutesToHours(d.balanceMinutes)
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[9px] sm:text-[10px] text-amber-800 font-semibold mt-1 print:mt-0.5 print:text-[7pt] print:leading-tight">
            * Horário de intervalo pré-assinalado nos termos do Art. 74, § 2º da CLT e Portaria 671 MTP (dispensa a marcação de ponto de entrada/saída de almoço).
          </p>
        </div>

        {/* Totals & Signatures Block */}
        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs mb-2.5 sm:mb-3 print:p-1.5 print:mb-2 print:text-[7.5pt] print:leading-tight print:bg-slate-50/80">
          <h4 className="font-bold text-slate-900 mb-1 print:mb-0.5">Resumo da Jornada no Mês:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 font-semibold print:gap-1 print:text-[7.5pt]">
            <div>Total Horas Trabalhadas: <strong className="text-blue-700">{formatHoursAndMinutes(totalWorkedMinutes)}</strong></div>
            <div>Atrasos no Mês: <strong className="text-amber-700">{totalDelayMinutes} min</strong></div>
            <div>Saldo Anterior do Banco: <strong>+00:00</strong></div>
            <div>Saldo Atual Acumulado: <strong className="text-emerald-700">{formatMinutesToHours(employee.bancoDeHorasMinutes)}</strong></div>
          </div>
        </div>

        {/* Legal Signatures Block */}
        <div className="pt-3 sm:pt-4 border-t border-slate-300 grid grid-cols-2 gap-4 text-center text-xs print:pt-2 print:gap-4 print:text-[7.5pt] print-no-break">
          <div>
            <div className="border-b border-slate-400 w-36 sm:w-44 mx-auto mb-1 print:w-36 print:mb-0.5"></div>
            <p className="font-bold text-slate-800">{employee.name}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 print:text-[6.5pt]">Assinatura do Colaborador</p>
          </div>

          <div>
            <div className="border-b border-slate-400 w-36 sm:w-44 mx-auto mb-1 print:w-36 print:mb-0.5"></div>
            <p className="font-bold text-slate-800">Departamento de Recursos Humanos</p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 print:text-[6.5pt]">Gestor Responsável / Ponto Facial</p>
          </div>
        </div>

        {/* Digital Stamp Footer */}
        <div className="mt-2 text-center text-[9px] sm:text-[10px] text-slate-400 font-mono print:mt-1 print:text-[6.5pt]">
          Documento gerado eletronicamente com selo de biometria facial e localização GPS em {new Date().toLocaleDateString('pt-BR')}.
        </div>

      </div>
    </div>
  );
};

