
import React, { useState, useEffect } from 'react';
import { Plus, PenLine, Trash2, Utensils, Car, Gamepad2, Home, AlertCircle, ShoppingBag, Clapperboard, Plane, HeartPulse } from 'lucide-react';
import { Budget } from '../types';
import { apiService } from '../services/apiService';

export const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form State
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [icon, setIcon] = useState('food');

  const fetchBudgets = () => {
    setLoading(true);
    apiService.getBudgets()
      .then(setBudgets)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setCategory(budget.category);
      setLimit(budget.limit.toString());
      setIcon(budget.icon);
    } else {
      setEditingBudget(null);
      setCategory('');
      setLimit('');
      setIcon('food');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!category || !limit) return;

    const budgetData: Budget = {
      id: editingBudget?.id,
      category,
      limit: parseFloat(limit),
      spent: editingBudget?.spent || 0, // Mantém o gasto atual se editando
      icon
    };

    try {
      if (editingBudget) {
        await apiService.updateBudget(budgetData);
      } else {
        await apiService.createBudget(budgetData);
      }
      fetchBudgets();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await apiService.deleteBudget(id.toString());
        fetchBudgets();
      } catch (error) {
        console.error("Erro ao deletar orçamento:", error);
      }
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'food': return Utensils;
      case 'transport': return Car;
      case 'leisure': return Gamepad2;
      case 'home': return Home;
      case 'shopping': return ShoppingBag;
      case 'health': return HeartPulse;
      case 'travel': return Plane;
      case 'entertainment': return Clapperboard;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-axxy-primary'; // Green
  };

  const iconOptions = [
    { value: 'food', label: 'Alimentação', icon: Utensils },
    { value: 'transport', label: 'Transporte', icon: Car },
    { value: 'leisure', label: 'Lazer', icon: Gamepad2 },
    { value: 'home', label: 'Moradia', icon: Home },
    { value: 'shopping', label: 'Compras', icon: ShoppingBag },
    { value: 'health', label: 'Saúde', icon: HeartPulse },
    { value: 'travel', label: 'Viagem', icon: Plane },
    { value: 'entertainment', label: 'Entretenimento', icon: Clapperboard },
  ];

  if (loading) return <div className="text-white">Carregando orçamentos...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Orçamento Mensal</h2>
          <p className="text-gray-400 mt-1">Defina limites de gastos mensais para suas categorias.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-axxy-primary text-axxy-bg px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
        >
          <Plus size={20} /> <span>Adicionar Orçamento</span>
        </button>
      </header>

      <div className="flex flex-col gap-4">
        {budgets.map((budget) => {
          const Icon = getIcon(budget.icon);
          const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
          const statusColor = getStatusColor(percentage);
          const isOverBudget = percentage > 100;

          return (
            <div key={budget.id} className="bg-axxy-card p-6 rounded-3xl border border-axxy-border flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="text-gray-300 rounded-2xl bg-[#0b120f] border border-white/5 w-14 h-14 flex items-center justify-center shrink-0">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold">{budget.category}</h3>
                  {isOverBudget ? (
                    <p className="text-red-400 text-sm font-medium">Estourado em R$ {(budget.spent - budget.limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  ) : (
                    <p className="text-gray-400 text-sm">Resta R$ {(budget.limit - budget.spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-0.5">
                    R$ {budget.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {budget.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-4">
                <div className="w-full h-2.5 rounded-full bg-[#0b120f] overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${statusColor} transition-all duration-500`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                <span className="text-white font-bold min-w-[3rem] text-right">{percentage.toFixed(0)}%</span>
              </div>

              <div className="flex items-center gap-2 md:pl-4 md:border-l md:border-white/10">
                <button
                  onClick={() => handleOpenModal(budget)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <PenLine size={20} />
                </button>
                <button
                  onClick={() => budget.id && handleDelete(budget.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-axxy-card rounded-3xl border border-axxy-border border-dashed">
            <p>Nenhum orçamento definido.</p>
            <button onClick={() => handleOpenModal()} className="text-axxy-primary mt-2 hover:underline">
              Criar meu primeiro orçamento
            </button>
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-24 px-4 pb-4 backdrop-blur-sm">
          <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl w-full max-w-md shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white z-10"
            >
              ✕
            </button>

            <div className="p-6 space-y-6">
              <h3 className="text-2xl font-bold text-white">
                {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Alimentação"
                    className="w-full bg-[#0b120f] border border-[#1e332a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-axxy-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Limite Mensal (R$)</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#0b120f] border border-[#1e332a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-axxy-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Ícone</label>
                  <div className="grid grid-cols-4 gap-2">
                    {iconOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setIcon(opt.value)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-colors border ${icon === opt.value
                          ? 'bg-axxy-primary text-axxy-bg border-axxy-primary'
                          : 'bg-[#0b120f] text-gray-400 border-[#1e332a] hover:border-gray-600'
                          }`}
                        title={opt.label}
                      >
                        <opt.icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-axxy-primary text-axxy-bg px-4 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                >
                  {editingBudget ? 'Salvar Alterações' : 'Criar Orçamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
