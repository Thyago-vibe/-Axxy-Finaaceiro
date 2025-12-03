import React, { useState, useEffect } from 'react';
import { Plus, PenLine, Trash2, Utensils, Car, Gamepad2, Home, AlertCircle } from 'lucide-react';
import { Budget } from '../types';
import { djangoService } from '../services/djangoService';

export const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      djangoService.getBudgets()
        .then(setBudgets)
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'food': return Utensils;
      case 'transport': return Car;
      case 'leisure': return Gamepad2;
      case 'home': return Home;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-axxy-primary';
  };

  if (loading) return <div className="text-white">Carregando orçamentos...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-white tracking-tight">Orçamento Mensal</h2>
        <button className="flex items-center gap-2 bg-axxy-primary text-axxy-bg px-6 py-3 rounded-xl font-bold">
          <Plus size={20} /> <span>Adicionar Orçamento</span>
        </button>
      </header>

      <div className="flex flex-col gap-4">
        {budgets.map((budget) => {
          const Icon = getIcon(budget.icon);
          const percentage = (budget.spent / budget.limit) * 100;
          const status = getStatusColor(percentage);

          return (
            <div key={budget.id} className="bg-axxy-card p-6 rounded-3xl border border-axxy-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-gray-300 rounded-2xl bg-[#0b120f] border border-white/5 w-14 h-14 flex items-center justify-center">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold">{budget.category}</h3>
                  <p className="text-gray-500 text-xs">R$ {budget.spent} de R$ {budget.limit}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-32 h-2.5 rounded-full bg-[#0b120f] overflow-hidden">
                    <div className={`h-full rounded-full ${status}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <p className="text-white font-bold">{percentage.toFixed(0)}%</p>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && <div className="text-gray-500">Nenhum orçamento definido.</div>}
      </div>
    </div>
  );
};