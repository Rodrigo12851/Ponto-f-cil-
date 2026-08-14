import React, { useState } from 'react';
import { UserRole, Employee } from '../types';
import {
  Lock,
  User,
  Shield,
  Crown,
  Key,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  Briefcase,
  Users,
  Tablet,
  Smartphone,
  Trash2,
} from 'lucide-react';

interface LoginScreenProps {
  employees: Employee[];
  onLoginSuccess: (role: UserRole, employeeId?: string) => void;
  onOpenTabletKiosk?: () => void;
  onOpenInstallModal?: () => void;
  onClearDatabase?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  employees,
  onLoginSuccess,
  onOpenTabletKiosk,
  onOpenInstallModal,
  onClearDatabase,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMsg('Por favor, informe o nome de usuário.');
      return;
    }

    if (cleanPass !== '123' && cleanPass !== '1234') {
      setErrorMsg('Senha incorreta. A senha padrão para testes é: 123 ou 1234');
      return;
    }

    // Check tablet kiosk login
    if (cleanUser === 'tablet' || cleanUser === 'totem' || cleanUser === 'ponto-fixo' || cleanUser === 'kiosk') {
      if (onOpenTabletKiosk) {
        onOpenTabletKiosk();
        return;
      }
    }

    if (cleanUser === 'gestor' || cleanUser === 'maria' || cleanUser === 'gerente') {
      onLoginSuccess('GESTOR');
      return;
    }

    if (cleanUser === 'dona' || cleanUser === 'admin' || cleanUser === 'proprietario' || cleanUser === 'ana') {
      onLoginSuccess('PROPRIETARIO');
      return;
    }

    if (cleanUser === 'funcionario' || cleanUser === 'colaborador') {
      if (employees.length > 0) {
        onLoginSuccess('COLABORADOR', employees[0].id);
        return;
      } else {
        setErrorMsg('Nenhum colaborador cadastrado ainda. Acesse como "gestor" ou "dona" para cadastrar seu primeiro colaborador.');
        return;
      }
    }

    // Search in existing employees
    const matchedEmp = employees.find(
      (e) =>
        e.name.toLowerCase().includes(cleanUser) ||
        (e.email && e.email.toLowerCase().includes(cleanUser)) ||
        (e.cpf && e.cpf.replace(/\D/g, '') === cleanUser.replace(/\D/g, ''))
    );

    if (matchedEmp) {
      onLoginSuccess('COLABORADOR', matchedEmp.id);
      return;
    }

    setErrorMsg('Usuário não encontrado. Utilize: "gestor" ou "dona" (Senha: 123)');
  };

  const handleQuickLogin = (role: UserRole, login: string, empId?: string) => {
    setUsername(login);
    setPassword('123');
    setErrorMsg(null);
    setTimeout(() => {
      onLoginSuccess(role, empId);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full z-10 space-y-4">
        {/* PWA Install Banner */}
        {onOpenInstallModal && (
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 hover:from-blue-600/40 hover:to-purple-600/40 border border-blue-400/30 rounded-2xl flex items-center justify-between text-white text-xs font-bold transition shadow-lg backdrop-blur-md cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-blue-500/30 text-amber-300">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-left">
                <strong className="text-white block">Instalar Aplicativo PWA</strong>
                <span className="text-[10px] text-blue-200 font-normal">Acesse direto da tela inicial no celular ou PC</span>
              </span>
            </div>
            <span className="text-[10px] font-black bg-blue-500/40 text-blue-200 px-2.5 py-1 rounded-xl uppercase border border-blue-400/40 group-hover:scale-105 transition">
              Instalar
            </span>
          </button>
        )}

        {/* Header App Branding */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl shadow-xl border border-white/20">
            PF
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ponto Facial SaaS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs mx-auto">
            Sistema Inteligente de Ponto Eletrônico & Gestão de Equipes
          </p>
        </div>

        {/* Main Login Form Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" /> Acessar a Conta
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Digite suas credenciais ou selecione um perfil abaixo
              </p>
            </div>
            <span className="text-[10px] font-extrabold bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-full uppercase">
              Senha: 123
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-200 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Usuário / Login
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: gestor ou dona"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite 123"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              ENTRAR NO SISTEMA <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Tablet Kiosk Shortcut Button */}
          {onOpenTabletKiosk && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenTabletKiosk}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-900/40 border border-indigo-400/50 flex items-center justify-between cursor-pointer group transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-400 text-slate-950 rounded-xl group-hover:scale-110 transition">
                    <Tablet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>📱 MODO TABLET (PONTO FIXO NA SEDE)</span>
                    </div>
                    <div className="text-[10px] font-medium text-indigo-200">
                      Reconhecimento de 3 fotos + Confirmação rápida
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition" />
              </button>
            </div>
          )}

          {/* Quick Selection Shortcuts */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              ⚡ Atalhos de Acesso Rápido (Senha: 123)
            </span>

            {employees.length === 0 ? (
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-3 text-center space-y-1">
                <p className="text-xs font-bold text-blue-300 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Banco de Dados Limpo (0 colaboradores)</span>
                </p>
                <p className="text-[11px] text-slate-300 font-medium">
                  Acesse como <strong>Dona</strong> ou <strong>Gestor</strong> para cadastrar seus colaboradores com foto e biometria.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              {/* Dona App Account */}
              <button
                type="button"
                onClick={() => handleQuickLogin('PROPRIETARIO', 'dona')}
                className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-700 to-amber-800 text-white font-black flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition">
                    <Crown className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-xs text-white truncate">
                        Ana Oliveira (Dona do App)
                      </h3>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase bg-purple-100 text-purple-800 border-purple-200">
                        Proprietária
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      Login: <strong className="text-white font-mono">dona</strong> | Senha: <strong className="text-amber-400 font-mono">123</strong>
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-extrabold text-blue-400 group-hover:translate-x-1 transition flex items-center gap-0.5 shrink-0 pl-2">
                  Entrar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Gestor RH Account */}
              <button
                type="button"
                onClick={() => handleQuickLogin('GESTOR', 'gestor')}
                className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-xs text-white truncate">
                        Maria Santos (Gestora RH)
                      </h3>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase bg-emerald-100 text-emerald-800 border-emerald-200">
                        Gestor
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      Login: <strong className="text-white font-mono">gestor</strong> | Senha: <strong className="text-amber-400 font-mono">123</strong>
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-extrabold text-emerald-400 group-hover:translate-x-1 transition flex items-center gap-0.5 shrink-0 pl-2">
                  Entrar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Dynamic Employee Accounts if present */}
              {employees.slice(0, 3).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleQuickLogin('COLABORADOR', emp.name.toLowerCase().split(' ')[0], emp.id)}
                  className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 group-hover:scale-105 transition"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-xs text-white truncate">
                          {emp.name}
                        </h3>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase bg-blue-100 text-blue-800 border-blue-200">
                          Colaborador
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {emp.role} • <strong className="text-amber-400 font-mono">123</strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-extrabold text-blue-400 group-hover:translate-x-1 transition flex items-center gap-0.5 shrink-0 pl-2">
                    Testar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Database Footer Action */}
        {onClearDatabase && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onClearDatabase}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold hover:underline inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar Contas de Teste e Zerar Banco
            </button>
          </div>
        )}

        {/* Footer info */}
        <p className="text-[11px] text-center text-slate-500">
          Ponto Facial © 2026 • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
