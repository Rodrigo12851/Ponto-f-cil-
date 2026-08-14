import React, { useState, useMemo } from 'react';
import {
  FacialAuditLog,
  Employee,
  FacialAuditResult,
  FacialAuditStage,
  FacialAuditErrorCode,
} from '../types';
import {
  getFacialAuditLogs,
  addFacialAuditLog,
  clearFacialAuditLogs,
  resetFacialAuditLogsToDefault,
} from '../utils/facialAuditStorage';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Camera,
  User,
  Users,
  Smartphone,
  Tablet,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  X,
  SlidersHorizontal,
  FileCheck,
  Info,
  ChevronDown,
  ChevronUp,
  Sun,
  Activity,
  Maximize2,
} from 'lucide-react';

interface FacialAuditLogViewProps {
  currentEmployee?: Employee;
  employees?: Employee[];
  isAdmin?: boolean;
}

export const FacialAuditLogView: React.FC<FacialAuditLogViewProps> = ({
  currentEmployee,
  employees = [],
  isAdmin = false,
}) => {
  const [logs, setLogs] = useState<FacialAuditLog[]>(() => getFacialAuditLogs());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>('ALL');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<FacialAuditLog | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefresh = () => {
    const refreshed = getFacialAuditLogs();
    setLogs(refreshed);
    showToast('Logs de auditoria biométrica atualizados com sucesso.');
  };

  const handleClear = () => {
    if (window.confirm('Tem certeza de que deseja limpar os registros de auditoria facial?')) {
      clearFacialAuditLogs();
      setLogs([]);
      showToast('Registros de auditoria limpos.');
    }
  };

  const handleResetDefaults = () => {
    const defaultLogs = resetFacialAuditLogsToDefault();
    setLogs(defaultLogs);
    showToast('Logs de auditoria restaurados com os eventos padrão.');
  };

  // Quick simulation of a test audit event
  const handleSimulateTestLog = (type: 'SUCCESS' | 'MULTI_FACE' | 'LOW_QUALITY' | 'UNKNOWN_PERSON') => {
    if (type === 'SUCCESS') {
      const emp = employees[0] || currentEmployee;
      addFacialAuditLog({
        attemptType: 'TABLET_KIOSK_1N',
        result: 'SUCCESS',
        employeeId: emp?.id,
        employeeName: emp?.name || 'Carlos Silva',
        employeeAvatar: emp?.avatar,
        employeeRole: emp?.role || 'Operador',
        employeeDepartment: emp?.department || 'Operações',
        confidence: 96,
        minThreshold: 90,
        faceCount: 1,
        stageFailed: 'NONE',
        errorCode: 'NONE',
        debugInfo: `Face ID Autenticado com sucesso (96% compatibilidade: ${emp?.name || 'Carlos Silva'})`,
        qualityMetrics: {
          brightnessScore: 92,
          sharpnessScore: 95,
          contrastScore: 90,
          symmetryScore: 94,
          overallQuality: 93,
        },
        photoSnapshot: emp?.avatar,
        deviceLabel: 'Tablet Quiosque Ponto (Samsung Galaxy Tab A9)',
        ipOrLocation: 'Sede Central - Entrada Principal',
      });
      showToast('Nova auditoria simulada: Reconhecimento APROVADO com sucesso (96%)');
    } else if (type === 'MULTI_FACE') {
      addFacialAuditLog({
        attemptType: 'TABLET_KIOSK_1N',
        result: 'FAILURE',
        confidence: 0,
        minThreshold: 90,
        faceCount: 2,
        stageFailed: 'FACE_COUNT',
        errorCode: 'MULTIPLE_FACES_DETECTED',
        failureReason: 'Múltiplos rostos detectados (2 pessoas visíveis no visor da câmera). Apenas 1 colaborador é permitido.',
        debugInfo: 'Falha na Etapa 1: FACE_COUNT (MULTIPLE_FACES_DETECTED - 2 clusters faciais)',
        qualityMetrics: {
          brightnessScore: 85,
          sharpnessScore: 88,
          contrastScore: 80,
          symmetryScore: 50,
          overallQuality: 75,
        },
        deviceLabel: 'Tablet Quiosque Ponto (Samsung Galaxy Tab A9)',
        ipOrLocation: 'Sede Central - Entrada Principal',
      });
      showToast('Nova auditoria simulada: Tentativa BLOQUEADA (Múltiplos Rostos)');
    } else if (type === 'LOW_QUALITY') {
      addFacialAuditLog({
        attemptType: 'MOBILE_APP_11',
        result: 'FAILURE',
        employeeId: currentEmployee?.id,
        employeeName: currentEmployee?.name,
        employeeAvatar: currentEmployee?.avatar,
        confidence: 0,
        minThreshold: 90,
        faceCount: 1,
        stageFailed: 'IMAGE_QUALITY',
        errorCode: 'INSUFFICIENT_QUALITY',
        failureReason: 'Qualidade insuficiente: Iluminação muito baixa (ambiente escuro). Vá para um local mais iluminado.',
        debugInfo: 'Falha na Etapa 1: IMAGE_QUALITY (INSUFFICIENT_QUALITY - meanLum=18 < 28)',
        qualityMetrics: {
          brightnessScore: 18,
          sharpnessScore: 40,
          contrastScore: 22,
          symmetryScore: 65,
          overallQuality: 32,
        },
        deviceLabel: 'Smartphone Pessoal (App Mobile)',
        ipOrLocation: 'Ponto Externo',
      });
      showToast('Nova auditoria simulada: Tentativa BLOQUEADA (Iluminação Insuficiente)');
    } else if (type === 'UNKNOWN_PERSON') {
      addFacialAuditLog({
        attemptType: 'TABLET_KIOSK_1N',
        result: 'FAILURE',
        employeeName: 'Pessoa Não Identificada',
        confidence: 54,
        minThreshold: 90,
        faceCount: 1,
        stageFailed: 'BIOMETRIC_MATCH',
        errorCode: 'FACE_NOT_MATCHED',
        failureReason: 'Rosto não reconhecido na base cadastrada da empresa (Similaridade obtida: 54%, exigida: ≥90%).',
        debugInfo: 'Rejeitado na Etapa 2: 54% < 90% (rawCorr: 0.210)',
        qualityMetrics: {
          brightnessScore: 88,
          sharpnessScore: 84,
          contrastScore: 85,
          symmetryScore: 90,
          overallQuality: 87,
        },
        deviceLabel: 'Tablet Quiosque Ponto (Samsung Galaxy Tab A9)',
        ipOrLocation: 'Refeitório Central',
      });
      showToast('Nova auditoria simulada: Tentativa REJEITADA (Face Não Compatível 54%)');
    }

    setLogs(getFacialAuditLogs());
  };

  // Export to CSV / Report
  const handleExportCSV = () => {
    if (logs.length === 0) {
      showToast('Nenhum log para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Data',
      'Hora',
      'Resultado',
      'Colaborador',
      'Tipo de Tentativa',
      'Similaridade (%)',
      'Corte Exigido (%)',
      'Contagem Rostos',
      'Etapa Falha',
      'Código Erro',
      'Motivo / Diagnóstico',
      'Dispositivo',
      'Local / IP',
    ];

    const rows = logs.map((l) => [
      l.id,
      l.formattedDate,
      l.formattedTime,
      l.result === 'SUCCESS' ? 'APROVADO' : 'REJEITADO',
      l.employeeName || 'Não Identificado',
      l.attemptType === 'TABLET_KIOSK_1N' ? 'Tablet Quiosque (1:N)' : 'App Mobile (1:1)',
      `${l.confidence}%`,
      `${l.minThreshold}%`,
      l.faceCount,
      l.stageFailed || 'NONE',
      l.errorCode || 'NONE',
      `"${(l.failureReason || l.debugInfo || '').replace(/"/g, '""')}"`,
      `"${(l.deviceLabel || '').replace(/"/g, '""')}"`,
      `"${(l.ipOrLocation || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_facial_biometria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Relatório de auditoria CSV exportado com sucesso!');
  };

  // Metrics Calculation
  const totalAttempts = logs.length;
  const successAttempts = logs.filter((l) => l.result === 'SUCCESS').length;
  const failureAttempts = logs.filter((l) => l.result === 'FAILURE').length;
  const successRate = totalAttempts > 0 ? Math.round((successAttempts / totalAttempts) * 100) : 100;

  const multiFaceRejections = logs.filter((l) => l.errorCode === 'MULTIPLE_FACES_DETECTED').length;
  const qualityRejections = logs.filter((l) => l.stageFailed === 'IMAGE_QUALITY').length;
  const biometricMismatchRejections = logs.filter((l) => l.errorCode === 'FACE_NOT_MATCHED').length;

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Status Filter
      if (statusFilter !== 'ALL' && log.result !== statusFilter) {
        return false;
      }

      // Stage / Error Code Filter
      if (stageFilter !== 'ALL') {
        if (stageFilter === 'MULTI_FACE' && log.errorCode !== 'MULTIPLE_FACES_DETECTED') {
          return false;
        }
        if (stageFilter === 'NO_FACE' && log.errorCode !== 'NO_FACE_DETECTED') {
          return false;
        }
        if (stageFilter === 'QUALITY' && log.stageFailed !== 'IMAGE_QUALITY') {
          return false;
        }
        if (stageFilter === 'MISMATCH' && log.errorCode !== 'FACE_NOT_MATCHED') {
          return false;
        }
      }

      // Employee Filter
      if (selectedEmpFilter !== 'ALL') {
        if (log.employeeId !== selectedEmpFilter && log.employeeName !== selectedEmpFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = log.employeeName?.toLowerCase().includes(q);
        const matchReason = log.failureReason?.toLowerCase().includes(q);
        const matchDebug = log.debugInfo?.toLowerCase().includes(q);
        const matchDevice = log.deviceLabel?.toLowerCase().includes(q);
        const matchId = log.id.toLowerCase().includes(q);
        const matchDate = log.formattedDate.includes(q);
        const matchTime = log.formattedTime.includes(q);

        if (!matchName && !matchReason && !matchDebug && !matchDevice && !matchId && !matchDate && !matchTime) {
          return false;
        }
      }

      return true;
    });
  }, [logs, statusFilter, stageFilter, selectedEmpFilter, searchQuery]);

  return (
    <div className="space-y-4 text-slate-800">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-slate-900 text-white font-bold text-xs rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in border border-slate-700">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-slate-800 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-950/90 px-2.5 py-0.5 rounded-full border border-indigo-800 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-400" /> Auditoria Facial em Tempo Real
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                  Corte: ≥90%
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">Logs de Reconhecimento Facial</h2>
              <p className="text-xs text-slate-300 font-medium">
                Transparência completa, diagnóstico multi-etapas e rastreabilidade de eventos de segurança.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              title="Atualizar Logs"
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
            <button
              onClick={handleExportCSV}
              title="Exportar Relatório em Planilha CSV"
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <span>Total Tentativas</span>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-xl font-black text-white mt-1">{totalAttempts}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Eventos auditados</p>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <span>Aprovados</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-black text-emerald-400 mt-1">{successAttempts}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{successRate}% taxa de sucesso</p>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-rose-400 text-[10px] font-bold uppercase tracking-wider">
              <span>Rejeições de Segurança</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-xl font-black text-rose-400 mt-1">{failureAttempts}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {multiFaceRejections > 0 ? `${multiFaceRejections} multi-face` : 'Bloqueios preventivos'}
            </p>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              <span>Qualidade / Filtros</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xl font-black text-amber-400 mt-1">
              {qualityRejections + multiFaceRejections + biometricMismatchRejections}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Falhas prevenidas</p>
          </div>
        </div>
      </div>

      {/* Interactive Testing Toolbar for Manager/Admin testing */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-blue-900 font-bold">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Simular Auditoria Biométrica para Testes:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleSimulateTestLog('SUCCESS')}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle2 className="w-3 h-3" /> Sucesso (96%)
          </button>
          <button
            onClick={() => handleSimulateTestLog('MULTI_FACE')}
            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Users className="w-3 h-3" /> Múltiplos Rostos
          </button>
          <button
            onClick={() => handleSimulateTestLog('LOW_QUALITY')}
            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Sun className="w-3 h-3" /> Baixa Luz / Foco
          </button>
          <button
            onClick={() => handleSimulateTestLog('UNKNOWN_PERSON')}
            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <AlertOctagon className="w-3 h-3" /> Não Cadastrado
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
        {/* Search and Status Segment */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por colaborador, motivo de erro, dispositivo ou data..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Segment Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({totalAttempts})
            </button>
            <button
              onClick={() => setStatusFilter('SUCCESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'SUCCESS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> Aprovados ({successAttempts})
            </button>
            <button
              onClick={() => setStatusFilter('FAILURE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'FAILURE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:text-rose-800'
              }`}
            >
              <XCircle className="w-3 h-3" /> Rejeitados ({failureAttempts})
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Reason Filter & Employee Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="w-full sm:w-auto flex items-center gap-1.5 text-slate-500 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filtros Específicos:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
            {/* Reason / Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="ALL">🔍 Todos os Motivos / Etapas</option>
              <option value="MULTI_FACE">👥 Múltiplos Rostos (Etapa 1)</option>
              <option value="NO_FACE">🚫 Nenhum Rosto / Câmera Obstruída (Etapa 1)</option>
              <option value="QUALITY">⚠️ Qualidade Insuficiente / Luz / Foco (Etapa 1)</option>
              <option value="MISMATCH">❌ Similaridade &lt; 90% / Face Não Reconhecida (Etapa 2)</option>
            </select>

            {/* Employee Filter */}
            {employees && employees.length > 0 && (
              <select
                value={selectedEmpFilter}
                onChange={(e) => setSelectedEmpFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">👤 Todos os Colaboradores</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Restaurar Padrões
            </button>
            {isAdmin && (
              <button
                onClick={handleClear}
                className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log List Count */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-bold">
        <span>Exibindo {filteredLogs.length} de {totalAttempts} tentativas registradas:</span>
        <span className="text-[11px] text-slate-400 font-normal">
          Ordenado pelos registros mais recentes
        </span>
      </div>

      {/* Audit Log Entries List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Nenhum registro de auditoria encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não há registros que correspondam aos filtros selecionados. Tente ajustar os termos de busca ou clique em "Restaurar Padrões".
          </p>
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Carregar Exemplos de Auditoria
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isSuccess = log.result === 'SUCCESS';
            const isExpanded = selectedLogForDetail?.id === log.id;

            return (
              <div
                key={log.id}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  isSuccess
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                }`}
              >
                {/* Main Card Header */}
                <div
                  onClick={() => setSelectedLogForDetail(isExpanded ? null : log)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Avatar / Status Icon + Details */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Snapshot / Avatar thumbnail */}
                    <div className="relative shrink-0">
                      {log.photoSnapshot ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPhoto({
                              url: log.photoSnapshot!,
                              title: `Captura Facial - ${log.employeeName || 'Tentativa'}`,
                              subtitle: `${log.formattedDate} às ${log.formattedTime} • ${
                                isSuccess ? 'Aprovado (96%+)' : 'Rejeitado'
                              }`,
                            });
                          }}
                          className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 group cursor-pointer shadow-xs"
                        >
                          <img
                            src={log.photoSnapshot}
                            alt="Snapshot"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 font-bold ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isSuccess ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                        </div>
                      )}

                      {/* Small badge overlay */}
                      <span
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-xs ${
                          isSuccess ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      >
                        {isSuccess ? '✓' : '✕'}
                      </span>
                    </div>

                    {/* Employee & Result Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {log.employeeName || 'Tentativa Não Identificada'}
                        </h4>

                        {/* Attempt Type Pill */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                          {log.attemptType === 'TABLET_KIOSK_1N' ? (
                            <>
                              <Tablet className="w-3 h-3 text-indigo-600" /> Quiosque Tablet (1:N)
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-3 h-3 text-blue-600" /> App Pessoal (1:1)
                            </>
                          )}
                        </span>
                      </div>

                      {/* Timestamp & Diagnostic Subtitle */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                        <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {log.formattedTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {log.formattedDate}
                        </span>
                        {log.employeeRole && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600">{log.employeeRole}</span>
                          </>
                        )}
                      </div>

                      {/* Reason / Diagnostic summary snippet */}
                      <p
                        className={`text-xs mt-1.5 font-bold leading-tight ${
                          isSuccess ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isSuccess
                          ? `✓ Autenticação biométrica aprovada com ${log.confidence}% de similaridade (exigido ≥90%).`
                          : `✕ ${log.failureReason || log.debugInfo || 'Reconhecimento facial não aprovado.'}`}
                      </p>
                    </div>
                  </div>

                  {/* Right: Confidence Score & Expand button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div
                      className={`px-3 py-1.5 rounded-xl text-center border font-mono ${
                        isSuccess
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold tracking-wider block">
                        {isSuccess ? 'Similaridade' : 'Resultado'}
                      </span>
                      <span className="text-sm font-black">
                        {isSuccess
                          ? `${log.confidence}%`
                          : log.stageFailed === 'FACE_COUNT'
                          ? `${log.faceCount} Rosto(s)`
                          : log.confidence > 0
                          ? `${log.confidence}%`
                          : 'Bloqueado'}
                      </span>
                    </div>

                    <button className="text-slate-400 hover:text-slate-600 p-1 flex items-center gap-1 text-xs font-bold">
                      <span>{isExpanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Audit Panel */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4 animate-in fade-in text-xs">
                    {/* Grid of Multi-stage Quality Breakdown */}
                    <div>
                      <h5 className="font-black text-slate-800 uppercase tracking-wide text-[11px] mb-2 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                        Diagnóstico Multi-Etapas & Métricas Biométricas
                      </h5>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {/* Metric 1: Face Count */}
                        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Presença Facial
                          </span>
                          <p
                            className={`text-sm font-black mt-0.5 ${
                              log.faceCount === 1 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {log.faceCount === 1
                              ? '1 Rosto (Válido)'
                              : log.faceCount === 0
                              ? '0 (Sem Rosto)'
                              : `${log.faceCount} Rostos (Inválido)`}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {log.stageFailed === 'FACE_COUNT' ? '⚠️ Falha nesta etapa' : '✓ Aprovado Etapa 1'}
                          </span>
                        </div>

                        {/* Metric 2: Similarity */}
                        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Similaridade Facial
                          </span>
                          <p
                            className={`text-sm font-black mt-0.5 ${
                              log.confidence >= (log.minThreshold || 90)
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {log.confidence}%
                          </p>
                          <span className="text-[10px] text-slate-500">
                            Corte Exigido: ≥{log.minThreshold || 90}%
                          </span>
                        </div>

                        {/* Metric 3: Brightness / Lighting */}
                        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Luminância & Brilho
                          </span>
                          <p className="text-sm font-black text-slate-800 mt-0.5">
                            {log.qualityMetrics?.brightnessScore !== undefined
                              ? `${log.qualityMetrics.brightnessScore}/100`
                              : 'Normal'}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {log.qualityMetrics?.brightnessScore && log.qualityMetrics.brightnessScore < 30
                              ? '⚠️ Ambiente Escuro'
                              : '✓ Faixa Adequada'}
                          </span>
                        </div>

                        {/* Metric 4: Sharpness / Laplacian */}
                        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Foco & Nitidez
                          </span>
                          <p className="text-sm font-black text-slate-800 mt-0.5">
                            {log.qualityMetrics?.sharpnessScore !== undefined
                              ? `${log.qualityMetrics.sharpnessScore}/100`
                              : 'Nítido'}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {log.qualityMetrics?.sharpnessScore && log.qualityMetrics.sharpnessScore < 35
                              ? '⚠️ Desfocado / Movimento'
                              : '✓ Sem desfoque'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Technical & Audit Details Box */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-2 text-slate-700">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-indigo-600" />
                          Rastreabilidade & Conformidade Portaria 671 MTE
                        </span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                          ID: {log.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold">Dispositivo / Ponto:</span>
                          <p className="font-semibold text-slate-800">
                            {log.deviceLabel || 'Dispositivo Padrão'}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-400 font-bold">Localização / Rede:</span>
                          <p className="font-semibold text-slate-800">
                            {log.ipOrLocation || 'Rede Corporativa Segura'}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-400 font-bold">Etapa do Processamento:</span>
                          <p className="font-semibold text-slate-800">
                            {log.stageFailed === 'NONE' || !log.stageFailed
                              ? 'Etapa 2 (Biometria Aprovada)'
                              : log.stageFailed === 'FACE_COUNT'
                              ? 'Etapa 1 (Pré-validação de Presença Facial)'
                              : log.stageFailed === 'IMAGE_QUALITY'
                              ? 'Etapa 1 (Pré-validação de Qualidade/Foco)'
                              : 'Etapa 2 (Comparação Biométrica 1:N / 1:1)'}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-400 font-bold">Código do Sistema:</span>
                          <p className="font-mono font-bold text-slate-800">
                            {log.errorCode || 'SUCCESS_OK'}
                          </p>
                        </div>
                      </div>

                      {log.debugInfo && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <span className="text-slate-400 font-bold block mb-0.5">Diagnóstico do Motor:</span>
                          <p className="font-mono text-[11px] bg-slate-900 text-emerald-400 p-2 rounded-xl">
                            {log.debugInfo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Preview Modal for Snapshots */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative border border-slate-800 text-white text-center">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-1 pr-8">
              <span>{previewPhoto.title}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">{previewPhoto.subtitle}</p>

            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 my-2 shadow-lg bg-black">
              <img src={previewPhoto.url} alt="Captura Facial" className="w-full h-64 object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono text-indigo-300 border border-white/10 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Registro Auditado
              </div>
            </div>

            <button
              onClick={() => setPreviewPhoto(null)}
              className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              FECHAR AUDITORIA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
