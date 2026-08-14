export type PunchType = 'ENTRADA' | 'PAUSA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA' | 'HORA_EXTRA' | 'PONTO_EXTERNO';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  inGeofence: boolean;
  distanceMeters?: number;
  wifiConnected?: boolean;
  connectedSsid?: string;
  wifiValidated?: boolean;
  isTrustedWifi?: boolean;
  trustedWifiName?: string;
}

export interface PunchRecord {
  id: string;
  type: PunchType;
  timestamp: string; // ISO string or HH:mm
  timeFormatted: string; // HH:MM:SS
  photoUrl?: string;
  photos?: string[];
  verificationDetails?: {
    method?: string;
    confidenceScore?: number;
    livenessPassed?: boolean;
    [key: string]: any;
  };
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
  adjustmentRequests?: Array<{
    id: string;
    originalTime: string;
    correctedTime: string;
    reason: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
    requestDate: string;
  }>;
}

export type LunchMode = 'AUTOMATICO' | 'MANUAL';
export type ScheduleType = 'FIXO' | 'FLEXIVEL' | 'ESCALA_6X1' | 'ESCALA_12X36';

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
  workSchedule: string; // e.g., "08:00 às 17:00 (Seg a Sex)" or "Escala Flexível Supermercado (08h às 17h / 13h às 22h)"
  scheduleType?: ScheduleType;
  includesSundays?: boolean;
  weeklyTargetHours?: number; // e.g., 44
  dailyTargetHours: number; // e.g., 8
  bankModeEnabled?: boolean; // Banco de Horas (saldo +/-)
  isOnline: boolean;
  lastPunchType?: PunchType;
  lastPunchTime?: string;
  days: DayPonto[];
  bancoDeHorasMinutes: number; // Accumulated bank of hours in minutes
  lunchMode?: LunchMode; // 'AUTOMATICO' (Pré-assinalado / dispensa marcação) vs 'MANUAL'
  lunchDurationMinutes?: number; // 60 (1h), 90 (1.5h), 120 (2h)
  lunchScheduledTime?: string; // e.g. "12:00 às 13:00"
  allowPersonalPunch?: boolean; // Permite bater ponto no celular pessoal (se false, apenas no tablet)
  facialPhotos?: string[]; // 3 fotos faciais de referência para o tablet
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
  wifiEnabled?: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
  trustedWifiEnabled?: boolean;
  trustedWifiSsid?: string;
  trustedWifiSsids?: string[];
}

export interface ManagerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName: string;
  password: string; // Senha de acesso do gestor
  roleLabel: string; // Ex: "Gerente Geral", "Coordenador de RH"
  status: 'ATIVO' | 'BLOQUEADO';
  createdAt: string;
}

export interface OwnerSettings {
  ownerName: string;
  ownerEmail: string;
  companyName: string;
  masterPassword: string; // Senha Mestra do Proprietário
  managerPassword?: string; // Senha padrão do Gestor
  managers: ManagerUser[];
}

export type UserRole = 'PROPRIETARIO' | 'GESTOR' | 'COLABORADOR';

export type ActiveTab = 'inicio' | 'historico' | 'relatorios' | 'admin' | 'espelho' | 'proprietario';

export interface FacialAuditQualityMetrics {
  brightnessScore?: number; // 0 to 100
  sharpnessScore?: number;  // 0 to 100
  contrastScore?: number;   // 0 to 100
  symmetryScore?: number;   // 0 to 100
  overallQuality?: number;  // 0 to 100
}

export type FacialAuditAttemptType = 'TABLET_KIOSK_1N' | 'MOBILE_APP_11' | 'CALIBRATION_TEST';

export type FacialAuditResult = 'SUCCESS' | 'FAILURE';

export type FacialAuditErrorCode =
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'INSUFFICIENT_QUALITY'
  | 'FACE_NOT_MATCHED'
  | 'IMAGE_ERROR'
  | 'NONE';

export type FacialAuditStage = 'FACE_COUNT' | 'IMAGE_QUALITY' | 'BIOMETRIC_MATCH' | 'NONE';

export interface FacialAuditLog {
  id: string;
  timestamp: string; // ISO string e.g. "2026-08-13T17:28:42.123Z"
  formattedDate: string; // e.g. "13/08/2026"
  formattedTime: string; // e.g. "17:28:42"
  attemptType: FacialAuditAttemptType;
  result: FacialAuditResult;
  employeeId?: string;
  employeeName?: string;
  employeeAvatar?: string;
  employeeRole?: string;
  employeeDepartment?: string;
  confidence: number; // percentage (0 to 100)
  minThreshold: number; // usually 90
  faceCount: number;
  stageFailed?: FacialAuditStage;
  errorCode?: FacialAuditErrorCode;
  failureReason?: string;
  debugInfo?: string;
  qualityMetrics?: FacialAuditQualityMetrics;
  photoSnapshot?: string;
  deviceLabel?: string;
  ipOrLocation?: string;
}
