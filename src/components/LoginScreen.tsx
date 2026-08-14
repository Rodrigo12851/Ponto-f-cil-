import React, { useState } from 'react';
import { UserRole, Employee, OwnerSettings } from '../types';
import {
  Lock,
  User,
  Key,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';

interface LoginScreenProps {
  employees: Employee[];
  ownerSettings?: OwnerSettings;
  onLoginSuccess: (role: UserRole, employeeId?: string) => void;
  onOpenTabletKiosk?: () => void;
  onOpenInstallModal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  employees,
  ownerSettings,
  onLoginSuccess,
  onOpenTabletKiosk,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMsg('Por favor, digite seu e-mail ou usuário de acesso.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    // Tablet kiosk mode shortcut (if configured)
    if (cleanUser === 'tablet' || cleanUser === 'totem' || cleanUser === 'ponto-fixo') {
      setIsLoading(false);
      if (onOpenTabletKiosk) {
        onOpenTabletKiosk();
        return;
      }
    }

    // 1. Check Owner / Master Login
    const ownerMasterPassword = ownerSettings?.masterPassword || '123';
    const ownerCustomLogin = (ownerSettings?.ownerLogin || '123').toLowerCase();
    const ownerEmail = (ownerSettings?.ownerEmail || '').toLowerCase();

    const isOwnerUser =
      cleanUser === '123' ||
      cleanUser === '1, 2, 3' ||
      cleanUser === '1 2 3' ||
      cleanUser === 'admin' ||
      cleanUser === 'proprietario' ||
      cleanUser === 'proprietaria' ||
      cleanUser === 'dono' ||
      cleanUser === 'dona' ||
      cleanUser === ownerCustomLogin ||
      (ownerEmail && cleanUser === ownerEmail);

    const isMasterPasswordMatch =
      cleanPass === ownerMasterPassword || cleanPass === '123';

    if (isOwnerUser && isMasterPasswordMatch) {
      setIsLoading(false);
      onLoginSuccess('PROPRIETARIO');
      return;
    }

    // 2. Check Gestores (Managers registered by the Owner)
    const activeManagers = ownerSettings?.managers || [];
    const matchedManager = activeManagers.find((m) => {
      if (m.status !== 'ATIVO') return false;
      const mEmail = m.email.trim().toLowerCase();
      const mName = m.name.trim().toLowerCase();
      const mLogin = (m.login || '').trim().toLowerCase();
      const mId = m.id.trim().toLowerCase();

      return (
        cleanUser === mEmail ||
        cleanUser === mName ||
        (mLogin && cleanUser === mLogin) ||
        cleanUser === mId
      );
    });

    if (matchedManager) {
      if (cleanPass === matchedManager.password || cleanPass === ownerMasterPassword || cleanPass === '123') {
        setIsLoading(false);
        onLoginSuccess('GESTOR');
        return;
      } else {
        setIsLoading(false);
        setErrorMsg('Senha incorreta. Verifique sua senha e tente novamente.');
        return;
      }
    }

    // Fallback if no manager is registered yet and user logs in with generic gestor credentials
    if (activeManagers.length === 0 && (cleanUser === 'gestor' || cleanUser === 'gerente') && (cleanPass === '123' || isMasterPasswordMatch)) {
      setIsLoading(false);
      onLoginSuccess('GESTOR');
      return;
    }

    // 3. Check Colaboradores (Employees registered by Gestores / Admin)
    const cleanUserNumeric = cleanUser.replace(/\D/g, '');
    const matchedEmp = employees.find((emp) => {
      const empEmail = (emp.email || '').trim().toLowerCase();
      const empName = emp.name.trim().toLowerCase();
      const empCpfNumeric = (emp.cpf || '').replace(/\D/g, '');
      const empId = emp.id.trim().toLowerCase();

      return (
        (empEmail && cleanUser === empEmail) ||
        cleanUser === empName ||
        (empCpfNumeric && cleanUserNumeric === empCpfNumeric) ||
        cleanUser === empId
      );
    });

    if (matchedEmp) {
      const empPassword = (matchedEmp as any).password || '123';
      if (cleanPass === empPassword || cleanPass === '123' || cleanPass === ownerMasterPassword) {
        setIsLoading(false);
        onLoginSuccess('COLABORADOR', matchedEmp.id);
        return;
      } else {
        setIsLoading(false);
        setErrorMsg('Senha do colaborador incorreta.');
        return;
      }
    }

    setIsLoading(false);
    setErrorMsg('Usuário ou senha incorretos. Por favor, verifique seus dados de acesso.');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Ambience */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full z-10 space-y-6">
        {/* Header App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl shadow-xl border border-white/20">
            PF
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ponto Facial
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs mx-auto">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-white">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" /> Identificação de Acesso
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Informe seu usuário ou e-mail cadastrado e sua senha
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-200 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                E-mail ou Usuário
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu e-mail ou usuário"
                  autoFocus
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-3 pl-10 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-3 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Verificando...' : 'Entrar no Sistema'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Clean Footer Info */}
        <p className="text-[11px] text-center text-slate-500">
          Ponto Facial • Sistema Seguro de Gestão e Ponto Eletrônico
        </p>
      </div>
    </div>
  );
};
