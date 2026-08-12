import React from 'react';
import { ActiveTab, UserRole } from '../types';
import { Home, Calendar, BarChart3, Shield, Crown } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isAdminView: boolean;
  currentUserRole?: UserRole;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  isAdminView,
  currentUserRole = 'COLABORADOR',
}) => {
  if (currentUserRole === 'PROPRIETARIO') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 text-white backdrop-blur-md border-t border-amber-500/30 shadow-2xl py-2 px-3 notranslate" translate="no">
        <div className="max-w-md mx-auto flex items-center justify-center">
          <div className="flex items-center gap-2 py-1.5 px-4 bg-amber-500/15 text-amber-300 font-extrabold text-xs rounded-2xl border border-amber-500/30">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Painel do Proprietário • Gestão de Gestores</span>
          </div>
        </div>
      </nav>
    );
  }

  const isManager = currentUserRole === 'GESTOR' || isAdminView;

  const allTabs = [
    { id: 'inicio', label: 'Início', icon: Home, show: true },
    { id: 'historico', label: 'Histórico', icon: Calendar, show: true },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, show: isManager },
    { id: 'admin', label: 'Admin', icon: Shield, show: isManager },
  ] as const;

  const tabs = allTabs.filter((tab) => tab.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pt-2 pb-3 sm:pb-2.5 px-3 notranslate" translate="no">
      <div className="max-w-md md:max-w-xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as ActiveTab)}
              className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-4 rounded-2xl transition-all cursor-pointer min-w-[64px] ${
                isActive
                  ? 'text-blue-600 font-extrabold scale-105'
                  : 'text-slate-500 font-medium hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-tight notranslate" translate="no">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
