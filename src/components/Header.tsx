import React, { useRef, useState } from 'react';
import { Shield, User, Clock, MapPin, Bell, Menu, Sparkles, Camera, Check, Loader2, LogOut } from 'lucide-react';
import { Employee, UserRole } from '../types';
import { getBrazilianFullDate } from '../utils/timeFormatters';
import { processProfilePhoto } from '../utils/imageHelper';

interface HeaderProps {
  currentEmployee: Employee;
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  isAdminView: boolean;
  onToggleAdminView: (isAdmin: boolean) => void;
  onOpenMenu: () => void;
  onUpdateEmployee?: (employeeId: string, updatedData: Partial<Employee>) => void;
  onLogout?: () => void;
  currentUserRole?: UserRole;
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      <div className="max-w-7xl mx-auto">
        {/* Top bar with logo, hamburger menu, and admin switch */}
        <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onOpenMenu}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer backdrop-blur-md shrink-0"
              title="Menu Principal"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white text-xs sm:text-sm shadow-inner shrink-0">
                PF
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight leading-none flex items-center gap-1.5 truncate">
                  Ponto Facial
                  {isAdminView && (
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 shrink-0">
                      <Shield className="w-2.5 h-2.5 fill-slate-950" /> Admin
                    </span>
                  )}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-blue-100/80 font-medium truncate hidden sm:block">
                  Gestão Inteligente de Equipe
                </p>
              </div>
            </div>
          </div>

          {/* User selector & Mode switcher - Available only for Manager/Owner */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentUserRole !== 'COLABORADOR' && (
              <>
                {!isAdminView ? (
                  <div className="relative">
                    <select
                      value={currentEmployee.id}
                      onChange={(e) => {
                        const emp = employees.find((x) => x.id === e.target.value);
                        if (emp) onSelectEmployee(emp);
                      }}
                      className="bg-white/15 text-white text-[11px] sm:text-xs font-semibold py-1.5 pl-2 pr-6 max-w-[95px] xs:max-w-[120px] sm:max-w-[200px] rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer backdrop-blur-md appearance-none truncate"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id} className="text-slate-900 font-medium">
                          👤 {emp.name} ({emp.department})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-white/80">
                      <User className="w-3 h-3" />
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={() => onToggleAdminView(!isAdminView)}
                  className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 ${
                    isAdminView
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 text-white border border-white/20'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{isAdminView ? 'Modo Funcionário' : 'Modo Gestor'}</span>
                  <span className="inline sm:hidden">{isAdminView ? 'Funcionário' : 'Gestor'}</span>
                </button>
              </>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-400/30 transition shadow-sm cursor-pointer shrink-0 flex items-center gap-1"
                title="Sair / Trocar Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* User Info Header based on currentUserRole */}
        {currentUserRole === 'PROPRIETARIO' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/30 min-w-0">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-extrabold leading-tight flex items-center gap-2 text-amber-300 truncate">
                <span>👑 Acesso Master do Proprietário</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-100/80 font-medium truncate">
                Gestão de senhas mestras e credenciais de acesso dos gestores da empresa
              </p>
            </div>
            <div className="text-[10px] sm:text-xs text-amber-200 font-bold bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-500/40 flex items-center gap-1.5 shrink-0">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
        ) : (
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
              <Clock className="w-3 h-3 text-blue-200 shrink-0" />
              <span className="truncate">{getBrazilianFullDate()}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
