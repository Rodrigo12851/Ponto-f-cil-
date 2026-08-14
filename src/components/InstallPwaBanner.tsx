import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, ExternalLink } from 'lucide-react';

interface InstallPwaBannerProps {
  onOpenInstallModal: () => void;
}

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({ onOpenInstallModal }) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaDeferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    } catch {}
  };

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-b border-blue-500/30 px-3 py-2 text-white sticky top-0 z-40 shadow-lg backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        <div
          onClick={onOpenInstallModal}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white truncate">
                Instalar Aplicativo Ponto Facial
              </span>
              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded uppercase">
                App
              </span>
            </div>
            <p className="text-[10px] text-blue-200 truncate font-medium">
              Acesse com 1 clique na tela inicial do celular ou PC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95 border border-blue-300/40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar aviso"
            aria-label="Fechar banner de instalação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
