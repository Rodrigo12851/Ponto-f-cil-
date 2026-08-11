import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
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
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Ocorreu um erro inesperado</h2>
              <p className="text-xs text-slate-400 mt-1">
                Sua sessão foi recuperada para evitar que a tela fique em branco.
              </p>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700 text-left text-[11px] font-mono text-rose-300 overflow-x-auto max-h-32">
              {this.state.error?.message || 'Erro desconhecido de renderização.'}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Restaurar e Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
