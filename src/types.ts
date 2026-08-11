export type PunchType = 'ENTRADA' | 'PAUSA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA' | 'HORA_EXTRA' | 'PONTO_EXTERNO';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  inGeofence: boolean;
  distanceMeters?: number;
}

export interface PunchRecord {
  id: string;
  type: PunchType;
  timestamp: string; // ISO string or HH:mm
  timeFormatted: string; // HH:MM:SS
  photoUrl?: string;
  location?: LocationData;
  isManual?: boolean;
  notes?: string;
  status: 'APROVADO' | 'PENDENTE' | 'REJEITADO';
}

export interface DayPonto {
  day: number;
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // DD/MM/YYYY
  status: 'TRABALHADO' | 'FOLGA' | 'FALTA' | 'FERIADO' | 'EM_ANDAMENTO' | 'FUTURO';
  punches: PunchRecord[];
  expectedHours: number; // e.g. 8
  workedMinutes: number; // calculated worked minutes
  balanceMinutes: number; // worked - expected (+/- minutes)
  delayMinutes: number;
  notes?: string;
}

export type LunchMode = 'AUTOMATICO' | 'MANUAL';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
  cpf: string;
  pispasep: string;
  admissionDate: string;
  workSchedule: string; // e.g., "08:00 - 17:00 (Seg a Sex)"
  dailyTargetHours: number; // e.g., 8
  isOnline: boolean;
  lastPunchType?: PunchType;
  lastPunchTime?: string;
  days: DayPonto[];
  bancoDeHorasMinutes: number; // Accumulated bank of hours in minutes
  lunchMode?: LunchMode; // 'AUTOMATICO' (Pré-assinalado / dispensa marcação) vs 'MANUAL'
  lunchDurationMinutes?: number; // 60 (1h), 90 (1.5h), 120 (2h)
  lunchScheduledTime?: string; // e.g. "12:00 às 13:00"
}

export interface Point2D {
  lat: number;
  lng: number;
  label?: string;
}

export interface GeofenceSquarePerimeter {
  northLat: number;
  southLat: number;
  eastLng: number;
  westLng: number;
  widthMeters: number;
  heightMeters: number;
  points?: Point2D[];
}

export interface CompanyGeofence {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  shapeType?: 'SQUARE' | 'RADIUS';
  squarePerimeter?: GeofenceSquarePerimeter;
  customPoints?: Point2D[];
  enforceGeofence?: boolean;
}

export type ActiveTab = 'inicio' | 'historico' | 'relatorios' | 'admin' | 'espelho';
