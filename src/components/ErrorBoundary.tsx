import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, ShieldAlert, Copy, Check, Code2, FileCode, Terminal, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface ParsedErrorLocation {
  file: string;
  line: string;
  column?: string;
  componentName?: string;
  rawLine?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  copied: boolean;
  showFullStack: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      copied: false,
      showFullStack: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Uncaught error in component:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleGlobalError = (event: ErrorEvent) => {
    console.error('Global Error caught:', event.error || event.message);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled Promise Rejection caught:', event.reason);
  };

  private parseErrorLocation(): ParsedErrorLocation | null {
    const stack = this.state.error?.stack || '';
    const componentStack = this.state.errorInfo?.componentStack || '';
    const combinedStack = `${stack}\n${componentStack}`;

    const lines = combinedStack.split('\n');

    for (const rawLine of lines) {
      // Look for lines containing local app paths like /src/ or .tsx / .ts / .jsx / .js
      if (rawLine.includes('/src/') || rawLine.includes('.tsx') || rawLine.includes('.ts')) {
        // Exclude node_modules or Vite internal scripts
        if (rawLine.includes('node_modules') || rawLine.includes('/@vite/') || rawLine.includes('/@react-refresh')) {
          continue;
        }

        // Try matching: "at ComponentName (http.../src/components/File.tsx:123:45)"
        const matchWithComp = rawLine.match(/at\s+([A-Za-z0-9_]+)\s+\((?:.*\/src\/|\/)?([^:?]+)(?:\?[^:]*)?:(\d+)(?::(\d+))?\)/);
        if (matchWithComp) {
          return {
            componentName: matchWithComp[1],
            file: `src/${matchWithComp[2]}`,
            line: matchWithComp[3],
            column: matchWithComp[4],
            rawLine: rawLine.trim(),
          };
        }

        // Try matching: "at http.../src/components/File.tsx:123:45"
        const matchDirect = rawLine.match(/(?:.*\/src\/|\/)([^:?]+)(?:\?[^:]*)?:(\d+)(?::(\d+))?/);
        if (matchDirect) {
          return {
            file: `src/${matchDirect[1]}`,
            line: matchDirect[2],
            column: matchDirect[3],
            rawLine: rawLine.trim(),
          };
        }
      }
    }

    return null;
  }

  private parseComponentTrace(): Array<{ component: string; fileLine?: string }> {
    const componentStack = this.state.errorInfo?.componentStack || '';
    if (!componentStack) return [];

    const traceLines = componentStack.split('\n').filter(l => l.trim().length > 0);
    const parsed: Array<{ component: string; fileLine?: string }> = [];

    for (const line of traceLines) {
      const match = line.match(/at\s+([A-Za-z0-9_]+)\s+\((?:.*\/src\/|\/)?([^)]+)\)/);
      if (match) {
        parsed.push({
          component: match[1],
          fileLine: match[2].replace(/\?t=\d+/, ''),
        });
      } else {
        const simpleComp = line.match(/at\s+([A-Za-z0-9_]+)/);
        if (simpleComp) {
          parsed.push({ component: simpleComp[1] });
        }
      }
    }

    return parsed;
  }

  private handleCopyDetails = () => {
    const loc = this.parseErrorLocation();
    const errorDetails = [
      `=== DIAGNÓSTICO DE ERRO ===`,
      `Erro: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Sem mensagem'}`,
      `Local do Erro: ${loc ? `${loc.file} -> Linha ${loc.line}${loc.column ? `:${loc.column}` : ''}` : 'Não identificado no stack local'}`,
      `Componente: ${loc?.componentName || 'N/A'}`,
      `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
      `\n--- Stack Trace ---`,
      this.state.error?.stack || 'N/A',
      `\n--- Component Stack ---`,
      this.state.errorInfo?.componentStack || 'N/A',
    ].join('\n');

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(err => {
      console.warn('Erro ao copiar:', err);
    });
  };

  private handleSoftReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    try {
      localStorage.removeItem('sistema_ponto_funcionarios_v2');
      localStorage.removeItem('sistema_ponto_geofence');
    } catch (e) {
      console.warn('Could not clear localStorage', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const location = this.parseErrorLocation();
      const componentTrace = this.parseComponentTrace();

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl space-y-6 overflow-hidden relative">
            {/* Header Badge & Title */}
            <div className="flex items-start gap-4 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                    Verificador de Erros Em Tempo Real
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mt-1 tracking-tight">
                  Ocorreu uma falha na execução
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Abaixo estão os detalhes exatos e a linha do código local para facilitar a correção.
                </p>
              </div>
            </div>

            {/* Error Location Spotlight Card (The Line & File) */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-rose-950/30 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <FileCode className="w-4 h-4" />
                  <span>LOCALIZAÇÃO DO ERRO NO CÓDIGO</span>
                </div>
                {location?.line && (
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-lg shadow-md animate-pulse">
                    LINHA {location.line}
                  </span>
                )}
              </div>

              {location ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivo Local</p>
                    <p className="font-mono text-emerald-400 font-bold text-xs truncate mt-0.5" title={location.file}>
                      {location.file}
                    </p>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linha & Coluna</p>
                    <p className="font-mono text-amber-300 font-bold text-xs mt-0.5">
                      Linha <span className="text-amber-400 font-black text-sm">{location.line}</span>
                      {location.column && ` : Coluna ${location.column}`}
                    </p>
                  </div>
                  {location.componentName && (
                    <div className="sm:col-span-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Componente Afetado</p>
                        <p className="font-mono text-blue-300 font-bold text-xs mt-0.5">
                          &lt;{location.componentName} /&gt;
                        </p>
                      </div>
                      <Code2 className="w-5 h-5 text-blue-400/60" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-200/80 italic">
                  Não foi possível isolar a linha exata no stack trace, mas veja a mensagem abaixo.
                </p>
              )}
            </div>

            {/* Error Message Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Mensagem Exata do Erro:
              </label>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-rose-500/30 font-mono text-xs text-rose-300 font-semibold break-words leading-relaxed shadow-inner">
                {this.state.error?.name && <span className="text-rose-400 font-extrabold mr-1 shadow-sm">[{this.state.error.name}]</span>}
                {this.state.error?.message || 'Erro desconhecido durante a renderização do aplicativo.'}
              </div>
            </div>

            {/* React Component Stack Hierarchy */}
            {componentTrace.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  Caminho do Componente (Árvore de Execução):
                </label>
                <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-3 max-h-36 overflow-y-auto space-y-1 text-xs font-mono">
                  {componentTrace.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-slate-300 py-1 px-2 hover:bg-slate-900 rounded-lg">
                      <span className="font-bold text-blue-400 text-[11px]">
                        {idx === 0 ? '👉' : '↳'} &lt;{item.component} /&gt;
                      </span>
                      {item.fileLine && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[240px]">
                          {item.fileLine}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expandable Full Stack Trace */}
            <div>
              <button
                onClick={() => this.setState((prev) => ({ showFullStack: !prev.showFullStack }))}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-200 transition underline underline-offset-4 cursor-pointer"
              >
                {this.state.showFullStack ? 'Ocultar Stack Trace Completo' : 'Ver Stack Trace Completo (Log Técnico)'}
              </button>

              {this.state.showFullStack && (
                <div className="mt-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[10px] font-mono text-slate-400 max-h-48 overflow-auto whitespace-pre-wrap leading-tight">
                  {this.state.error?.stack || 'Sem stack trace disponível.'}
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={this.handleCopyDetails}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  this.state.copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-blue-400" /> Copiar Diagnóstico
                  </>
                )}
              </button>

              <button
                onClick={this.handleSoftReload}
                className="py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Recarregar Tela
              </button>

              <button
                onClick={this.handleResetData}
                className="py-3 px-3 bg-rose-600/80 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                title="Limpa dados salvos localmente e recarrega"
              >
                <RotateCcw className="w-4 h-4" /> Resetar Dados
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

