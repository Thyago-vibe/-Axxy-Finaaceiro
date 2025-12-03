import React from 'react';
import { LayoutDashboard, Receipt, PieChart, Tag, Settings, Target, Sparkles, Wallet, Calculator, BellRing, HeartPulse, Share2, TrendingUp } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'interconnected-summary', label: 'Resumo Interligado', icon: Share2 },
    { id: 'transactions', label: 'Transações', icon: Receipt },
    { id: 'budgets', label: 'Orçamentos', icon: Calculator },
    { id: 'accounts', label: 'Minhas Contas', icon: Wallet },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'financial-health', label: 'Saúde Financeira', icon: HeartPulse },
    { id: 'ai-assist', label: 'Análise de Vazamento', icon: Sparkles },
    { id: 'predictive-analysis', label: 'Análise Preditiva', icon: TrendingUp },
    { id: 'alerts', label: 'Alertas', icon: BellRing },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0b120f] border-r border-axxy-border h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-axxy-primary rounded-br-xl rounded-tl-xl flex-shrink-0"></div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Axxy</h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${
                isActive
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
  );
};