import React, { useState } from 'react';
import { DayPonto, PunchRecord } from '../types';
import {
  getPunchTypeLabel,
  getPunchTypeBadgeColor,
  formatHoursAndMinutes,
} from '../utils/timeFormatters';
import {
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  X,
  Camera,
  Info,
} from 'lucide-react';

interface PunchListProps {
  dayPonto: DayPonto;
  isToday: boolean;
}

export const PunchList: React.FC<PunchListProps> = ({ dayPonto, isToday }) => {
  const [activePhotoModal, setActivePhotoModal] = useState<PunchRecord | null>(null);

  return (
    <div className="px-4 mb-20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Marcações de {dayPonto.displayDate} {isToday ? '(Hoje)' : ''}
        </h3>
        <span className="text-xs font-semibold text-slate-500">
          Total: {formatHoursAndMinutes(dayPonto.workedMinutes)}
        </span>
      </div>

      {dayPonto.punches.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
            <Info className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">Nenhum ponto registrado neste dia</p>
          <p className="text-xs text-slate-400 mt-1">
            {isToday
              ? 'Clique em "REGISTRAR PONTO" acima para realizar a sua primeira marcação.'
              : 'Sem registros para a data selecionada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {dayPonto.punches.map((punch, index) => (
            <React.Fragment key={punch.id}>
              <div
                className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {/* Index badge */}
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}º
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${getPunchTypeBadgeColor(
                          punch.type
                        )}`}
                      >
                        {getPunchTypeLabel(punch.type)}
                      </span>

                      <span className="text-xs font-bold text-slate-800">
                        {punch.timeFormatted}
                      </span>
                    </div>

                    {punch.location && (
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {punch.location.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Photo Thumbnail */}
                {punch.photoUrl && (
                  <button
                    onClick={() => setActivePhotoModal(punch)}
                    className="relative group shrink-0 cursor-pointer"
                    title="Ver selfie e mapa GPS"
                  >
                    <img
                      src={punch.photoUrl}
                      alt="Biometria"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                  </button>
                )}
              </div>

              {/* Virtual Pre-assigned Lunch Card Inserted After ENTRADA if no manual lunch punch */}
              {punch.type === 'ENTRADA' &&
                !dayPonto.punches.some(
                  (p) => p.type === 'PAUSA_ALMOCO' || p.type === 'RETORNO_ALMOCO'
                ) && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 text-xs flex items-center justify-between gap-2 my-1">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <span className="w-7 h-7 rounded-full bg-amber-200/80 text-amber-900 text-xs flex items-center justify-center shrink-0">
                        🍱
                      </span>
                      <div>
                        <p className="text-xs font-extrabold text-amber-900">
                          Intervalo de Almoço (Pré-assinalado)
                        </p>
                        <p className="text-[10px] text-amber-800 font-medium">
                          12:00 às 13:00 (1h) • Dispensa marcação (Art. 74 §2º CLT)
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-extrabold px-2 py-1 rounded-md shrink-0">
                      ABATIDO AUTOMÁTICO
                    </span>
                  </div>
                )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Selfie and GPS Location Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-4">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Comprovante Biométrico
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">
                {getPunchTypeLabel(activePhotoModal.type)}
              </h3>
              <p className="text-xs text-slate-500">
                Horário: <strong className="text-slate-800">{activePhotoModal.timeFormatted}</strong>
              </p>
            </div>

            <div className="relative rounded-2xl overflow-hidden mb-4 border border-slate-200 shadow-inner">
              <img
                src={activePhotoModal.photoUrl}
                alt="Registro Biométrico"
                className="w-full h-56 object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-slate-900/80 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md backdrop-blur-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Biometria Validada
              </div>
            </div>

            {activePhotoModal.location && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> Endereço do Registro:
                </div>
                <p className="text-slate-600 leading-tight">{activePhotoModal.location.address}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  GPS: {activePhotoModal.location.latitude.toFixed(6)}, {activePhotoModal.location.longitude.toFixed(6)}
                </p>
              </div>
            )}

            <button
              onClick={() => setActivePhotoModal(null)}
              className="w-full mt-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
            >
              Fechar Comprovante
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
