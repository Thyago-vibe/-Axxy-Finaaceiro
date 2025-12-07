
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';
import { Plus, Utensils, Car, Gamepad2, Home, AlertCircle, X, Heart, Briefcase, ShoppingBag, ChevronDown, ChevronRight, Check, Trash2 } from 'lucide-react';
import { Budget, BudgetItem } from '../types';
import { apiService } from '../services/apiService';

export const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', limit: '', icon: 'food', priority: 'medio' });

  // Subcategory state
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set());
  const [budgetItems, setBudgetItems] = useState<Record<string, BudgetItem[]>>({});
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', target_amount: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await apiService.getBudgets();
      setBudgets(data);
    } catch (error) {
      console.error("Failed to load budgets", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'food': return Utensils;
      case 'transport': return Car;
      case 'leisure': return Gamepad2;
      case 'home': return Home;
      case 'health': return Heart;
      case 'work': return Briefcase;
      case 'shopping': return ShoppingBag;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-axxy-primary';
  };

  const categoryOptions = [
    { value: 'Moradia', icon: 'home', suggestedPriority: 'essencial' },
    { value: 'Alimentação', icon: 'food', suggestedPriority: 'alto' },
    { value: 'Transporte', icon: 'transport', suggestedPriority: 'alto' },
    { value: 'Lazer', icon: 'leisure', suggestedPriority: 'baixo' },
    { value: 'Saúde', icon: 'health', suggestedPriority: 'essencial' },
    { value: 'Trabalho', icon: 'work', suggestedPriority: 'medio' },
    { value: 'Compras', icon: 'shopping', suggestedPriority: 'baixo' }
  ];

  const priorityOptions = [
    { value: 'essencial', label: 'Essencial', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    { value: 'alto', label: 'Alto', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { value: 'medio', label: 'Médio', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    { value: 'baixo', label: 'Baixo', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' }
  ];

  const getPriorityBadge = (priority: string = 'medio') => {
    const p = priorityOptions.find(opt => opt.value === priority) || priorityOptions[2];
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${p.bg} ${p.color} font-semibold`}>
        {p.label}
      </span>
    );
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.category || !newBudget.limit) return;

    try {
      const budgetData = {
        category: newBudget.category,
        limit: parseCurrencyInput(newBudget.limit),
        spent: 0,
        icon: newBudget.icon,
        priority: newBudget.priority
      };

      await apiService.createBudget(budgetData as Budget);
      loadData();
      setIsModalOpen(false);
      setNewBudget({ category: '', limit: '', icon: 'food', priority: 'medio' });
    } catch (error) {
      console.error("Failed to create budget", error);
    }
  };

  // Subcategory functions
  const toggleBudgetExpand = async (budgetId: string) => {
    const newExpanded = new Set(expandedBudgets);
    if (newExpanded.has(budgetId)) {
      newExpanded.delete(budgetId);
    } else {
      newExpanded.add(budgetId);
      if (!budgetItems[budgetId]) {
        try {
          const items = await apiService.getBudgetItems(budgetId);
          setBudgetItems({ ...budgetItems, [budgetId]: items });
        } catch (error) {
          console.error("Failed to load items", error);
        }
      }
    }
    setExpandedBudgets(newExpanded);
  };

  const handleOpenItemModal = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setIsItemModalOpen(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudgetId || !newItem.name || !newItem.target_amount) return;

    try {
      const item = await apiService.createBudgetItem(selectedBudgetId, {
        name: newItem.name,
        target_amount: parseCurrencyInput(newItem.target_amount),
        spent: 0,
        completed: false
      });

      setBudgetItems({
        ...budgetItems,
        [selectedBudgetId]: [...(budgetItems[selectedBudgetId] || []), item]
      });

      setIsItemModalOpen(false);
      setNewItem({ name: '', target_amount: '' });
    } catch (error) {
      console.error("Failed to create item", error);
    }
  };

  const handleToggleComplete = async (budgetId: string, item: BudgetItem) => {
    try {
      const updated = await apiService.updateBudgetItem(budgetId, item.id, {
        ...item,
        completed: !item.completed
      });

      setBudgetItems({
        ...budgetItems,
        [budgetId]: budgetItems[budgetId].map(i => i.id === item.id ? updated : i)
      });
    } catch (error) {
      console.error("Failed to update item", error);
    }
  };

  const handleDeleteItem = async (budgetId: string, itemId: string | number) => {
    try {
      await apiService.deleteBudgetItem(budgetId, itemId);
      setBudgetItems({
        ...budgetItems,
        [budgetId]: budgetItems[budgetId].filter(i => i.id !== itemId)
      });
    } catch (error) {
      console.error("Failed to delete item", error);
    }
  };

  if (loading) return <div className="text-white">Carregando orçamentos...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Orçamento Inteligente</h2>
          <p className="text-gray-400 text-sm">Controle seus gastos com prioridades e subcategorias</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-axxy-primary text-axxy-bg px-6 py-3 rounded-xl font-bold hover:bg-axxy-primaryHover transition-colors"
        >
          <Plus size={20} /> <span>Adicionar Orçamento</span>
        </button>
      </header>

      <div className="flex flex-col gap-4">
        {budgets.map((budget) => {
          const Icon = getIcon(budget.icon);
          const percentage = (budget.spent / budget.limit) * 100;
          const status = getStatusColor(percentage);
          const isExpanded = expandedBudgets.has(budget.id.toString());
          const items = budgetItems[budget.id.toString()] || [];

          return (
            <div key={budget.id} className="bg-axxy-card p-6 rounded-3xl border border-axxy-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleBudgetExpand(budget.id.toString())}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  <div className="text-gray-300 rounded-2xl bg-[#0b120f] border border-white/5 w-14 h-14 flex items-center justify-center">
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white text-lg font-bold">{budget.category}</h3>
                      {getPriorityBadge(budget.priority)}
                      {items.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                          {items.length} {items.length === 1 ? 'item' : 'itens'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{formatCurrency(budget.spent)} de {formatCurrency(budget.limit)}</p>
                  </div>
                </div>
                <p className={`text-2xl font-bold ${percentage > 100 ? 'text-red-400' : percentage > 80 ? 'text-yellow-400' : 'text-axxy-primary'}`}>
                  {percentage.toFixed(0)}%
                </p>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#0b120f] overflow-hidden">
                <div className={`h-full rounded-full ${status} transition-all`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
              </div>

              {/* Subcategories Section */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Subitens do Orçamento</p>
                    <button
                      onClick={() => handleOpenItemModal(budget.id.toString())}
                      className="text-xs flex items-center gap-1 text-axxy-primary hover:text-axxy-primaryHover font-semibold transition-colors"
                    >
                      <Plus size={14} /> Adicionar Subitem
                    </button>
                  </div>

                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map((item) => {
                        const itemPercentage = item.target_amount > 0 ? (item.spent / item.target_amount * 100) : 0;
                        return (
                          <div key={item.id} className={`bg-[#0b120f]/50 rounded-lg p-3 transition-opacity ${item.completed ? 'opacity-60' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <button
                                  onClick={() => handleToggleComplete(budget.id.toString(), item)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-500'}`}
                                >
                                  {item.completed && <Check size={14} className="text-white" />}
                                </button>
                                <span className={`text-sm text-white ${item.completed ? 'line-through' : ''}`}>
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-300">
                                  {formatCurrency(item.spent)} / {formatCurrency(item.target_amount)}
                                </span>
                                <button
                                  onClick={() => handleDeleteItem(budget.id.toString(), item.id)}
                                  className="text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${item.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(itemPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhum subitem adicionado.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {budgets.length === 0 && (
          <div className="text-center py-16 bg-axxy-card border border-axxy-border rounded-2xl">
            <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum orçamento definido.</p>
            <p className="text-gray-600 text-sm mt-2">Clique em "Adicionar Orçamento" para começar.</p>
          </div>
        )}
      </div>

      {/* Budget Creation Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Novo Orçamento</h3>
                <p className="text-gray-400 text-sm">Defina um limite para seus gastos</p>
              </div>

              <form onSubmit={handleCreateBudget} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryOptions.map((option) => {
                      const IconComponent = getIcon(option.icon);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setNewBudget({ ...newBudget, category: option.value, icon: option.icon, priority: option.suggestedPriority })}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${newBudget.category === option.value
                            ? 'bg-axxy-primary/10 border-axxy-primary text-white'
                            : 'bg-[#0b120f] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                            }`}
                        >
                          <IconComponent size={18} />
                          <span className="text-sm font-medium">{option.value}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prioridade</label>
                  <div className="grid grid-cols-2 gap-3">
                    {priorityOptions.map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setNewBudget({ ...newBudget, priority: priority.value })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${newBudget.priority === priority.value
                          ? `${priority.bg} ${priority.border} ${priority.color}`
                          : 'bg-[#0b120f] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                          }`}
                      >
                        <span className="text-sm font-medium">{priority.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Limite do Orçamento</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={newBudget.limit}
                      onChange={(e) => setNewBudget({ ...newBudget, limit: formatCurrencyInput(e.target.value) })}
                      placeholder="0,00"
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl transition-colors"
                  >
                    Criar Orçamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Subitem Creation Modal */}
      {isItemModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative">
            <button
              onClick={() => { setIsItemModalOpen(false); setNewItem({ name: '', target_amount: '' }); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Novo Subitem</h3>
                <p className="text-gray-400 text-sm">Adicione um objetivo específico ao orçamento</p>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Item</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Ex: Compra de sofá"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Valor Alvo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={newItem.target_amount}
                      onChange={(e) => setNewItem({ ...newItem, target_amount: formatCurrencyInput(e.target.value) })}
                      placeholder="0,00"
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setIsItemModalOpen(false); setNewItem({ name: '', target_amount: '' }); }}
                    className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
