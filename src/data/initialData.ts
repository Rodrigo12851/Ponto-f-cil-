import { Employee, CompanyGeofence, DayPonto } from '../types';
import { DEFAULT_GEOFENCE } from '../utils/geolocation';

const todayObj = new Date();
const CURRENT_DAY = todayObj.getDate();
const currentYear = todayObj.getFullYear();
const currentMonth = todayObj.getMonth(); // 0-based
const monthPad = String(currentMonth + 1).padStart(2, '0');
const CURRENT_MONTH_YEAR = `${currentYear}-${monthPad}`;

interface GenerateEmployeeDaysOptions {
  avatarUrl: string;
  entryBaseHour?: number; // e.g. 8 for 08:00
  entryBaseMinute?: number;
  lunchStartHour?: number; // e.g. 12
  lunchDurationMinutes?: number; // 60 or 90
  dailyDelayChance?: number; // 0 to 1
  overtimeChance?: number; // 0 to 1
  isFlexibleSupermarket?: boolean;
}

function generateDaysForEmployee(
  employeeName: string,
  options: GenerateEmployeeDaysOptions
): DayPonto[] {
  const days: DayPonto[] = [];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const entryHour = options.entryBaseHour ?? 8;
  const entryMin = options.entryBaseMinute ?? 0;
  const lunchHour = options.lunchStartHour ?? 12;
  const lunchDur = options.lunchDurationMinutes ?? 60;
  const avatar = options.avatarUrl;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayPad = String(d).padStart(2, '0');
    const dateStr = `${CURRENT_MONTH_YEAR}-${dayPad}`;
    const displayDate = `${dayPad}/${monthPad}/${currentYear}`;
    const dateObj = new Date(currentYear, currentMonth, d);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
    const isWeekend = options.isFlexibleSupermarket
      ? dayOfWeek === 0 // Sunday only for supermarket
      : dayOfWeek === 0 || dayOfWeek === 6;

    if (d > CURRENT_DAY) {
      days.push({
        day: d,
        dateStr,
        displayDate,
        status: 'FUTURO',
        punches: [],
        expectedHours: isWeekend ? 0 : 8,
        workedMinutes: 0,
        balanceMinutes: 0,
        delayMinutes: 0,
      });
      continue;
    }

    if (isWeekend) {
      days.push({
        day: d,
        dateStr,
        displayDate,
        status: 'FOLGA',
        punches: [],
        expectedHours: 0,
        workedMinutes: 0,
        balanceMinutes: 0,
        delayMinutes: 0,
      });
      continue;
    }

    // Past or Current Day
    if (d === CURRENT_DAY) {
      const todayEntryDelay = (d % 3) * 2;
      const formattedEntryTime = `${String(entryHour).padStart(2, '0')}:${String(entryMin + todayEntryDelay).padStart(2, '0')}:15`;
      days.push({
        day: d,
        dateStr,
        displayDate,
        status: 'EM_ANDAMENTO',
        punches: [
          {
            id: `punch-${d}-1`,
            type: 'ENTRADA',
            timestamp: `${CURRENT_MONTH_YEAR}-${dayPad}T${formattedEntryTime}`,
            timeFormatted: formattedEntryTime,
            photoUrl: avatar,
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 12,
            },
            status: 'APROVADO',
          },
        ],
        expectedHours: 8,
        workedMinutes: 0,
        balanceMinutes: -480,
        delayMinutes: todayEntryDelay,
      });
    } else {
      // Past worked days
      const delayVariation = d % 4 === 0 ? (d % 2 === 0 ? 10 : 15) : 0;
      const extraMinutes = d % 3 === 0 ? 15 : d % 5 === 0 ? -12 : (d % 2 === 0 ? 5 : -5);
      const workedMins = 480 + extraMinutes;
      const balance = workedMins - 480;

      const eHourStr = String(entryHour).padStart(2, '0');
      const eMinStr = String(entryMin + delayVariation).padStart(2, '0');
      const entryFormatted = `${eHourStr}:${eMinStr}:00`;

      const lStartStr = `${String(lunchHour).padStart(2, '0')}:00:00`;
      const lunchEndHour = lunchHour + Math.floor(lunchDur / 60);
      const lunchEndMin = lunchDur % 60;
      const lEndStr = `${String(lunchEndHour).padStart(2, '0')}:${String(lunchEndMin).padStart(2, '0')}:00`;

      // Exit time calculation
      const exitTotalMinutes = entryHour * 60 + (entryMin + delayVariation) + lunchDur + workedMins;
      const exitHour = Math.floor(exitTotalMinutes / 60);
      const exitMin = exitTotalMinutes % 60;
      const exitFormatted = `${String(exitHour).padStart(2, '0')}:${String(exitMin).padStart(2, '0')}:00`;

      days.push({
        day: d,
        dateStr,
        displayDate,
        status: 'TRABALHADO',
        punches: [
          {
            id: `punch-${d}-1`,
            type: 'ENTRADA',
            timestamp: `${CURRENT_MONTH_YEAR}-${dayPad}T${entryFormatted}`,
            timeFormatted: entryFormatted,
            photoUrl: avatar,
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 10 + (d % 8),
            },
            status: 'APROVADO',
          },
          {
            id: `punch-${d}-2`,
            type: 'PAUSA_ALMOCO',
            timestamp: `${CURRENT_MONTH_YEAR}-${dayPad}T${lStartStr}`,
            timeFormatted: lStartStr,
            photoUrl: avatar,
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 12 + (d % 6),
            },
            status: 'APROVADO',
          },
          {
            id: `punch-${d}-3`,
            type: 'RETORNO_ALMOCO',
            timestamp: `${CURRENT_MONTH_YEAR}-${dayPad}T${lEndStr}`,
            timeFormatted: lEndStr,
            photoUrl: avatar,
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 14 + (d % 5),
            },
            status: 'APROVADO',
          },
          {
            id: `punch-${d}-4`,
            type: 'SAIDA',
            timestamp: `${CURRENT_MONTH_YEAR}-${dayPad}T${exitFormatted}`,
            timeFormatted: exitFormatted,
            photoUrl: avatar,
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 11 + (d % 7),
            },
            status: 'APROVADO',
          },
        ],
        expectedHours: 8,
        workedMinutes: workedMins,
        balanceMinutes: balance,
        delayMinutes: delayVariation,
      });
    }
  }

  return days;
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Rodrigo dos Santos Souza',
    role: 'Desenvolvedor Front-End',
    department: 'Tecnologia & Operações',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    email: 'rodrigo.souza@empresa.com.br',
    cpf: '123.456.789-00',
    pispasep: '123.45678.90-1',
    admissionDate: '15/01/2023',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    scheduleType: 'FIXO',
    includesSundays: false,
    dailyTargetHours: 8,
    weeklyTargetHours: 44,
    bankModeEnabled: true,
    isOnline: true,
    lastPunchType: 'ENTRADA',
    lastPunchTime: '08:02:15',
    days: generateDaysForEmployee('Rodrigo dos Santos Souza', {
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      entryBaseHour: 8,
      entryBaseMinute: 0,
      lunchStartHour: 12,
      lunchDurationMinutes: 60,
    }),
    bancoDeHorasMinutes: 113, // +01:53 accumulated bank of hours
    lunchMode: 'AUTOMATICO',
    lunchDurationMinutes: 60,
    lunchScheduledTime: '12:00 às 13:00',
  },
  {
    id: 'emp-2',
    name: 'Marcos de Oliveira',
    role: 'Operador de Caixa / Repositor',
    department: 'Supermercado',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    email: 'marcos.oliveira@supermercado.com.br',
    cpf: '567.890.123-44',
    pispasep: '567.89012.34-5',
    admissionDate: '01/03/2024',
    workSchedule: 'Flexível Supermercado (Entrada 08:00h ou 13:00h - Domingos Inclusos)',
    scheduleType: 'FLEXIVEL',
    includesSundays: true,
    dailyTargetHours: 8,
    weeklyTargetHours: 44,
    bankModeEnabled: true,
    isOnline: true,
    lastPunchType: 'ENTRADA',
    lastPunchTime: '08:00:00',
    days: generateDaysForEmployee('Marcos de Oliveira', {
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      entryBaseHour: 8,
      entryBaseMinute: 0,
      lunchStartHour: 12,
      lunchDurationMinutes: 60,
      isFlexibleSupermarket: true,
    }),
    bancoDeHorasMinutes: -90, // -01:30 (débito de horas por saída antecipada/escala)
    lunchMode: 'MANUAL',
    lunchDurationMinutes: 60,
    lunchScheduledTime: '12:00 às 13:00',
  },
  {
    id: 'emp-3',
    name: 'Maria Santos',
    role: 'Coordenadora de RH (Gestora)',
    department: 'Gestão / Recursos Humanos',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    email: 'maria.santos@empresa.com.br',
    cpf: '234.567.890-11',
    pispasep: '234.56789.01-2',
    admissionDate: '10/06/2022',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    scheduleType: 'FIXO',
    includesSundays: false,
    dailyTargetHours: 8,
    weeklyTargetHours: 44,
    bankModeEnabled: true,
    isOnline: true,
    lastPunchType: 'RETORNO_ALMOCO',
    lastPunchTime: '13:05:00',
    days: generateDaysForEmployee('Maria Santos', {
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      entryBaseHour: 8,
      entryBaseMinute: 0,
      lunchStartHour: 12,
      lunchDurationMinutes: 60,
    }),
    bancoDeHorasMinutes: 240, // +04:00 accumulated bank
    lunchMode: 'AUTOMATICO',
    lunchDurationMinutes: 60,
    lunchScheduledTime: '12:00 às 13:00',
  },
  {
    id: 'emp-4',
    name: 'Carlos Eduardo',
    role: 'Gerente Comercial',
    department: 'Vendas',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    email: 'carlos.eduardo@empresa.com.br',
    cpf: '345.678.901-22',
    pispasep: '345.67890.12-3',
    admissionDate: '01/02/2021',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    scheduleType: 'FIXO',
    includesSundays: false,
    dailyTargetHours: 8,
    weeklyTargetHours: 44,
    bankModeEnabled: true,
    isOnline: false,
    lastPunchType: 'PAUSA_ALMOCO',
    lastPunchTime: '12:15:00',
    days: generateDaysForEmployee('Carlos Eduardo', {
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      entryBaseHour: 8,
      entryBaseMinute: 5,
      lunchStartHour: 12,
      lunchDurationMinutes: 60,
    }),
    bancoDeHorasMinutes: -30, // -00:30 accumulated
    lunchMode: 'MANUAL',
    lunchDurationMinutes: 60,
    lunchScheduledTime: '12:00 às 13:00',
  },
  {
    id: 'emp-5',
    name: 'Ana Costa',
    role: 'Designer UX/UI',
    department: 'Design',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    email: 'ana.costa@empresa.com.br',
    cpf: '456.789.012-33',
    pispasep: '456.78901.23-4',
    admissionDate: '20/08/2023',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    scheduleType: 'FIXO',
    includesSundays: false,
    dailyTargetHours: 8,
    weeklyTargetHours: 44,
    bankModeEnabled: true,
    isOnline: true,
    lastPunchType: 'ENTRADA',
    lastPunchTime: '08:10:00',
    days: generateDaysForEmployee('Ana Costa', {
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
      entryBaseHour: 8,
      entryBaseMinute: 10,
      lunchStartHour: 12,
      lunchDurationMinutes: 90,
    }),
    bancoDeHorasMinutes: 45, // +00:45
    lunchMode: 'AUTOMATICO',
    lunchDurationMinutes: 90,
    lunchScheduledTime: '12:00 às 13:30',
  },
];
