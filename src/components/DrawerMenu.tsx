import React, { useRef, useState } from 'react';
import { Employee, ActiveTab, UserRole } from '../types';
import {
  Home,
  Calendar,
  BarChart3,
  Shield,
  X,
  UserCheck,
  Building,
  LogOut,
  Sparkles,
  MapPin,
  Clock,
  Camera,
  Loader2,
  Check,
  Crown,
  Key,
  Lock,
} from 'lucide-react';
import { processProfilePhoto } from '../utils/imageHelper';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentEmployee: Employee;
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  isAdminView: boolean;
  onToggleAdminView: (isAdmin: boolean) => void;
  onUpdateEmployee?: (employeeId: string, updatedData: Partial<Employee>) => void;
  currentUserRole: UserRole;
  onSwitchRole: (role: UserRole) => void;
  masterPassword?: string;
  onLogout?: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentEmployee,
  employees,
  onSelectEmployee,
  isAdminView,
  onToggleAdminView,
  onUpdateEmployee,
  currentUserRole,
  onSwitchRole,
  masterPassword = '123',
  onLogout,
}) => {
  const drawerFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  // Owner unlock password prompt modal state
  const [showOwnerLoginModal, setShowOwnerLoginModal] = useState<boolean>(false);
  const [inputMasterPass, setInputMasterPass] = useState<string>('');
  const [passError, setPassError] = useState<boolean>(false);

  const handleOwnerUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMasterPass === masterPassword || inputMasterPass === '123') {
      onSwitchRole('PROPRIETARIO');
      setShowOwnerLoginModal(false);
      setInputMasterPass('');
      setPassError(false);
      onSelectTab('proprietario');
      onClose();
    } else {
      setPassError(true);
    }
  };

  const handleDrawerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const photoDataUrl = await processProfilePhoto(file, 400, 400, 0.88);
      if (onUpdateEmployee) {
        onUpdateEmployee(currentEmployee.id, { avatar: photoDataUrl });
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao carregar a foto do perfil.');
    } finally {
      setIsUploading(false);
      if (drawerFileInputRef.current) drawerFileInputRef.current.value = '';
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      {/* Dark Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
      />

      {/* Side Content Panel */}
      <div className="absolute top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                PF
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                  <span>Ponto Facial</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Gestão de Equipe & GPS</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Badge & Profile Photo Upload */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mb-5 relative">
            <div className="flex items-center gap-3">
              <div className="relative group shrink-0">
                <img
                  src={currentEmployee.avatar}
                  alt={currentEmployee.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-300 shadow-xs cursor-pointer transition group-hover:brightness-90"
                  onClick={() => drawerFileInputRef.current?.click()}
                  title="Alterar Foto de Perfil"
                />
                <button
                  type="button"
                  onClick={() => drawerFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full shadow-md border-2 border-white transition transform group-hover:scale-110 cursor-pointer flex items-center justify-center"
                  title="Alterar foto de perfil"
                >
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                  ) : (
                    <Camera className="w-3 h-3 text-white" />
                  )}
                </button>
                <input
                  ref={drawerFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDrawerFileChange}
                  className="hidden"
                />
              </div>

              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{currentEmployee.name}</p>
                <p className="text-[11px] text-slate-500 font-medium truncate">{currentEmployee.role}</p>

                <button
                  type="button"
                  onClick={() => drawerFileInputRef.current?.click()}
                  className="mt-1 text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3 h-3" /> Alterar foto do perfil
                </button>
              </div>
            </div>

            {showToast && (
              <div className="mt-2 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" /> Foto atualizada com sucesso!
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 px-3 mb-1 tracking-wider">
              Menu de Navegação
            </p>

            {currentUserRole === 'PROPRIETARIO' ? (
              <button
                onClick={() => {
                  onSelectTab('proprietario');
                  onClose();
                }}
                className={`w-full text-left px-3.5 py-3 rounded-xl font-bold text-xs flex items-center justify-between transition border ${
                  activeTab === 'proprietario'
                    ? 'bg-amber-100 text-amber-950 border-amber-300 font-black shadow-sm'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>👑 Cadastro de Gestores & Proprietário</span>
                </div>
                <span className="text-[9px] bg-amber-200 text-amber-950 font-black px-1.5 py-0.5 rounded uppercase">
                  Master
                </span>
              </button>
            ) : currentUserRole === 'GESTOR' ? (
              <>
                <button
                  onClick={() => {
                    onSelectTab('inicio');
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                    activeTab === 'inicio' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-4 h-4 text-blue-600" /> 🏠 Visão Geral da Equipe
                </button>

                <button
                  onClick={() => {
                    onSelectTab('historico');
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                    activeTab === 'historico' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-emerald-600" /> 📅 Histórico de Ponto
                </button>

                <button
                  onClick={() => {
                    onSelectTab('relatorios');
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                    activeTab === 'relatorios' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-purple-600" /> 📊 Relatórios em Tempo Real
                </button>

                <button
                  onClick={() => {
                    onSelectTab('admin');
                    onToggleAdminView(true);
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                    activeTab === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="w-4 h-4 text-indigo-600" /> 🛡️ Painel do Gestor (Admin)
                </button>
              </>
            ) : (
              /* COLABORADOR */
              <>
                <button
                  onClick={() => {
                    onSelectTab('inicio');
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                    activeTab === 'inicio' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-4 h-4 text-blue-600" /> 🏠 Início (Ponto Facial)
                </button>

                <button
                  onClick={() => {
                    onSelectTab('historico');
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                    activeTab === 'historico' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-emerald-600" /> 📅 Histórico de Ponto
                </button>
              </>
            )}
          </div>

          {/* Modal: Autenticação com Senha Mestra do Proprietário */}
          {showOwnerLoginModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl relative border border-slate-100">
                <button
                  onClick={() => setShowOwnerLoginModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                    <Crown className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      <span>Acesso do Proprietário</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Digite a senha mestra da empresa.</p>
                  </div>
                </div>

                <form onSubmit={handleOwnerUnlockSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Senha Mestra (Master):</label>
                    <input
                      type="password"
                      value={inputMasterPass}
                      onChange={(e) => {
                        setInputMasterPass(e.target.value);
                        setPassError(false);
                      }}
                      placeholder="Senha Mestra do Proprietário (Padrão: 123)"
                      autoFocus
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {passError && (
                    <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                      Senha mestra incorreta. Verifique e tente novamente.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>Desbloquear Área do Proprietário</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Quick Employee Switcher */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 px-3 mb-2 tracking-wider">
              Trocar Perfil de Teste
            </p>
            <div className="space-y-1">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    onSelectEmployee(emp);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    currentEmployee.id === emp.id
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{emp.name}</span>
                  <span className="text-[10px] text-slate-400">{emp.department}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair / Trocar de Conta</span>
            </button>
          )}
          <p className="text-[10px] text-slate-400 font-medium">
            Ponto Facial v2.5 • CLT & Portaria 671 MTP
          </p>
        </div>
      </div>
    </div>
  );
};
