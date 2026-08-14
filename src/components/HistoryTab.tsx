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
  Camera,
  User,
  Maximize2,
  Shield,
} from 'lucide-react';
import { FacialAuditLogView } from './FacialAuditLogView';
import { getFacialAuditLogs } from '../utils/facialAuditStorage';

interface HistoryTabProps {
  employee: Employee;
  employees?: Employee[];
  isAdmin?: boolean;
  onSelectEmployee?: (employee: Employee) => void;
  onRequestAdjustment: (dayNumber: number, type: PunchType, time: string, reason: string) => void;
  onOpenEspelhoPrint?: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  employee,
  employees,
  isAdmin,
  onSelectEmployee,
  onRequestAdjustment,
  onOpenEspelhoPrint,
}) => {
  const [historySubView, setHistorySubView] = useState<'PUNCH_HISTORY' | 'FACIAL_AUDIT'>('PUNCH_HISTORY');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(false);
  const [adjDay, setAdjDay] = useState<number>(10);
  const [adjType, setAdjType] = useState<PunchType>('ENTRADA');
  const [adjTime, setAdjTime] = useState<string>('08:00');
  const [adjReason, setAdjReason] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Photo modal state
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; time: string; location?: string } | null>(null);

  // Audit Logs count
  const auditLogs = getFacialAuditLogs();
  const failureCount = auditLogs.filter((l) => l.result === 'FAILURE').length;

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
    <div className="px-4 pb-24 space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in">
          <span>✅ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-view Navigation Switch: Punch History vs Facial Audit Logs */}
      <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-md flex items-center gap-1.5">
        <button
          onClick={() => setHistorySubView('PUNCH_HISTORY')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            historySubView === 'PUNCH_HISTORY'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Registros de Ponto (Diário)</span>
        </button>

        <button
          onClick={() => setHistorySubView('FACIAL_AUDIT')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            historySubView === 'FACIAL_AUDIT'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0 text-indigo-400" />
          <span>Auditoria Facial & Segurança</span>
          {failureCount > 0 && (
            <span className="text-[10px] bg-rose-500 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
              {failureCount}
            </span>
          )}
        </button>
      </div>

      {historySubView === 'FACIAL_AUDIT' ? (
        <FacialAuditLogView
          currentEmployee={employee}
          employees={employees}
          isAdmin={isAdmin}
        />
      ) : (
        <>

      {/* Gestor Employee Selector Header */}
      {isAdmin && employees && employees.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
              <User className="w-3 h-3" /> Seleção de Colaborador (Gestão)
            </span>
            {onOpenEspelhoPrint && (
              <button
                onClick={onOpenEspelhoPrint}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Espelho Ponto
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2 cursor-pointer ${
                  emp.id === employee.id
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <img
                  src={emp.avatar}
                  alt={emp.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{emp.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Summary Cards Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shadow-md"
            />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800">
                Histórico do Mês
              </span>
              <h2 className="text-base font-bold mt-1 text-white">{employee.name}</h2>
              <p className="text-xs text-slate-300">{employee.role} • {employee.department}</p>
            </div>
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

      {/* Request Manual Adjustment Bar - Only for Employee mode, NOT for Manager */}
      {!isAdmin && (
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
      )}

      {/* Daily List Accordion */}
      <div className="space-y-2">
        {employee.days.map((d) => {
          const realToday = new Date().getDate();
          const isToday = d.day === realToday;
          const isFuture = d.day > realToday;
          const isWeekend = d.status === 'FOLGA';
          const isExpanded = expandedDay === d.day;

          // Find Entrada and Saída punches for photo display
          const entradaPunch = d.punches.find((p) => p.type === 'ENTRADA');
          const saidaPunch = d.punches.find((p) => p.type === 'SAIDA');

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
                      isToday
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
                      {isToday && (
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

              {/* Expanded Punches Details with Photos for Entrada and Saída */}
              {isExpanded && !isFuture && (
                <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl space-y-3">
                  {d.punches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Sem registros de ponto para este dia.</p>
                  ) : (
                    <>
                      {/* Entry & Exit Photo Grid Highlight */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Entrada Photo Card */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {entradaPunch?.photoUrl ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPhoto({
                                    url: entradaPunch.photoUrl!,
                                    title: `Foto de ENTRADA - Dia ${d.day} (${employee.name})`,
                                    time: entradaPunch.timeFormatted,
                                    location: entradaPunch.location?.address,
                                  });
                                }}
                                className="relative group cursor-pointer shrink-0"
                              >
                                <img
                                  src={entradaPunch.photoUrl}
                                  alt="Entrada"
                                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 group-hover:brightness-90 transition"
                                />
                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-xl transition text-white">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[9px] shrink-0">
                                <Camera className="w-4 h-4" />
                                <span>Sem Foto</span>
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                Entrada
                              </span>
                              <p className="text-xs font-black text-slate-900 mt-1 font-mono">
                                {entradaPunch ? entradaPunch.timeFormatted : 'Não realizada'}
                              </p>
                              {entradaPunch?.location && (
                                <p className="text-[10px] text-slate-500 truncate flex items-center gap-0.5 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" /> {entradaPunch.location.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Saída Photo Card */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {saidaPunch?.photoUrl ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPhoto({
                                    url: saidaPunch.photoUrl!,
                                    title: `Foto de SAÍDA - Dia ${d.day} (${employee.name})`,
                                    time: saidaPunch.timeFormatted,
                                    location: saidaPunch.location?.address,
                                  });
                                }}
                                className="relative group cursor-pointer shrink-0"
                              >
                                <img
                                  src={saidaPunch.photoUrl}
                                  alt="Saída"
                                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 group-hover:brightness-90 transition"
                                />
                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-xl transition text-white">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[9px] shrink-0">
                                <Camera className="w-4 h-4" />
                                <span>Sem Foto</span>
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                                Saída Final
                              </span>
                              <p className="text-xs font-black text-slate-900 mt-1 font-mono">
                                {saidaPunch ? saidaPunch.timeFormatted : 'Pendente'}
                              </p>
                              {saidaPunch?.location && (
                                <p className="text-[10px] text-slate-500 truncate flex items-center gap-0.5 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" /> {saidaPunch.location.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Full Punch Timeline */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Todas as Marcações do Dia ({d.punches.length}):
                        </span>
                        {d.punches.map((p) => (
                          <div
                            key={p.id}
                            className="bg-white p-2 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {p.photoUrl && (
                                <img
                                  src={p.photoUrl}
                                  alt={p.type}
                                  className="w-6 h-6 rounded-md object-cover cursor-pointer hover:opacity-80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewPhoto({
                                      url: p.photoUrl!,
                                      title: `Foto ${getPunchTypeLabel(p.type)} - Dia ${d.day}`,
                                      time: p.timeFormatted,
                                      location: p.location?.address,
                                    });
                                  }}
                                />
                              )}
                              <div>
                                <span className="font-extrabold text-slate-800">{getPunchTypeLabel(p.type)}:</span>{' '}
                                <span className="font-bold text-blue-600 font-mono">{p.timeFormatted}</span>
                              </div>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Photo Lightbox Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative border border-slate-800 text-white text-center">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-2 pr-8">
              <span>{previewPhoto.title}</span>
            </h3>

            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 my-3 shadow-lg bg-black">
              <img src={previewPhoto.url} alt="Foto de Ponto" className="w-full h-64 object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono text-emerald-400 border border-white/10">
                ⏰ {previewPhoto.time}
              </div>
            </div>

            {previewPhoto.location && (
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> {previewPhoto.location}
              </p>
            )}

            <button
              onClick={() => setPreviewPhoto(null)}
              className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              FECHAR FOTO
            </button>
          </div>
        </div>
      )}

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

            <h3 className="text-base font-bold text-slate-900 mb-1">
              <span>Solicitar Ajuste de Ponto</span>
            </h3>
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
