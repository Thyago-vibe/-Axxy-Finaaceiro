
import React from 'react';
import { LayoutDashboard, Receipt, PieChart, Tag, Settings, Target, Sparkles, Wallet, Calculator, BellRing, HeartPulse, TrendingUp, X, Landmark, Bot, Calendar, Coins } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendário Financeiro', icon: Calendar },
    { id: 'transactions', label: 'Transações', icon: Receipt },
    { id: 'allocation', label: 'Alocação Quinzenal', icon: PieChart },
    { id: 'budgets', label: 'Projetos de Vida', icon: Target },
    { id: 'accounts', label: 'Minhas Contas', icon: Wallet },
    { id: 'net-worth', label: 'Patrimônio Líquido', icon: Landmark },
    { id: 'investments', label: 'Investimentos', icon: Coins },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'categories', label: 'Categorias', icon: Tag },
    // Metas agora estão integradas ao Planejamento Inteligente
    { id: 'financial-health', label: 'Saúde Financeira', icon: HeartPulse },
    { id: 'ai-assist', label: 'Análise de Vazamento', icon: Sparkles },
    { id: 'predictive-analysis', label: 'Análise Preditiva', icon: TrendingUp },
    { id: 'alerts', label: 'Alertas', icon: BellRing },
    { id: 'ai-settings', label: 'Configurações da IA', icon: Bot },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleItemClick = (id: string) => {
    setView(id);
    onClose(); // Close sidebar on mobile when item is clicked
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-[#0b120f] border-r border-axxy-border 
          flex flex-col z-50 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0
        `}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-axxy-primary rounded-br-xl rounded-tl-xl flex-shrink-0"></div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Axxy</h1>
          </div>
          {/* Close Button (Mobile Only) */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${isActive
                  ? 'bg-axxy-primary/10 text-axxy-primary'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-axxy-primary' : 'text-gray-400'}`} />
                <span className="whitespace-nowrap truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
