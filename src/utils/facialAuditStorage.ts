import { FacialAuditLog } from '../types';

const AUDIT_STORAGE_KEY = 'sistema_ponto_facial_audits';

const INITIAL_AUDIT_LOGS: FacialAuditLog[] = [
  {
    id: 'bio-log-101',
    timestamp: '2026-08-13T08:02:14.000Z',
    formattedDate: '13/08/2026',
    formattedTime: '08:02:14',
    attemptType: 'TABLET_KIOSK_1N',
    result: 'SUCCESS',
    employeeId: 'emp-1',
    employeeName: 'Carlos Silva',
    employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    employeeRole: 'Operador de Caixa',
    employeeDepartment: 'Operações',
    confidence: 97,
    minThreshold: 90,
    faceCount: 1,
    stageFailed: 'NONE',
    errorCode: 'NONE',
    failureReason: undefined,
    debugInfo: 'Face ID Autenticado com sucesso (97% compatibilidade: Carlos Silva)',
    qualityMetrics: {
      brightnessScore: 89,
      sharpnessScore: 94,
      contrastScore: 91,
      symmetryScore: 95,
      overallQuality: 92,
    },
    photoSnapshot: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    deviceLabel: 'Tablet Recepção Principal (Samsung Galaxy Tab A9)',
    ipOrLocation: 'Sede Central - Entrada Principal',
  },
  {
    id: 'bio-log-102',
    timestamp: '2026-08-13T08:05:41.000Z',
    formattedDate: '13/08/2026',
    formattedTime: '08:05:41',
    attemptType: 'TABLET_KIOSK_1N',
    result: 'FAILURE',
    confidence: 0,
    minThreshold: 90,
    faceCount: 2,
    stageFailed: 'FACE_COUNT',
    errorCode: 'MULTIPLE_FACES_DETECTED',
    failureReason: 'Múltiplos rostos detectados (2 pessoas visíveis no visor da câmera). Apenas 1 colaborador é permitido.',
    debugInfo: 'Falha na Etapa 1: FACE_COUNT (MULTIPLE_FACES_DETECTED - 2 clusters faciais detectados)',
    qualityMetrics: {
      brightnessScore: 82,
      sharpnessScore: 88,
      contrastScore: 80,
      symmetryScore: 45,
      overallQuality: 74,
    },
    photoSnapshot: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    deviceLabel: 'Tablet Recepção Principal (Samsung Galaxy Tab A9)',
    ipOrLocation: 'Sede Central - Entrada Principal',
  },
  {
    id: 'bio-log-103',
    timestamp: '2026-08-13T08:14:22.000Z',
    formattedDate: '13/08/2026',
    formattedTime: '08:14:22',
    attemptType: 'MOBILE_APP_11',
    result: 'SUCCESS',
    employeeId: 'emp-2',
    employeeName: 'Mariana Santos',
    employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    employeeRole: 'Repositora Líder',
    employeeDepartment: 'Logística',
    confidence: 96,
    minThreshold: 90,
    faceCount: 1,
    stageFailed: 'NONE',
    errorCode: 'NONE',
    debugInfo: 'Face reconhecida com sucesso! (96% compatibilidade com Mariana Santos)',
    qualityMetrics: {
      brightnessScore: 92,
      sharpnessScore: 96,
      contrastScore: 88,
      symmetryScore: 93,
      overallQuality: 92,
    },
    photoSnapshot: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    deviceLabel: 'iPhone 14 (App Ponto Pessoal)',
    ipOrLocation: 'Filial 01 - Almoxarifado',
  },
  {
    id: 'bio-log-104',
    timestamp: '2026-08-13T12:01:05.000Z',
    formattedDate: '13/08/2026',
    formattedTime: '12:01:05',
    attemptType: 'TABLET_KIOSK_1N',
    result: 'FAILURE',
    confidence: 0,
    minThreshold: 90,
    faceCount: 0,
    stageFailed: 'FACE_COUNT',
    errorCode: 'NO_FACE_DETECTED',
    failureReason: 'Nenhum rosto humano detectado na imagem. Câmera obstruída ou usuário fora do enquadramento.',
    debugInfo: 'Falha na Etapa 1: FACE_COUNT (NO_FACE_DETECTED - densidade cutânea abaixo do limite)',
    qualityMetrics: {
      brightnessScore: 15,
      sharpnessScore: 20,
      contrastScore: 12,
      symmetryScore: 10,
      overallQuality: 14,
    },
    photoSnapshot: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    deviceLabel: 'Tablet Quiosque Almoço (Área de Descanso)',
    ipOrLocation: 'Refeitório Central',
  },
  {
    id: 'bio-log-105',
    timestamp: '2026-08-13T12:03:19.000Z',
    formattedDate: '13/08/2026',
    formattedTime: '12:03:19',
    attemptType: 'TABLET_KIOSK_1N',
    result: 'FAILURE',
    employeeName: 'Pessoa Não Identificada',
    confidence: 62,
    minThreshold: 90,
    faceCount: 1,
    stageFailed: 'BIOMETRIC_MATCH',
    errorCode: 'FACE_NOT_MATCHED',
    failureReason: 'Rosto não reconhecido com a biometria cadastrada na empresa (Similaridade obtida: 62%, exigida: ≥90%).',
    debugInfo: 'Rejeitado na Etapa 2: 62% < 90% (rawCorr: 0.285)',
    qualityMetrics: {
      brightnessScore: 84,
      sharpnessScore: 80,
      contrastScore: 82,
      symmetryScore: 89,
      overallQuality: 84,
    },
    photoSnapshot: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    deviceLabel: 'Tablet Quiosque Almoço (Área de Descanso)',
    ipOrLocation: 'Refeitório Central',
  },
  {
    id: 'bio-log-106',
    timestamp: '2026-08-13T13:00:45.000Z',
    formattedDate: '13/08/2026',
    formattedTime: '13:00:45',
    attemptType: 'TABLET_KIOSK_1N',
    result: 'SUCCESS',
    employeeId: 'emp-3',
    employeeName: 'Lucas Ferreira',
    employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    employeeRole: 'Fiscal de Caixa',
    employeeDepartment: 'Financeiro',
    confidence: 98,
    minThreshold: 90,
    faceCount: 1,
    stageFailed: 'NONE',
    errorCode: 'NONE',
    debugInfo: 'Face ID Autenticado com sucesso (98% compatibilidade: Lucas Ferreira)',
    qualityMetrics: {
      brightnessScore: 94,
      sharpnessScore: 98,
      contrastScore: 92,
      symmetryScore: 97,
      overallQuality: 95,
    },
    photoSnapshot: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    deviceLabel: 'Tablet Recepção Principal (Samsung Galaxy Tab A9)',
    ipOrLocation: 'Sede Central - Entrada Principal',
  },
  {
    id: 'bio-log-107',
    timestamp: '2026-08-13T16:42:10.000Z',
    formattedDate: '13/08/2026',
    formattedTime: '16:42:10',
    attemptType: 'TABLET_KIOSK_1N',
    result: 'FAILURE',
    confidence: 0,
    minThreshold: 90,
    faceCount: 1,
    stageFailed: 'IMAGE_QUALITY',
    errorCode: 'INSUFFICIENT_QUALITY',
    failureReason: 'Qualidade insuficiente: Imagem desfocada ou tremida (Variância Laplaciana 7.2 < 11.0). Mantenha o dispositivo firme.',
    debugInfo: 'Falha na Etapa 1: IMAGE_QUALITY (INSUFFICIENT_QUALITY - laplacianVariance=7.2)',
    qualityMetrics: {
      brightnessScore: 78,
      sharpnessScore: 22,
      contrastScore: 65,
      symmetryScore: 70,
      overallQuality: 58,
    },
    photoSnapshot: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    deviceLabel: 'Tablet Recepção Principal (Samsung Galaxy Tab A9)',
    ipOrLocation: 'Sede Central - Entrada Principal',
  },
];

export function getFacialAuditLogs(): FacialAuditLog[] {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_AUDIT_LOGS;
    }
    return parsed;
  } catch (err) {
    console.error('Error loading facial audit logs:', err);
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveFacialAuditLogs(logs: FacialAuditLog[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving facial audit logs:', err);
  }
}

export function addFacialAuditLog(
  entry: Omit<FacialAuditLog, 'id' | 'timestamp' | 'formattedDate' | 'formattedTime'>
): FacialAuditLog {
  const currentLogs = getFacialAuditLogs();
  const now = new Date();
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const formattedTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const newLog: FacialAuditLog = {
    ...entry,
    id: `bio-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    formattedDate,
    formattedTime,
  };

  const updatedLogs = [newLog, ...currentLogs];
  // Limit to most recent 200 logs to preserve storage
  const trimmed = updatedLogs.slice(0, 200);
  saveFacialAuditLogs(trimmed);

  return newLog;
}

export function clearFacialAuditLogs(): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Error clearing facial audit logs:', err);
  }
}

export function resetFacialAuditLogsToDefault(): FacialAuditLog[] {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  } catch (err) {
    return INITIAL_AUDIT_LOGS;
  }
}
