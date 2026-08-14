import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Layers,
} from 'lucide-react';
import {
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  resetFirebaseConfigToDefault,
  isUsingCustomFirebaseConfig,
  FirebaseConfigObject,
} from '../services/firebase';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<FirebaseConfigObject>(getActiveFirebaseConfig);
  const [pasteSnippet, setPasteSnippet] = useState<string>('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState<boolean>(isUsingCustomFirebaseConfig);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setConfig(getActiveFirebaseConfig());
    setIsCustom(isUsingCustomFirebaseConfig());
  }, [isOpen]);

  const handleParseAndApplySnippet = () => {
    setPasteError(null);
    if (!pasteSnippet.trim()) {
      setPasteError('Por favor, cole o código ou JSON do Firebase.');
      return;
    }

    try {
      let text = pasteSnippet.trim();

      // If user pasted JS code like: const firebaseConfig = { ... };
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        text = match[0];
      }

      // Convert JS object format to valid JSON
      let jsonString = text
        .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":') // quote unquoted keys
        .replace(/'/g, '"') // replace single quotes with double quotes
        .replace(/,\s*\}/g, '}') // remove trailing commas
        .replace(/,\s*\]/g, ']');

      const parsed = JSON.parse(jsonString);

      if (!parsed.projectId || !parsed.apiKey) {
        setPasteError('O código colado não contém "projectId" ou "apiKey" válidos.');
        return;
      }

      const updatedConfig: FirebaseConfigObject = {
        projectId: parsed.projectId || '',
        appId: parsed.appId || '',
        apiKey: parsed.apiKey || '',
        authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
        storageBucket: parsed.storageBucket || `${parsed.projectId}.appspot.com`,
        messagingSenderId: parsed.messagingSenderId || '',
        measurementId: parsed.measurementId || '',
        firestoreDatabaseId: parsed.firestoreDatabaseId || '',
      };

      setConfig(updatedConfig);
      saveCustomFirebaseConfig(updatedConfig);
      setIsCustom(true);
      setSavedSuccess(true);

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e: any) {
      setPasteError('Não foi possível ler o código colado. Certifique-se de colar o bloco "const firebaseConfig = { ... }"');
    }
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.projectId.trim() || !config.apiKey.trim()) {
      alert('Preencha pelo menos o Project ID e a API Key do seu Firebase.');
      return;
    }

    saveCustomFirebaseConfig({
      ...config,
      projectId: config.projectId.trim(),
      apiKey: config.apiKey.trim(),
      appId: config.appId.trim(),
      authDomain: config.authDomain?.trim() || `${config.projectId.trim()}.firebaseapp.com`,
      storageBucket: config.storageBucket?.trim() || `${config.projectId.trim()}.appspot.com`,
    });

    setIsCustom(true);
    setSavedSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar para a configuração padrão do Firebase?')) {
      resetFirebaseConfigToDefault();
      setIsCustom(false);
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative text-white my-auto overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black tracking-tight text-white">
                Conectar Meu Próprio Firebase
              </h3>
              {isCustom ? (
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Conta Própria Ativa
                </span>
              ) : (
                <span className="bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Projeto Padrão
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Vincule sua conta Google (<strong>rs3043017@gmail.com</strong>) ou qualquer projeto Firebase.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-1 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm">
              <Check className="w-5 h-5" />
              <span>Firebase Conectado com Sucesso!</span>
            </div>
            <p className="text-xs text-emerald-200">
              Recarregando o aplicativo para iniciar a sincronização com seu projeto...
            </p>
          </div>
        )}

        {/* Instructions Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300 mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-amber-300 uppercase text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Como pegar a configuração no Firebase Console:
            </span>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300 font-bold text-[11px] flex items-center gap-1 underline"
            >
              <span>Abrir Firebase</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-slate-300 font-medium">
            <li>Acesse o Firebase Console com a conta <strong>rs3043017@gmail.com</strong>.</li>
            <li>Abra o projeto (ex: <strong>Controle agricola</strong>).</li>
            <li>Clique na engrenagem ⚙️ (<strong>Configurações do projeto</strong>) &gt; aba <strong>Geral</strong>.</li>
            <li>Role até <strong>"Seus aplicativos"</strong> e copie o bloco <code>const firebaseConfig = &#123; ... &#125;</code>.</li>
          </ol>
        </div>

        {/* Option 1: Quick Paste Snippet */}
        <div className="space-y-3 mb-5 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
          <label className="block text-xs font-black text-white uppercase tracking-wider">
            Opção 1: Colar Bloco de Configuração (Rápido)
          </label>
          <textarea
            value={pasteSnippet}
            onChange={(e) => {
              setPasteSnippet(e.target.value);
              setPasteError(null);
            }}
            placeholder={`Cole aqui o código gerado no Firebase Console, por exemplo:\n\nconst firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "controle-agricola-...",\n  appId: "1:..."\n};`}
            rows={4}
            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-amber-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
          />

          {pasteError && (
            <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pasteError}</span>
            </p>
          )}

          <button
            type="button"
            onClick={handleParseAndApplySnippet}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Aplicar e Conectar Firebase</span>
          </button>
        </div>

        {/* Option 2: Manual Fields */}
        <details className="group space-y-3 p-4 bg-slate-950/40 rounded-2xl border border-slate-800 text-xs">
          <summary className="font-bold text-slate-300 cursor-pointer select-none hover:text-white flex items-center justify-between">
            <span>Opção 2: Preencher Campos Manualmente</span>
            <span className="text-[10px] text-slate-500 group-open:rotate-180 transition">▼</span>
          </summary>

          <form onSubmit={handleSaveManual} className="space-y-3 pt-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Project ID (ID do Projeto):</label>
              <input
                type="text"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                placeholder="ex: controle-agricola-12345"
                required
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">API Key (Chave de API):</label>
                <input
                  type="text"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">App ID:</label>
                <input
                  type="text"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  placeholder="1:123456789:web:abcdef"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Auth Domain (opcional):</label>
                <input
                  type="text"
                  value={config.authDomain || ''}
                  onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                  placeholder="projeto.firebaseapp.com"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Database ID (opcional):</label>
                <input
                  type="text"
                  value={config.firestoreDatabaseId || ''}
                  onChange={(e) => setConfig({ ...config, firestoreDatabaseId: e.target.value })}
                  placeholder="(default) ou ID customizado"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer"
            >
              Salvar Configuração Manual
            </button>
          </form>
        </details>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          {isCustom ? (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Projeto Padrão</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              Projeto ativo: <span className="font-mono text-amber-300">{config.projectId}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer ml-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
