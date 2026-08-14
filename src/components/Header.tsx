import React, { useRef, useState } from 'react';
import { Shield, User, Clock, MapPin, Menu, Sparkles, Camera, Check, Loader2, LogOut, Smartphone } from 'lucide-react';
import { Employee, UserRole } from '../types';
import { getBrazilianFullDate } from '../utils/timeFormatters';
import { processProfilePhoto } from '../utils/imageHelper';

interface HeaderProps {
  currentEmployee?: Employee | null;
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  isAdminView: boolean;
  onToggleAdminView: (isAdmin: boolean) => void;
  onOpenMenu: () => void;
  onUpdateEmployee?: (employeeId: string, updatedData: Partial<Employee>) => void;
  onLogout?: () => void;
  currentUserRole?: UserRole;
  onOpenInstallModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentEmployee,
  employees,
  onSelectEmployee,
  isAdminView,
  onToggleAdminView,
  onOpenMenu,
  onUpdateEmployee,
  onLogout,
  currentUserRole = 'COLABORADOR',
  onOpenInstallModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEmployee) return;

    try {
      setIsUploading(true);
      const photoDataUrl = await processProfilePhoto(file, 400, 400, 0.88);
      if (onUpdateEmployee) {
        onUpdateEmployee(currentEmployee.id, { avatar: photoDataUrl });
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } catch (err: any) {
      alert(err?.message || 'Erro ao carregar a foto do perfil.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header
      className={`relative text-white transition-colors duration-300 ${
        isAdminView
          ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 shadow-lg border-b border-slate-700/50'
          : 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 shadow-lg shadow-blue-500/10'
      } rounded-b-2xl p-4 md:p-6 mb-2`}
    >
      <div className="flex flex-col gap-4">
        {/* Top bar: Brand & Action icons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMenu}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition backdrop-blur-md cursor-pointer flex items-center justify-center"
              aria-label="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white text-blue-700 font-extrabold flex items-center justify-center text-sm shadow-md">
                PF
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  PONTO FACIAL
                </h1>
                <span className="text-[10px] sm:text-xs text-blue-100 opacity-90 font-medium">
                  {getBrazilianFullDate()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Install PWA button */}
            {onOpenInstallModal && (
              <button
                type="button"
                onClick={onOpenInstallModal}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Instalar aplicativo no celular ou computador"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            {/* Logout button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white hover:text-rose-200 border border-white/10 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Sair da Conta / Trocar Usuário"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* User / Mode Profile Bar */}
        {currentUserRole === 'PROPRIETARIO' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-700/60 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  👑 Master
                </span>
                <h2 className="text-xs sm:text-sm md:text-base font-extrabold leading-tight truncate">
                  Painel do Proprietário
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-200 font-medium truncate mt-0.5">
                Controle Geral da Empresa, Gestão de Gestores & Configurações Globais
              </p>
            </div>
            <div className="text-[10px] sm:text-xs text-amber-200 font-bold bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 shrink-0">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>Sede Principal</span>
            </div>
          </div>
        ) : currentUserRole === 'GESTOR' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 min-w-0">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-bold leading-tight flex items-center gap-2 truncate">
                <span>Painel do Gestor de Equipe</span> <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium truncate">
                Monitoramento de presença, mapa de geolocalização e relatórios em tempo real
              </p>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-300 font-medium bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span>{employees.filter((e) => e.isOnline).length} de {employees.length} colaboradores ativos</span>
            </div>
          </div>
        ) : currentEmployee ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Profile Avatar with Camera Upload Badge */}
              <div className="relative group shrink-0">
                <img
                  src={currentEmployee.avatar}
                  alt={currentEmployee.name}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/90 shadow-md transition group-hover:brightness-95 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Clique para alterar sua foto de perfil"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 bg-amber-400 hover:bg-amber-300 text-slate-950 p-1.5 rounded-full shadow-md border-2 border-blue-600 transition transform group-hover:scale-110 cursor-pointer flex items-center justify-center"
                  title="Alterar foto de perfil (Galeria ou Câmera)"
                >
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
                  ) : (
                    <Camera className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm md:text-base font-extrabold leading-tight truncate">
                    <span>Olá, {currentEmployee.name}!</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] bg-white/15 hover:bg-white/25 text-white/90 px-2 py-0.5 rounded-lg border border-white/20 transition flex items-center gap-1 shrink-0 font-semibold cursor-pointer"
                    title="Carregar foto da galeria"
                  >
                    <Camera className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Alterar Foto</span>
                  </button>
                </div>
                <p className="text-[11px] sm:text-xs text-blue-100/90 font-medium truncate">
                  {currentEmployee.role} • <span className="opacity-80">{currentEmployee.department}</span>
                </p>
              </div>
            </div>

            {/* Toast Notification */}
            {showToast && (
              <div className="bg-emerald-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl shadow-lg border border-emerald-300 flex items-center gap-1.5 animate-in fade-in shrink-0">
                <Check className="w-3.5 h-3.5" /> Foto de perfil atualizada com sucesso!
              </div>
            )}

            <div className="text-right text-[10px] sm:text-xs text-blue-100/90 font-medium flex items-center gap-1 bg-black/10 px-2.5 py-1 rounded-xl border border-white/10 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-blue-200" />
              <span>Sede Principal</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 min-w-0">
            <div className="text-xs text-blue-100">
              <span className="font-bold text-white">Banco de Dados Limpo</span> • Nenhum colaborador cadastrado
            </div>
            <div className="text-right text-[10px] text-blue-200 font-semibold">
              Pronto para novos cadastros
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
