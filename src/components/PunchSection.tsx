import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Camera, AlertTriangle, CheckCircle2, Navigation, Sparkles, Info, ShieldAlert, Crosshair, Map as MapIcon } from 'lucide-react';
import { Employee, LocationData, PunchType, CompanyGeofence } from '../types';
import { formatMinutesToHours, formatHoursAndMinutes, getPunchTypeLabel } from '../utils/timeFormatters';
import { LiveLocationMapModal } from './LiveLocationMapModal';

interface PunchSectionProps {
  employee: Employee;
  location: LocationData;
  geofence?: CompanyGeofence;
  onOpenCamera: (type: PunchType) => void;
  onDirectPunch?: (type: PunchType) => void;
  onRefreshLocation: () => void;
  onUpdateGeofence?: (updatedGeofence: CompanyGeofence) => void;
}

export const PunchSection: React.FC<PunchSectionProps> = ({
  employee,
  location,
  geofence,
  onOpenCamera,
  onDirectPunch,
  onRefreshLocation,
  onUpdateGeofence,
}) => {
  const [time, setTime] = useState({
    hhmm: '00:00',
    ss: '00',
  });
  const [selectedPunchType, setSelectedPunchType] = useState<PunchType>('ENTRADA');
  const [geofenceBlockAlert, setGeofenceBlockAlert] = useState<boolean>(false);
  const [showLiveMapModal, setShowLiveMapModal] = useState<boolean>(false);

  // Live timer update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setTime({ hhmm: `${hh}:${mm}`, ss });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const employeeDays = employee?.days || [];
  const todayPonto = employeeDays.find((d) => d.day === 10) || employeeDays[0];
  const workedMinutesToday = todayPonto?.workedMinutes || 0;
  const delayMinutesToday = todayPonto?.delayMinutes || 0;

  const punches = todayPonto?.punches || [];
  const entradaPunch = punches.find((p) => p.type === 'ENTRADA');
  const saidaPunch = punches.find((p) => p.type === 'SAIDA');

  const hasEntradaToday = !!entradaPunch;
  const hasSaidaToday = !!saidaPunch;

  // Determine smart default punch type based on today's recorded punches
  useEffect(() => {
    if (hasEntradaToday && !hasSaidaToday) {
      setSelectedPunchType('SAIDA');
    } else if (!hasEntradaToday) {
      setSelectedPunchType('ENTRADA');
    } else {
      setSelectedPunchType('SAIDA');
    }
  }, [hasEntradaToday, hasSaidaToday]);

  const handleRegisterClick = () => {
    if (selectedPunchType === 'ENTRADA' && hasEntradaToday) {
      return; // Block duplicate entrada
    }
    if (selectedPunchType === 'SAIDA' && hasSaidaToday) {
      return; // Block duplicate saída
    }

    if (geofence?.enforceGeofence && !location.inGeofence) {
      setGeofenceBlockAlert(true);
      return;
    }

    onOpenCamera(selectedPunchType);
  };

  return (
    <div className="px-4 mb-6">
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl shadow-slate-200/60 border border-slate-100/80">
        
        {/* Live Digital Clock */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded-full mb-2">
            <Clock className="w-3.5 h-3.5" /> Horário Oficial de Brasília
          </div>
          <div className="flex items-baseline justify-center font-extrabold text-slate-900 tracking-tight leading-none">
            <span className="text-5xl sm:text-6xl">{time.hhmm}</span>
            <span className="text-2xl sm:text-3xl text-slate-400 font-semibold ml-1">:{time.ss}</span>
          </div>
        </div>

        {/* Today Punch Status Banner */}
        {hasEntradaToday && !hasSaidaToday && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-2.5 mb-3 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Entrada registrada às <strong>{entradaPunch?.timeFormatted}</strong>. Selecionada automaticamente a <strong>Saída Final</strong>.
            </span>
          </div>
        )}
        {hasEntradaToday && hasSaidaToday && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-2.5 mb-3 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Jornada de hoje concluída! (Entrada: {entradaPunch?.timeFormatted} | Saída: {saidaPunch?.timeFormatted})
            </span>
          </div>
        )}

        {/* Punch Type Selector (Only 1ª Entrada and Saída Final) */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 mb-2 text-center">
            Selecione a Marcação:
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <button
              type="button"
              disabled={hasEntradaToday}
              onClick={() => setSelectedPunchType('ENTRADA')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all border text-center flex flex-col items-center justify-center gap-0.5 ${
                hasEntradaToday
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
                  : selectedPunchType === 'ENTRADA'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02] cursor-pointer'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              <span>1ª Entrada</span>
              {hasEntradaToday ? (
                <span className="text-[10px] text-emerald-600 font-bold">✔ Batida ({entradaPunch?.timeFormatted})</span>
              ) : (
                <span className="text-[10px] font-normal opacity-80">Início Expediente</span>
              )}
            </button>

            <button
              type="button"
              disabled={!hasEntradaToday || hasSaidaToday}
              onClick={() => setSelectedPunchType('SAIDA')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all border text-center flex flex-col items-center justify-center gap-0.5 ${
                hasSaidaToday
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
                  : !hasEntradaToday
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                  : selectedPunchType === 'SAIDA'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02] cursor-pointer'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              <span>Saída Final</span>
              {hasSaidaToday ? (
                <span className="text-[10px] text-emerald-600 font-bold">✔ Batida ({saidaPunch?.timeFormatted})</span>
              ) : !hasEntradaToday ? (
                <span className="text-[10px] text-amber-600 font-medium">Requer Entrada</span>
              ) : (
                <span className="text-[10px] font-normal opacity-80">Fim Expediente</span>
              )}
            </button>
          </div>
        </div>

        {/* Big Punch Action Button */}
        {hasEntradaToday && hasSaidaToday ? (
          <div className="w-full py-4 px-6 bg-slate-200 text-slate-600 font-extrabold text-xs sm:text-sm rounded-2xl border border-slate-300 text-center flex items-center justify-center gap-2 mb-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>PONTOS DE HOJE JÁ FORAM REGISTRADOS (CONCLUÍDO)</span>
          </div>
        ) : selectedPunchType === 'ENTRADA' && hasEntradaToday ? (
          <div className="w-full py-4 px-6 bg-amber-50 text-amber-800 font-bold text-xs sm:text-sm rounded-2xl border border-amber-200 text-center flex items-center justify-center gap-2 mb-5">
            <Info className="w-5 h-5 text-amber-600" />
            <span>ENTRADA JÁ BATIDA! SELECIONADA A SAÍDA FINAL PARA O PRÓXIMO PONTO.</span>
          </div>
        ) : selectedPunchType === 'SAIDA' && !hasEntradaToday ? (
          <div className="w-full py-4 px-6 bg-amber-50 text-amber-800 font-bold text-xs sm:text-sm rounded-2xl border border-amber-200 text-center flex items-center justify-center gap-2 mb-5">
            <Info className="w-5 h-5 text-amber-600" />
            <span>BATA A 1ª ENTRADA ANTES DE REGISTRAR A SAÍDA FINAL.</span>
          </div>
        ) : (
          <button
            onClick={handleRegisterClick}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group mb-5"
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span>BATER {getPunchTypeLabel(selectedPunchType).toUpperCase()} (COM CÂMERA)</span>
          </button>
        )}

        {/* Geolocation Info Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 mb-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100/80 text-blue-700 mt-0.5 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    Sua Localização GPS
                  </span>
                  {location.inGeofence ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sede da Empresa (Cerca OK)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Ponto Externo ({location.distanceMeters || 0}m)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium leading-tight">
                  {location.address}
                </p>
                <button
                  type="button"
                  onClick={() => setShowLiveMapModal(true)}
                  className="mt-2 text-[11px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  <MapIcon className="w-3.5 h-3.5 text-blue-600" /> Ver Ponto Azul no Mapa
                </button>
              </div>
            </div>

            <button
              onClick={onRefreshLocation}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition shrink-0 cursor-pointer"
              title="Atualizar GPS"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Today Quick Stats - Fixed card boundaries & text wrapping */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-emerald-50/70 border border-emerald-100 p-2 sm:p-3 rounded-2xl text-center flex flex-col justify-between overflow-hidden">
            <p className="text-[9px] sm:text-[10px] uppercase font-extrabold text-emerald-800 leading-tight break-words">
              Banco de Horas
            </p>
            <p className="text-xs sm:text-base font-extrabold text-emerald-700 mt-1 truncate">
              {formatMinutesToHours(employee.bancoDeHorasMinutes)}
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 p-2 sm:p-3 rounded-2xl text-center flex flex-col justify-between overflow-hidden">
            <p className="text-[9px] sm:text-[10px] uppercase font-extrabold text-amber-800 leading-tight break-words">
              Atrasos Hoje
            </p>
            <p className="text-xs sm:text-base font-extrabold text-amber-700 mt-1 truncate">
              {delayMinutesToday > 0 ? `${delayMinutesToday} min` : '00:00'}
            </p>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 p-2 sm:p-3 rounded-2xl text-center flex flex-col justify-between overflow-hidden">
            <p className="text-[9px] sm:text-[10px] uppercase font-extrabold text-blue-800 leading-tight break-words">
              Horas Trabalhadas
            </p>
            <p className="text-xs sm:text-base font-extrabold text-blue-700 mt-1 truncate">
              {formatHoursAndMinutes(workedMinutesToday)}
            </p>
          </div>
        </div>

      </div>

      {/* Geofence Enforcement Warning Modal */}
      {geofenceBlockAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl relative border border-rose-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Registro de Ponto Bloqueado
            </h3>
            <p className="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
              O administrador configurou o sistema para aceitar bate-ponto <strong>exclusivamente dentro do terreno da empresa</strong>. Sua localização GPS atual está fora da área delimitada ({location.distanceMeters || 0}m de distância).
            </p>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-left text-xs font-semibold text-amber-900 mb-4">
              <p className="font-bold flex items-center gap-1 text-amber-800 mb-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> Como proceder:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                <li>Aproxime-se da sede da empresa.</li>
                <li>Ative e permita a permissão de GPS no seu navegador.</li>
                <li>Clique em "Atualizar GPS" e tente novamente.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setGeofenceBlockAlert(false);
                  setShowLiveMapModal(true);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <MapIcon className="w-4 h-4" /> VER MINHA POSIÇÃO NO MAPA (PONTO AZUL)
              </button>

              <button
                type="button"
                onClick={() => {
                  onRefreshLocation();
                  setGeofenceBlockAlert(false);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Crosshair className="w-4 h-4" /> ATUALIZAR GPS E REVALIDAR
              </button>

              <button
                type="button"
                onClick={() => setGeofenceBlockAlert(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Entendi / Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Live Map Modal */}
      {showLiveMapModal && geofence && (
        <LiveLocationMapModal
          location={location}
          geofence={geofence}
          onClose={() => setShowLiveMapModal(false)}
          onUpdateGeofence={onUpdateGeofence}
          onDirectPunch={() => {
            if (onDirectPunch) {
              onDirectPunch(selectedPunchType);
            }
          }}
        />
      )}
    </div>
  );
};
