import React from 'react';
import { Employee, ActiveTab } from '../types';
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
} from 'lucide-react';

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
}) => {
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
                <h3 className="font-extrabold text-sm text-slate-900 leading-tight">Ponto Facial</h3>
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

          {/* User Badge */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mb-5">
            <div className="flex items-center gap-3">
              <img
                src={currentEmployee.avatar}
                alt={currentEmployee.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-xs"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{currentEmployee.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentEmployee.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 px-3 mb-1 tracking-wider">
              Menu de Navegação
            </p>

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
                isAdminView ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-4 h-4 text-indigo-600" /> 🛡️ Painel do Gestor (Admin)
            </button>
          </div>

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
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            Ponto Facial v2.5 • CLT & Portaria 671 MTP
          </p>
        </div>
      </div>
    </div>
  );
};
