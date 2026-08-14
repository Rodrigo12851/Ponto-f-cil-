import React, { useState } from 'react';
import {
  Crown,
  UserCheck,
  Plus,
  Key,
  ShieldAlert,
  Building,
  Check,
  X,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  Users,
  LogIn,
} from 'lucide-react';
import { OwnerSettings, ManagerUser, UserRole } from '../types';

interface OwnerPanelProps {
  ownerSettings: OwnerSettings;
  onUpdateOwnerSettings: (newSettings: OwnerSettings) => void;
  currentUserRole: UserRole;
  onSwitchRole: (role: UserRole, managerId?: string) => void;
  onOpenManagerDashboard: () => void;
  employeeCount?: number;
  onClearDatabase?: () => void;
  onLoadSampleData?: () => void;
}

export const OwnerPanel: React.FC<OwnerPanelProps> = ({
  ownerSettings,
  onUpdateOwnerSettings,
  currentUserRole,
  onSwitchRole,
  onOpenManagerDashboard,
  employeeCount = 0,
  onClearDatabase,
  onLoadSampleData,
}) => {
  // Modal state for Add/Edit Manager
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [editingManager, setEditingManager] = useState<ManagerUser | null>(null);

  // Manager Form State
  const [mgrName, setMgrName] = useState<string>('');
  const [mgrEmail, setMgrEmail] = useState<string>('');
  const [mgrPhone, setMgrPhone] = useState<string>('');
  const [mgrCompany, setMgrCompany] = useState<string>(ownerSettings.companyName || 'Empresa Sede Principal');
  const [mgrPassword, setMgrPassword] = useState<string>('');
  const [mgrRoleLabel, setMgrRoleLabel] = useState<string>('Gerente de Equipe & RH');
  const [mgrStatus, setMgrStatus] = useState<'ATIVO' | 'BLOQUEADO'>('ATIVO');

  // Master Settings Modal State
  const [showMasterSettingsModal, setShowMasterSettingsModal] = useState<boolean>(false);
  const [newMasterPassword, setNewMasterPassword] = useState<string>(ownerSettings.masterPassword);
  const [newOwnerName, setNewOwnerName] = useState<string>(ownerSettings.ownerName);
  const [newCompanyName, setNewCompanyName] = useState<string>(ownerSettings.companyName);

  // Toggle Password visibility states
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [showMasterPasswordInput, setShowMasterPasswordInput] = useState<boolean>(false);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingManager(null);
    setMgrName('');
    setMgrEmail('');
    setMgrPhone('');
    setMgrCompany(ownerSettings.companyName || 'Empresa Sede Principal');
    setMgrPassword('123');
    setMgrRoleLabel('Gerente de Equipe & RH');
    setMgrStatus('ATIVO');
    setShowManagerModal(true);
  };

  const handleOpenEditModal = (mgr: ManagerUser) => {
    setEditingManager(mgr);
    setMgrName(mgr.name);
    setMgrEmail(mgr.email);
    setMgrPhone(mgr.phone || '');
    setMgrCompany(mgr.companyName);
    setMgrPassword(mgr.password);
    setMgrRoleLabel(mgr.roleLabel);
    setMgrStatus(mgr.status);
    setShowManagerModal(true);
  };

  const handleSaveManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgrName.trim() || !mgrEmail.trim() || !mgrPassword.trim()) {
      alert('Por favor, preencha o Nome, E-mail e Senha do Gestor.');
      return;
    }

    if (editingManager) {
      // Update existing
      const updatedList = ownerSettings.managers.map((m) =>
        m.id === editingManager.id
          ? {
              ...m,
              name: mgrName.trim(),
              email: mgrEmail.trim(),
              phone: mgrPhone.trim(),
              companyName: mgrCompany.trim(),
              password: mgrPassword.trim(),
              roleLabel: mgrRoleLabel.trim(),
              status: mgrStatus,
            }
          : m
      );

      onUpdateOwnerSettings({ ...ownerSettings, managers: updatedList });
      triggerToast('Cadastro do Gestor atualizado com sucesso!');
    } else {
      // Add new manager
      const newMgr: ManagerUser = {
        id: `mgr-${Date.now()}`,
        name: mgrName.trim(),
        email: mgrEmail.trim(),
        phone: mgrPhone.trim(),
        companyName: mgrCompany.trim(),
        password: mgrPassword.trim(),
        roleLabel: mgrRoleLabel.trim(),
        status: mgrStatus,
        createdAt: new Date().toLocaleDateString('pt-BR'),
      };

      onUpdateOwnerSettings({
        ...ownerSettings,
        managers: [...ownerSettings.managers, newMgr],
      });
      triggerToast('Novo Gestor cadastrado e acesso liberado!');
    }

    setShowManagerModal(false);
  };

  const handleToggleStatus = (id: string) => {
    const updatedList = ownerSettings.managers.map((m) => {
      if (m.id === id) {
        const nextStatus: 'ATIVO' | 'BLOQUEADO' = m.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO';
        return { ...m, status: nextStatus };
      }
      return m;
    });
    onUpdateOwnerSettings({ ...ownerSettings, managers: updatedList });
    triggerToast('Status de acesso do gestor alterado!');
  };

  const handleDeleteManager = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja revogar o acesso e excluir o gestor "${name}"?`)) {
      const updatedList = ownerSettings.managers.filter((m) => m.id !== id);
      onUpdateOwnerSettings({ ...ownerSettings, managers: updatedList });
      triggerToast('Acesso do gestor revogado com sucesso.');
    }
  };

  const handleSaveMasterSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterPassword.trim()) {
      alert('A Senha Mestra não pode ficar em branco.');
      return;
    }
    onUpdateOwnerSettings({
      ...ownerSettings,
      ownerName: newOwnerName.trim() || ownerSettings.ownerName,
      companyName: newCompanyName.trim() || ownerSettings.companyName,
      masterPassword: newMasterPassword.trim(),
    });
    setShowMasterSettingsModal(false);
    triggerToast('Configurações do Proprietário salvas!');
  };

  const togglePasswordVisible = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 animate-in slide-in-from-top">
          <Check className="w-4 h-4 text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Owner Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30 shrink-0">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Controle do Proprietário (Master)
                </span>
                <span className="text-[10px] text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded-md">
                  {ownerSettings.companyName}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                Área do Proprietário & Acessos da Empresa
              </h1>
              <p className="text-xs text-slate-300 mt-1 font-medium max-w-2xl">
                Como proprietário do sistema, você tem poder total para liberar ou revogar acessos, cadastrar os <strong>Gestores de Equipe</strong> e definir as senhas de entrada da sua empresa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => {
                setNewMasterPassword(ownerSettings.masterPassword);
                setNewOwnerName(ownerSettings.ownerName);
                setNewCompanyName(ownerSettings.companyName);
                setShowMasterSettingsModal(true);
              }}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl border border-white/20 transition cursor-pointer flex items-center gap-2"
            >
              <Key className="w-4 h-4 text-amber-300" />
              <span>Senha Mestra</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Cadastrar Novo Gestor</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Proprietário da Conta</p>
            <p className="font-black text-white text-sm truncate mt-0.5">{ownerSettings.ownerName}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Gestores Autorizados</p>
            <p className="font-black text-amber-300 text-sm mt-0.5">
              {ownerSettings.managers.filter((m) => m.status === 'ATIVO').length} de {ownerSettings.managers.length} Ativos
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Senha Mestra de Entrada</p>
            <p className="font-mono font-bold text-emerald-300 text-sm mt-0.5">
              •••••••• (Definida)
            </p>
          </div>
        </div>
      </div>

      {/* Restrição de Privacidade Callout Banner */}
      <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3 text-amber-950">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-black text-amber-900 text-xs uppercase tracking-wide">
            🔒 Regra de Privacidade e Ocultação do Gestor
          </h4>
          <p className="font-medium text-amber-900/90 mt-0.5 leading-relaxed">
            Quando um <strong>Gestor</strong> realiza o acesso utilizando o e-mail e a senha cadastrados por você abaixo, o sistema abre o <strong>Painel do Gestor (Gerenciamento de Colaboradores)</strong>. A <strong>Área do Proprietário fica 100% oculta</strong> e não aparece no menu para ele.
          </p>
        </div>
      </div>

      {/* Firebase Cloud Firestore Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-500/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-wide text-white">
                  Banco de Dados em Nuvem: Firebase Firestore
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sincronização em Tempo Real Ativa
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Todos os dados de colaboradores, marcações de ponto, biometria facial e configurações estão salvos no Firebase.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Projeto Firebase</p>
            <p className="font-mono font-bold text-amber-300 text-xs truncate mt-0.5">
              persuasive-feather-g6pck
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Base de Dados Firestore</p>
            <p className="font-mono font-bold text-slate-200 text-xs truncate mt-0.5">
              ai-studio-geopointteam-84bf224e
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Armazenamento & Segurança</p>
            <p className="font-bold text-emerald-300 text-xs mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Regras Ativas & Protegido
            </p>
          </div>
        </div>

        {/* Database Controls */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-300 font-medium">
            Colaboradores no Banco: <strong className="text-white font-mono">{employeeCount} cadastrados</strong>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onClearDatabase && (
              <button
                type="button"
                onClick={onClearDatabase}
                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Apagar todas as contas de teste e zerar banco de dados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Zerar Banco de Dados</span>
              </button>
            )}
            {onLoadSampleData && employeeCount === 0 && (
              <button
                type="button"
                onClick={onLoadSampleData}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-white/20"
                title="Carregar contas de demonstração"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Carregar Dados de Demonstração</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List of Registered Managers */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Gestores Cadastrados e Concessões de Acesso
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Gerencie quem tem permissão para gerenciar os funcionários da sua empresa.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adicionar Gestor</span>
          </button>
        </div>

        {ownerSettings.managers.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
            <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700 text-xs">Nenhum gestor cadastrado ainda</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Clique no botão acima para cadastrar o primeiro gestor da empresa e definir sua senha.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownerSettings.managers.map((mgr) => (
              <div
                key={mgr.id}
                className={`p-4 rounded-2xl border transition-all relative ${
                  mgr.status === 'ATIVO'
                    ? 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                        mgr.status === 'ATIVO'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {mgr.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-sm">
                          <span>{mgr.name}</span>
                        </h3>
                        {mgr.status === 'ATIVO' ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Acesso Ativo
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                            🚫 Acesso Bloqueado
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-indigo-700 font-extrabold mt-0.5">
                        {mgr.roleLabel}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Building className="w-3 h-3 text-slate-400" /> {mgr.companyName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manager Contact & Password Details */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{mgr.email}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{mgr.phone || 'Sem telefone'}</span>
                  </div>

                  {/* Password box */}
                  <div className="col-span-1 sm:col-span-2 bg-slate-100/80 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-700">Senha de Acesso do Gestor:</span>
                      <span className="font-mono font-black text-slate-900 text-xs">
                        {visiblePasswords[mgr.id] ? mgr.password : '••••••••'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePasswordVisible(mgr.id)}
                      className="p-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                      title={visiblePasswords[mgr.id] ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {visiblePasswords[mgr.id] ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Manager Actions Bar */}
                <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      onSwitchRole('GESTOR', mgr.id);
                      onOpenManagerDashboard();
                    }}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold text-[11px] rounded-lg border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                    title="Simular visualização do gestor (Área do Proprietário ficará oculta)"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Testar Como Gestor</span>
                  </button>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleToggleStatus(mgr.id)}
                      className={`px-2.5 py-1.5 font-extrabold text-[11px] rounded-lg border transition cursor-pointer ${
                        mgr.status === 'ATIVO'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {mgr.status === 'ATIVO' ? 'Bloquear' : 'Ativar Acesso'}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(mgr)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                      title="Editar cadastro / senha"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteManager(mgr.id, mgr.name)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                      title="Excluir gestor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Cadastrar / Editar Gestor */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 my-auto">
            <button
              onClick={() => setShowManagerModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl border border-indigo-200">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  <span>{editingManager ? 'Editar Cadastro do Gestor' : 'Cadastrar Novo Gestor'}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Defina o e-mail e a senha de acesso para que o gestor possa gerenciar os funcionários.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveManager} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo do Gestor:</label>
                <input
                  type="text"
                  value={mgrName}
                  onChange={(e) => setMgrName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail de Acesso (Login):</label>
                  <input
                    type="email"
                    value={mgrEmail}
                    onChange={(e) => setMgrEmail(e.target.value)}
                    placeholder="gestor@empresa.com"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp:</label>
                  <input
                    type="text"
                    value={mgrPhone}
                    onChange={(e) => setMgrPhone(e.target.value)}
                    placeholder="(11) 99999-8888"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo / Função do Gestor:</label>
                  <input
                    type="text"
                    value={mgrRoleLabel}
                    onChange={(e) => setMgrRoleLabel(e.target.value)}
                    placeholder="Ex: Gerente Geral de Loja"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Empresa / Unidade:</label>
                  <input
                    type="text"
                    value={mgrCompany}
                    onChange={(e) => setMgrCompany(e.target.value)}
                    placeholder="Nome da Empresa Sede"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-2">
                <label className="block font-black text-amber-950 text-xs">
                  🔑 Senha de Acesso do Gestor:
                </label>
                <div className="relative">
                  <input
                    type={showMasterPasswordInput ? 'text' : 'password'}
                    value={mgrPassword}
                    onChange={(e) => setMgrPassword(e.target.value)}
                    placeholder="Digite a senha do gestor"
                    required
                    className="w-full p-2.5 pr-10 rounded-xl border border-amber-300 bg-white font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPasswordInput(!showMasterPasswordInput)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showMasterPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-amber-800 font-medium">
                  Esta é a senha que o gestor usará para gerenciar a equipe. Ele <strong>não terá acesso à Área do Proprietário</strong>.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status de Permissão:</label>
                <select
                  value={mgrStatus}
                  onChange={(e) => setMgrStatus(e.target.value as 'ATIVO' | 'BLOQUEADO')}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none bg-white"
                >
                  <option value="ATIVO">🟢 Ativo (Acesso Liberado ao Painel de Funcionários)</option>
                  <option value="BLOQUEADO">🔴 Bloqueado (Acesso Suspenso)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingManager ? 'Atualizar Dados do Gestor' : 'Cadastrar Gestor & Conceder Acesso'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Senha Mestra do Proprietário */}
      {showMasterSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowMasterSettingsModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  <span>Configurações do Proprietário</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">Altere sua senha mestra de acesso total.</p>
              </div>
            </div>

            <form onSubmit={handleSaveMasterSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Proprietário:</label>
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Empresa Principal:</label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
                />
              </div>

              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                <label className="block font-black text-amber-950 text-xs">
                  🔑 Senha Mestra do Proprietário (Master):
                </label>
                <input
                  type="text"
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-mono font-black text-slate-900"
                />
                <p className="text-[10px] text-amber-900 font-medium">
                  Esta senha concede acesso irrestrito à Área do Proprietário e à gestão de gestores.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Configurações MESTRA</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
