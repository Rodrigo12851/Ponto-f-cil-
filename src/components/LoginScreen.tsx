import React, { useState } from 'react';
import { UserRole, Employee } from '../types';
import {
  Lock,
  User,
  Shield,
  Crown,
  Key,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  Briefcase,
  Users,
} from 'lucide-react';

interface LoginScreenProps {
  employees: Employee[];
  onLoginSuccess: (role: UserRole, employeeId?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  employees,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available testing accounts list
  const accountsList = [
    {
      role: 'COLABORADOR' as UserRole,
      login: 'funcionario',
      empId: employees[0]?.id || 'emp-1',
      name: 'João Silva (Funcionário)',
      roleTitle: 'Operador de Logística',
      desc: 'Bate ponto com biometria facial, vê localização e histórico próprio',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: User,
      gradient: 'from-blue-600 to-indigo-700',
    },
    {
      role: 'GESTOR' as UserRole,
      login: 'gestor',
      name: 'Maria Santos (Gestora)',
      roleTitle: 'Coordenadora de Recursos Humanos',
      desc: 'Supervisiona a equipe, vê bolinhas no quadrado em tempo real, fotos de ponto e gráficos',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Briefcase,
      gradient: 'from-emerald-600 to-teal-800',
    },
    {
      role: 'PROPRIETARIO' as UserRole,
      login: 'dona',
      name: 'Ana Oliveira (Dona do App)',
      roleTitle: 'Proprietária & Administradora Geral',
      desc: 'Acesso máster total: Painel SaaS da Empresa, regras de ponto, gestão de gestores e relatórios',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Crown,
      gradient: 'from-purple-700 to-amber-800',
    },
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMsg('Por favor, informe o nome de usuário.');
      return;
    }

    if (cleanPass !== '123') {
      setErrorMsg('Senha incorreta. A senha para todos os usuários é: 123');
      return;
    }

    // Check account matching
    if (cleanUser === 'funcionario' || cleanUser === 'joao' || cleanUser === 'colaborador') {
      onLoginSuccess('COLABORADOR', accountsList[0].empId);
      return;
    }

    if (cleanUser === 'gestor' || cleanUser === 'maria' || cleanUser === 'gerente') {
      onLoginSuccess('GESTOR');
      return;
    }

    if (cleanUser === 'dona' || cleanUser === 'admin' || cleanUser === 'proprietario' || cleanUser === 'ana') {
      onLoginSuccess('PROPRIETARIO');
      return;
    }

    // Default fallback if username matches any employee name or fallback to employee
    const matchedEmp = employees.find(
      (e) => e.name.toLowerCase().includes(cleanUser) || e.email.toLowerCase().includes(cleanUser)
    );

    if (matchedEmp) {
      onLoginSuccess('COLABORADOR', matchedEmp.id);
      return;
    }

    setErrorMsg('Usuário não encontrado. Utilize: "funcionario", "gestor" ou "dona" (Senha: 123)');
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

      <div className="max-w-lg w-full z-10 space-y-5">
        {/* Header App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl shadow-xl border border-white/20">
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
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-white">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" /> Acessar a Conta
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Digite suas credenciais de acesso ou use os atalhos abaixo
              </p>
            </div>
            <span className="text-[10px] font-extrabold bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-full uppercase">
              Senha Padrão: 123
            </span>
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
                Usuário / Login
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: funcionario, gestor ou dona"
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
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

          {/* Quick Selection Shortcuts for 3 Modes */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              ⚡ Atalhos para Testar os 3 Modos (Senha: 123)
            </span>

            <div className="space-y-2">
              {accountsList.map((acc) => {
                const IconComponent = acc.icon;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickLogin(acc.role, acc.login, acc.empId)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${acc.gradient} text-white font-black flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-xs text-white truncate">
                            {acc.name}
                          </h3>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${acc.badgeColor}`}
                          >
                            {acc.role === 'COLABORADOR' ? 'Funcionário' : acc.role === 'GESTOR' ? 'Gestor' : 'Dona App'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          Login: <strong className="text-white font-mono">{acc.login}</strong> | Senha: <strong className="text-amber-400 font-mono">123</strong>
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-extrabold text-blue-400 group-hover:translate-x-1 transition flex items-center gap-0.5 shrink-0 pl-2">
                      Testar <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-slate-500">
          Ponto Facial © 2026 • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
