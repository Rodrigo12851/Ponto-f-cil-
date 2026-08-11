export function formatMinutesToHours(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatHoursAndMinutes(minutes: number): string {
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

export function getBrazilianFullDate(date: Date = new Date()): string {
  const dayNames = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const dayOfWeek = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${dayOfWeek}, ${day} de ${month} de ${year}`;
}

export function calculateDayWorkedMinutes(
  punches: { type: string; timestamp: string }[],
  lunchMode: 'AUTOMATICO' | 'MANUAL' = 'AUTOMATICO',
  lunchDurationMinutes: number = 60
): number {
  if (punches.length === 0) return 0;

  // Sort punches by timestamp
  const sorted = [...punches].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const hasManualLunch = sorted.some(
    (p) => p.type === 'PAUSA_ALMOCO' || p.type === 'RETORNO_ALMOCO'
  );

  if (hasManualLunch || lunchMode === 'MANUAL') {
    let totalMinutes = 0;
    let lastInTime: Date | null = null;

    for (const punch of sorted) {
      const time = new Date(punch.timestamp);
      if (punch.type === 'ENTRADA' || punch.type === 'RETORNO_ALMOCO' || punch.type === 'HORA_EXTRA') {
        lastInTime = time;
      } else if (
        (punch.type === 'PAUSA_ALMOCO' || punch.type === 'SAIDA') &&
        lastInTime !== null
      ) {
        const diffMs = time.getTime() - lastInTime.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins > 0) totalMinutes += diffMins;
        lastInTime = null;
      }
    }

    if (lastInTime !== null) {
      const now = new Date();
      if (now.toDateString() === lastInTime.toDateString()) {
        const diffMs = now.getTime() - lastInTime.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins > 0) totalMinutes += diffMins;
      }
    }

    return totalMinutes;
  }

  // Automatic lunch deduction mode (CLT art. 74 §2º)
  const entradaPunch = sorted.find((p) => p.type === 'ENTRADA');
  const salidaPunch = sorted.find((p) => p.type === 'SAIDA');

  if (!entradaPunch) return 0;

  const inTime = new Date(entradaPunch.timestamp);
  const outTime = salidaPunch ? new Date(salidaPunch.timestamp) : new Date();

  const totalElapsedMs = outTime.getTime() - inTime.getTime();
  let totalElapsedMins = Math.floor(totalElapsedMs / (1000 * 60));

  if (totalElapsedMins <= 0) return 0;

  // Deduct automatic lunch break if worked shift spans more than 4 hours
  if (totalElapsedMins > 240) {
    totalElapsedMins = Math.max(0, totalElapsedMins - lunchDurationMinutes);
  }

  return totalElapsedMins;
}

export function getPunchTypeLabel(type: string): string {
  switch (type) {
    case 'ENTRADA':
      return 'Entrada';
    case 'PAUSA_ALMOCO':
      return 'Saída p/ Almoço';
    case 'RETORNO_ALMOCO':
      return 'Retorno do Almoço';
    case 'SAIDA':
      return 'Saída Final';
    case 'HORA_EXTRA':
      return 'Início Hora Extra';
    case 'PONTO_EXTERNO':
      return 'Ponto Externo';
    default:
      return type;
  }
}

export function getPunchTypeBadgeColor(type: string): string {
  switch (type) {
    case 'ENTRADA':
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800';
    case 'PAUSA_ALMOCO':
      return 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800';
    case 'RETORNO_ALMOCO':
      return 'bg-blue-500/15 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800';
    case 'SAIDA':
      return 'bg-rose-500/15 text-rose-700 border-rose-200 dark:text-rose-400 dark:border-rose-800';
    case 'HORA_EXTRA':
      return 'bg-purple-500/15 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800';
    case 'PONTO_EXTERNO':
      return 'bg-teal-500/15 text-teal-700 border-teal-200 dark:text-teal-400 dark:border-teal-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
