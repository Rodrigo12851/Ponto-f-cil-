import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  Monitor,
  Apple,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Zap,
} from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).__pwaDeferredPrompt || null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    // Check if running as installed standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Check if running inside an iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    if (isIosDevice) setActiveTab('ios');
    else if (isAndroidDevice) setActiveTab('android');
    else setActiveTab('desktop');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaDeferredPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).__pwaDeferredPrompt;
    if (!promptEvent) {
      // If deferredPrompt is not available (e.g. inside iframe or iOS), open in new tab
      if (isInIframe) {
        window.open(window.location.href, '_blank');
      }
      return;
    }
    
    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        (window as any).__pwaDeferredPrompt = null;
        setTimeout(onClose, 2000);
      }
    } catch (e) {
      console.warn('Install prompt error:', e);
    }
  };

  const handleCopyLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      alert('Link: ' + window.location.href);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-white overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-xl shadow-blue-500/25 shrink-0 flex items-center justify-center">
            <img
              src="/icon-192.png"
              alt="Ponto Facial"
              className="w-full h-full object-cover rounded-[14px]"
              onError={(e) => {
                // Fallback to svg if png fails
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-white">
                Instalar Ponto Facial
              </h3>
              <span className="bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                App PWA
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Aplicativo oficial para celular e computador
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2 my-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-black text-emerald-300">
              Aplicativo já instalado com sucesso!
            </h4>
            <p className="text-xs text-slate-300">
              Você já está utilizando a versão instalada direto da sua tela inicial com desempenho máximo e acesso offline.
            </p>
          </div>
        ) : (
          <div className="space-y-4 my-2">
            {/* Primary One-Click Install Button */}
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2.5 transition cursor-pointer transform active:scale-98 border border-blue-400/30"
              >
                <Download className="w-5 h-5 animate-bounce" />
                <span>INSTALAR AGORA NO SEU DISPOSITIVO</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleOpenInNewTab}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer border border-blue-400/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ABRIR EM NOVA ABA PARA INSTALAR</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  💡 <em>Dica: Abrindo em nova aba no Chrome ou Safari, o botão de instalação fica ativo imediatamente!</em>
                </p>
              </div>
            )}

            {/* Quick Share / Copy URL Bar */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Link do Aplicativo para Enviar no WhatsApp:
                </span>
                <span className="text-xs text-blue-300 font-mono truncate block">
                  {typeof window !== 'undefined' ? window.location.href : ''}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Device Instructions Selector Tabs */}
            <div className="pt-2">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'android'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android (Chrome)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'ios'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>iPhone (Safari)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'desktop'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Computador</span>
                </button>
              </div>

              {/* Android Instructions */}
              {activeTab === 'android' && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 animate-in fade-in text-xs">
                  <div className="flex items-center gap-2 font-bold text-blue-400">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Passo a passo no Android (Google Chrome):</span>
                  </div>
                  <ol className="space-y-2 text-slate-300 font-medium list-decimal pl-4">
                    <li>
                      Abra o link no navegador <strong>Google Chrome</strong>.
                    </li>
                    <li>
                      Toque nos <strong>3 pontinhos ⋮</strong> no canto superior direito do Chrome.
                    </li>
                    <li>
                      Selecione a opção <strong className="text-white">"Instalar aplicativo"</strong> ou <strong className="text-white">"Adicionar à tela inicial"</strong>.
                    </li>
                    <li>
                      Toque em <strong className="text-blue-400">"Instalar"</strong>. Pronto! O ícone do Ponto Facial aparecerá na sua tela inicial como um app nativo.
                    </li>
                  </ol>
                </div>
              )}

              {/* iOS Instructions */}
              {activeTab === 'ios' && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 animate-in fade-in text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Apple className="w-4 h-4 text-amber-400" />
                    <span>Passo a passo no iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="space-y-2 text-slate-300 font-medium list-decimal pl-4">
                    <li>
                      Abra o link no navegador <strong>Safari</strong> da Apple.
                    </li>
                    <li>
                      Toque no botão <strong className="text-white">Compartilhar</strong> (ícone do quadrado com seta para cima <Share className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" />) na barra inferior.
                    </li>
                    <li>
                      Role para baixo e toque em <strong className="text-white">"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" />).
                    </li>
                    <li>
                      Toque em <strong className="text-blue-400">"Adicionar"</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              )}

              {/* Desktop Instructions */}
              {activeTab === 'desktop' && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 animate-in fade-in text-xs">
                  <div className="flex items-center gap-2 font-bold text-blue-300">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    <span>Passo a passo no PC / Mac (Chrome / Edge):</span>
                  </div>
                  <ol className="space-y-2 text-slate-300 font-medium list-decimal pl-4">
                    <li>
                      Na barra de endereços do Chrome ou Edge, clique no ícone de <strong>Instalar Aplicativo</strong> (ícone de computador com seta ou ⊞) ao lado da estrela de favoritos.
                    </li>
                    <li>
                      Ou clique nos <strong>3 pontinhos do menu &gt; Salvar e Compartilhar &gt; Instalar Ponto Facial</strong>.
                    </li>
                    <li>
                      Clique em <strong>Instalar</strong> para abrir em janela própria com tela cheia.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Benefits Badge Bar */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Abre instantâneo sem navegador</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Acesso offline & Biometria rápida</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
