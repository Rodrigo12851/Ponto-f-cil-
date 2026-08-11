import { Employee, CompanyGeofence, DayPonto } from '../types';
import { DEFAULT_GEOFENCE } from '../utils/geolocation';

const CURRENT_DAY = 10;
const CURRENT_MONTH_YEAR = '2026-08';

function generateDaysForEmployee(employeeName: string): DayPonto[] {
  const days: DayPonto[] = [];

  for (let d = 1; d <= 31; d++) {
    const dayPad = String(d).padStart(2, '0');
    const dateStr = `${CURRENT_MONTH_YEAR}-${dayPad}`;
    const displayDate = `${dayPad}/08/2026`;
    const dateObj = new Date(2026, 7, d);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

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
      // Today punches
      days.push({
        day: d,
        dateStr,
        displayDate,
        status: 'EM_ANDAMENTO',
        punches: [
          {
            id: `punch-${d}-1`,
            type: 'ENTRADA',
            timestamp: `2026-08-10T08:02:15`,
            timeFormatted: '08:02:15',
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
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
        delayMinutes: 2,
      });
    } else {
      // Past worked days (Days 1 to 9)
      const workedMins = 480 + (d % 3 === 0 ? 15 : d % 2 === 0 ? -10 : 5); // 8h +/- a few mins
      const balance = workedMins - 480;
      const delay = d % 4 === 0 ? 12 : 0;

      days.push({
        day: d,
        dateStr,
        displayDate,
        status: 'TRABALHADO',
        punches: [
          {
            id: `punch-${d}-1`,
            type: 'ENTRADA',
            timestamp: `2026-08-${dayPad}T08:00:00`,
            timeFormatted: '08:00:00',
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 10,
            },
            status: 'APROVADO',
          },
          {
            id: `punch-${d}-2`,
            type: 'PAUSA_ALMOCO',
            timestamp: `2026-08-${dayPad}T12:00:00`,
            timeFormatted: '12:00:00',
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 15,
            },
            status: 'APROVADO',
          },
          {
            id: `punch-${d}-3`,
            type: 'RETORNO_ALMOCO',
            timestamp: `2026-08-${dayPad}T13:00:00`,
            timeFormatted: '13:00:00',
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
            location: {
              latitude: DEFAULT_GEOFENCE.latitude,
              longitude: DEFAULT_GEOFENCE.longitude,
              address: DEFAULT_GEOFENCE.address,
              inGeofence: true,
              distanceMeters: 20,
            },
            status: 'APROVADO',
          },
          {
            id: `punch-${d}-4`,
            type: 'SAIDA',
            timestamp: `2026-08-${dayPad}T17:${String(balance > 0 ? balance : 0).padStart(2, '0')}:00`,
            timeFormatted: `17:${String(balance > 0 ? balance : 0).padStart(2, '0')}:00`,
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
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
        workedMinutes: workedMins,
        balanceMinutes: balance,
        delayMinutes: delay,
      });
    }
  }

  return days;
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'João da Silva',
    role: 'Desenvolvedor Front-End',
    department: 'Tecnologia',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    email: 'joao.silva@empresa.com.br',
    cpf: '123.456.789-00',
    pispasep: '123.45678.90-1',
    admissionDate: '15/01/2023',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    dailyTargetHours: 8,
    isOnline: true,
    lastPunchType: 'ENTRADA',
    lastPunchTime: '08:02:15',
    days: generateDaysForEmployee('João da Silva'),
    bancoDeHorasMinutes: 113, // +01:53 accumulated bank of hours
    lunchMode: 'AUTOMATICO',
    lunchDurationMinutes: 60,
    lunchScheduledTime: '12:00 às 13:00',
  },
  {
    id: 'emp-2',
    name: 'Maria Santos',
    role: 'Analista de RH Pleno',
    department: 'Recursos Humanos',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    email: 'maria.santos@empresa.com.br',
    cpf: '234.567.890-11',
    pispasep: '234.56789.01-2',
    admissionDate: '10/06/2022',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    dailyTargetHours: 8,
    isOnline: true,
    lastPunchType: 'RETORNO_ALMOCO',
    lastPunchTime: '13:05:00',
    days: generateDaysForEmployee('Maria Santos'),
    bancoDeHorasMinutes: 240, // +04:00 accumulated bank
    lunchMode: 'AUTOMATICO',
    lunchDurationMinutes: 60,
    lunchScheduledTime: '12:00 às 13:00',
  },
  {
    id: 'emp-3',
    name: 'Carlos Eduardo',
    role: 'Gerente Comercial',
    department: 'Vendas',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    email: 'carlos.eduardo@empresa.com.br',
    cpf: '345.678.901-22',
    pispasep: '345.67890.12-3',
    admissionDate: '01/02/2021',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    dailyTargetHours: 8,
    isOnline: false,
    lastPunchType: 'PAUSA_ALMOCO',
    lastPunchTime: '12:15:00',
    days: generateDaysForEmployee('Carlos Eduardo'),
    bancoDeHorasMinutes: -30, // -00:30 accumulated
    lunchMode: 'MANUAL',
    lunchDurationMinutes: 60,
    lunchScheduledTime: '12:00 às 13:00',
  },
  {
    id: 'emp-4',
    name: 'Ana Costa',
    role: 'Designer UX/UI',
    department: 'Design',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    email: 'ana.costa@empresa.com.br',
    cpf: '456.789.012-33',
    pispasep: '456.78901.23-4',
    admissionDate: '20/08/2023',
    workSchedule: '08:00 às 17:00 (Seg a Sex)',
    dailyTargetHours: 8,
    isOnline: true,
    lastPunchType: 'ENTRADA',
    lastPunchTime: '08:10:00',
    days: generateDaysForEmployee('Ana Costa'),
    bancoDeHorasMinutes: 45, // +00:45
    lunchMode: 'AUTOMATICO',
    lunchDurationMinutes: 90,
    lunchScheduledTime: '12:00 às 13:30',
  },
];
