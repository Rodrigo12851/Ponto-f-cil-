import React, { useState } from 'react';
import { Employee, DayPonto, PunchType } from '../types';
import {
  formatMinutesToHours,
  formatHoursAndMinutes,
  getPunchTypeLabel,
} from '../utils/timeFormatters';
import {
  Calendar,
  Clock,
  PlusCircle,
  Printer,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle,
  AlertCircle,
  Send,
  X,
} from 'lucide-react';

interface HistoryTabProps {
  employee: Employee;
  onRequestAdjustment: (dayNumber: number, type: PunchType, time: string, reason: string) => void;
  onOpenEspelhoPrint?: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  employee,
  onRequestAdjustment,
}) => {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(false);
  const [adjDay, setAdjDay] = useState<number>(10);
  const [adjType, setAdjType] = useState<PunchType>('ENTRADA');
  const [adjTime, setAdjTime] = useState<string>('08:00');
  const [adjReason, setAdjReason] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Month Statistics
  const pastWorkedDays = employee.days.filter((d) => d.status === 'TRABALHADO' || d.status === 'EM_ANDAMENTO');
  const totalWorkedMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.workedMinutes, 0);
  const totalBalanceMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.balanceMinutes, 0);
  const totalDelayMinutes = pastWorkedDays.reduce((acc, curr) => acc + curr.delayMinutes, 0);

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) return;

    onRequestAdjustment(adjDay, adjType, adjTime, adjReason);
    setShowAdjustmentModal(false);
    setAdjReason('');
    setToastMessage('Solicitação de ajuste enviada ao gestor para aprovação!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="px-4 pb-24">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in">
          <span>✅ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Monthly Summary Cards Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-5 text-white mb-5 shadow-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800">
              Resumo do Mês
            </span>
            <h2 className="text-base font-bold mt-1">Histórico de Ponto • Agosto 2026</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-400 font-semibold">Total Trabalhado</p>
            <p className="text-sm font-extrabold text-blue-300 mt-0.5">
              {formatHoursAndMinutes(totalWorkedMinutes)}
            </p>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-400 font-semibold">Saldo de Horas</p>
            <p className={`text-sm font-extrabold mt-0.5 ${totalBalanceMinutes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatMinutesToHours(totalBalanceMinutes)}
            </p>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-400 font-semibold">Atrasos Acumulados</p>
            <p className="text-sm font-extrabold text-amber-400 mt-0.5">
              {totalDelayMinutes} min
            </p>
          </div>
        </div>
      </div>

      {/* Request Manual Adjustment Bar */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200/80 rounded-2xl p-3.5 mb-4">
        <div>
          <h4 className="text-xs font-bold text-blue-900">Esqueceu de bater o ponto?</h4>
          <p className="text-[11px] text-blue-700">Solicite um ajuste manual ao gestor com justificativa.</p>
        </div>
        <button
          onClick={() => setShowAdjustmentModal(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Pedir Ajuste
        </button>
      </div>

      {/* Daily List Accordion */}
      <div className="space-y-2">
        {employee.days.map((d) => {
          const isFuture = d.status === 'FUTURO';
          const isWeekend = d.status === 'FOLGA';
          const isExpanded = expandedDay === d.day;

          return (
            <div
              key={d.day}
              className={`rounded-2xl border transition-all ${
                isFuture
                  ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                  : isWeekend
                  ? 'bg-rose-50/40 border-rose-100'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div
                onClick={() => !isFuture && setExpandedDay(isExpanded ? null : d.day)}
                className={`p-3.5 flex items-center justify-between cursor-pointer select-none`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl font-bold text-xs flex flex-col items-center justify-center border ${
                      d.day === 10
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isWeekend
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-[9px] uppercase leading-tight">Dia</span>
                    <span className="text-sm font-extrabold leading-tight">{d.day}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{d.displayDate}</span>
                      {d.day === 10 && (
                        <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-md">
                          Hoje
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isFuture
                        ? 'Futuro'
                        : isWeekend
                        ? 'Folga / Fim de Semana'
                        : `Trabalhado: ${formatHoursAndMinutes(d.workedMinutes)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isFuture && !isWeekend && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        d.balanceMinutes >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {formatMinutesToHours(d.balanceMinutes)}
                    </span>
                  )}

                  {!isFuture && (
                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Punches Details */}
              {isExpanded && !isFuture && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                  {d.punches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Sem registros para este dia.</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {d.punches.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-extrabold text-slate-800">{getPunchTypeLabel(p.type)}:</span>{' '}
                            <span className="font-bold text-blue-600">{p.timeFormatted}</span>
                            {p.location && (
                              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" /> {p.location.address}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowAdjustmentModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">Solicitar Ajuste de Ponto</h3>
            <p className="text-xs text-slate-500 mb-4">
              Informe a data, tipo de marcação e motivo do esquecimento.
            </p>

            <form onSubmit={handleSubmitAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dia do Mês (Agosto 2026):</label>
                <select
                  value={adjDay}
                  onChange={(e) => setAdjDay(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                >
                  {employee.days
                    .filter((d) => d.day <= 10)
                    .map((d) => (
                      <option key={d.day} value={d.day}>
                        Dia {d.day} ({d.displayDate})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Ponto:</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as PunchType)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="PAUSA_ALMOCO">Saída Almoço</option>
                    <option value="RETORNO_ALMOCO">Retorno Almoço</option>
                    <option value="SAIDA">Saída Final</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horário Real:</label>
                  <input
                    type="time"
                    value={adjTime}
                    onChange={(e) => setAdjTime(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justificativa do Pedido:</label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Ex: Problema no aplicativo ou esquecimento ao iniciar expediente..."
                  rows={3}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" /> ENVIAR PEDIDO AO GESTOR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
