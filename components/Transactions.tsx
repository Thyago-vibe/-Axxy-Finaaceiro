
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, Calendar, ChevronDown, Trash2, X, Sparkles, TrendingUp, Zap, DollarSign } from 'lucide-react';
import { Transaction, Account, Budget } from '../types';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';
import { apiService } from '../services/apiService';

interface TransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, accounts, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  console.log('Transactions.tsx: Received transactions prop:', transactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('');

  // Daily (Diária) State
  const [dailyAmount, setDailyAmount] = useState('200,00'); // Default R$ 200
  const [dailyDate, setDailyDate] = useState('');
  const [dailyStartDate, setDailyStartDate] = useState('');
  const [dailyEndDate, setDailyEndDate] = useState('');
  const [dailyMode, setDailyMode] = useState<'single' | 'range'>('single');

  // Smart Allocation State (Sugestão Inteligente de Alocação)
  const [showAllocationSuggestion, setShowAllocationSuggestion] = useState(false);
  const [allocationSuggestions, setAllocationSuggestions] = useState<any>(null);
  const [loadingAllocation, setLoadingAllocation] = useState(false);
  const [lastDailyAmount, setLastDailyAmount] = useState(0);

  // AI Suggestion State
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  // Budgets for category validation
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    apiService.getBudgets().then(setBudgets).catch(console.error);
  }, []);

  // Debounced AI suggestion
  useEffect(() => {
    if (!description || description.length < 3) {
      setSuggestedCategory('');
      setConfidence(0);
      return;
    }

    setIsLoadingSuggestion(true);
    const timer = setTimeout(() => {
      apiService.suggestBudgetCategory(description, parseFloat(amount) || undefined)
        .then(result => {
          setSuggestedCategory(result.suggestedCategory);
          setConfidence(result.confidence);
        })
        .catch(console.error)
        .finally(() => setIsLoadingSuggestion(false));
    }, 800); // Debounce 800ms

    return () => clearTimeout(timer);
  }, [description, amount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const transactionData: Omit<Transaction, 'id'> = {
      accountId: accountId || undefined,
      description,
      amount: parseCurrencyInput(amount),
      type,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Outros',
      status: 'completed'
    };

    if (editingTransaction) {
      // Update existing transaction
      onUpdateTransaction(String(editingTransaction.id), transactionData);
    } else {
      // Create new transaction
      onAddTransaction(transactionData);
    }

    // Close modal and reset
    setIsModalOpen(false);
    setEditingTransaction(null);
    setAmount('');
    setDescription('');
    setCategory('');
    setDate('');
    setAccountId('');
    setSuggestedCategory('');
    setConfidence(0);
  };

  const handleAcceptSuggestion = () => {
    setCategory(suggestedCategory);
  };

  // Handler para adicionar diária rápida (hoje, R$ 200)
  const handleQuickDaily = async () => {
    const today = new Date().toISOString().split('T')[0];
    const amount = parseCurrencyInput(dailyAmount);

    const dailyTransaction: Omit<Transaction, 'id'> = {
      accountId: accountId || accounts[0]?.id || undefined,
      description: 'Diária de Trabalho',
      amount: amount,
      type: 'income',
      date: today,
      category: 'Salário',
      status: 'completed'
    };

    onAddTransaction(dailyTransaction);
    setIsDailyModalOpen(false);

    // Buscar sugestões da IA
    await fetchAllocationSuggestions(amount);
  };

  // Handler para adicionar diárias (uma ou múltiplas)
  const handleAddDailies = async (e: React.FormEvent) => {
    e.preventDefault();

    let totalAmount = 0;

    if (dailyMode === 'single') {
      // Adicionar uma diária
      const amount = parseCurrencyInput(dailyAmount);
      totalAmount = amount;

      const dailyTransaction: Omit<Transaction, 'id'> = {
        accountId: accountId || accounts[0]?.id || undefined,
        description: 'Diária de Trabalho',
        amount: amount,
        type: 'income',
        date: dailyDate || new Date().toISOString().split('T')[0],
        category: 'Salário',
        status: 'completed'
      };
      onAddTransaction(dailyTransaction);
    } else {
      // Adicionar múltiplas diárias (intervalo)
      if (!dailyStartDate || !dailyEndDate) return;

      const start = new Date(dailyStartDate);
      const end = new Date(dailyEndDate);
      const currentDate = new Date(start);
      const amount = parseCurrencyInput(dailyAmount);
      let count = 0;

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dailyTransaction: Omit<Transaction, 'id'> = {
          accountId: accountId || accounts[0]?.id || undefined,
          description: 'Diária de Trabalho',
          amount: amount,
          type: 'income',
          date: dateStr,
          category: 'Salário',
          status: 'completed'
        };
        onAddTransaction(dailyTransaction);
        currentDate.setDate(currentDate.getDate() + 1);
        count++;
      }

      totalAmount = amount * count;
    }

    // Reset and close
    setIsDailyModalOpen(false);
    setDailyDate('');
    setDailyStartDate('');
    setDailyEndDate('');
    setDailyMode('single');

    // Buscar sugestões da IA
    await fetchAllocationSuggestions(totalAmount);
  };

  // Buscar sugestões de alocação da IA
  const fetchAllocationSuggestions = async (amount: number) => {
    setLastDailyAmount(amount);
    setLoadingAllocation(true);
    setShowAllocationSuggestion(true);

    try {
      const suggestions = await apiService.autoAllocateBudgets(amount);
      setAllocationSuggestions(suggestions);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      setAllocationSuggestions(null);
    } finally {
      setLoadingAllocation(false);
    }
  };

  // Aceitar sugestões de alocação
  const handleAcceptAllocation = () => {
    // Aqui você pode implementar a lógica para aplicar as sugestões aos budgets
    // Por enquanto, apenas fecha o modal
    setShowAllocationSuggestion(false);
    setAllocationSuggestions(null);
  };

  // Rejeitar sugestões
  const handleRejectAllocation = () => {
    setShowAllocationSuggestion(false);
    setAllocationSuggestions(null);
  };

  const selectedBudget = budgets.find(b => b.category === category);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Gerenciar Transações</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setIsDailyModalOpen(true)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg shadow-orange-900/30 flex items-center gap-2"
          >
            <Zap size={20} />
            <span className="hidden sm:inline">Adicionar Diária</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-axxy-primary text-axxy-bg font-bold px-6 py-3 rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Adicionar Nova Transação</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xl font-bold text-white">Histórico de Transações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0f1a16]">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="py-4 pl-6 font-medium">Data</th>
                <th className="py-4 font-medium">Descrição</th>
                <th className="py-4 font-medium">Categoria</th>
                <th className="py-4 font-medium">Tipo</th>
                <th className="py-4 font-medium text-right">Valor</th>
                <th className="py-4 font-medium text-center pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-4 pl-6 text-gray-300">
                    {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-4 font-medium text-white">{t.description}</td>
                  <td className="py-4 text-gray-400">{t.category}</td>
                  <td className="py-4">
                    {t.type === 'income' ? (
                      <span className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-lg text-xs font-bold">Receita</span>
                    ) : (
                      <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-lg text-xs font-bold">Despesa</span>
                    )}
                  </td>
                  <td className={`py-4 text-right font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className="py-4 text-center pr-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingTransaction(t);
                          setType(t.type);
                          setAmount(formatCurrencyInput(t.amount.toFixed(2)));
                          setDescription(t.description);
                          setCategory(t.category);
                          setAccountId(String(t.accountId || ''));
                          setDate(t.date ? t.date.split('T')[0] : '');
                          setIsModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-axxy-primary transition-colors p-2 hover:bg-axxy-primary/10 rounded-lg"
                        title="Editar transação"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(String(t.id))}
                        className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                        title="Excluir transação"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    Nenhuma transação encontrada. Clique em "Adicionar Nova Transação".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - New Transaction */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {editingTransaction ? 'Editar Transação' : 'Adicionar Nova Transação'}
                </h3>
                <p className="text-gray-400 text-sm">Preencha os detalhes abaixo.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Transação</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${type === 'income'
                        ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      <Plus size={18} /> Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${type === 'expense'
                        ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      <Minus size={18} /> Despesa
                    </button>
                  </div>
                </div>

                {/* Nova Seleção de Conta */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Conta</label>
                  <div className="relative">
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 appearance-none focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                    >
                      <option value="" disabled>Selecione uma conta</option>
                      {accounts.length > 0 ? (
                        accounts.map(acc => (
                          <option key={acc.id} value={String(acc.id)}>{acc.name} ({formatCurrency(acc.balance)})</option>
                        ))
                      ) : (
                        <option value="" disabled>Nenhuma conta cadastrada</option>
                      )}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                        placeholder="0,00"
                        className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Compra no mercado, Uber"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                  />
                </div>

                {/* AI Suggestion Badge */}
                {suggestedCategory && confidence > 0 && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="text-purple-400" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">IA sugeriu:</span>
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                            {confidence.toFixed(0)}% confiança
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          A categoria <span className="font-bold text-purple-400">{suggestedCategory}</span> parece ideal para esta transação.
                        </p>
                        {category !== suggestedCategory && (
                          <button
                            type="button"
                            onClick={handleAcceptSuggestion}
                            className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                          >
                            <TrendingUp size={14} />
                            Aceitar sugestão
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">Categoria</label>
                    {isLoadingSuggestion && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        Analisando...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 appearance-none focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                    >
                      <option value="" disabled>Selecione uma categoria</option>
                      <option value="Moradia">Moradia</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Salário">Salário</option>
                      <option value="Outros">Outros</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                  </div>

                  {/* Budget Info Display */}
                  {selectedBudget && (
                    <div className="mt-3 p-3 bg-[#0b120f] border border-white/5 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Orçamento de {selectedBudget.category}</span>
                        <span className={`font-bold ${(selectedBudget.spent / selectedBudget.limit * 100) > 80 ? 'text-red-400' : 'text-axxy-primary'
                          }`}>
                          {formatCurrency(selectedBudget.spent)} / {formatCurrency(selectedBudget.limit)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${(selectedBudget.spent / selectedBudget.limit * 100) > 100 ? 'bg-red-500' :
                            (selectedBudget.spent / selectedBudget.limit * 100) > 80 ? 'bg-yellow-500' : 'bg-axxy-primary'
                            }`}
                          style={{ width: `${Math.min((selectedBudget.spent / selectedBudget.limit * 100), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTransaction(null);
                    }}
                    className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-900/20"
                  >
                    {editingTransaction ? 'Salvar Alterações' : 'Salvar Transação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal - Adicionar Diária */}
      {isDailyModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#2e2416] to-[#1c1510] border border-orange-500/20 rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(234,88,12,0.3)] animate-fade-in relative">
            <button
              onClick={() => setIsDailyModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <Zap className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Adicionar Diária</h3>
                    <p className="text-gray-400 text-sm">Registro rápido de diárias de trabalho</p>
                  </div>
                </div>
              </div>

              {/* Botão Rápido */}
              <button
                onClick={handleQuickDaily}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/30 transition-all mb-6 flex items-center justify-center gap-2"
              >
                <DollarSign size={20} />
                Adicionar Diária de Hoje (R$ {dailyAmount})
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1c1510] px-2 text-gray-500">ou personalize</span>
                </div>
              </div>

              <form onSubmit={handleAddDailies} className="space-y-5">
                {/* Modo: Única ou Múltipla */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Modo</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDailyMode('single')}
                      className={`py-3 rounded-xl border transition-all ${dailyMode === 'single'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      Diária Única
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailyMode('range')}
                      className={`py-3 rounded-xl border transition-all ${dailyMode === 'range'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      Múltiplas Diárias
                    </button>
                  </div>
                </div>

                {/* Valor da Diária */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Valor da Diária</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={dailyAmount}
                      onChange={(e) => setDailyAmount(formatCurrencyInput(e.target.value))}
                      placeholder="200,00"
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Conta */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Conta Destino</label>
                  <div className="relative">
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 appearance-none focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
                    >
                      <option value="" disabled>Selecione uma conta</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Data (modo único) */}
                {dailyMode === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data</label>
                    <input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-orange-500 outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                )}

                {/* Intervalo de Datas (modo múltiplo) */}
                {dailyMode === 'range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Data Inicial</label>
                      <input
                        type="date"
                        value={dailyStartDate}
                        onChange={(e) => setDailyStartDate(e.target.value)}
                        className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-orange-500 outline-none transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Data Final</label>
                      <input
                        type="date"
                        value={dailyEndDate}
                        onChange={(e) => setDailyEndDate(e.target.value)}
                        className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-orange-500 outline-none transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}

                {/* Preview de quantas diárias serão adicionadas */}
                {dailyMode === 'range' && dailyStartDate && dailyEndDate && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                    <p className="text-sm text-orange-300">
                      📅 Serão adicionadas <span className="font-bold">
                        {Math.ceil((new Date(dailyEndDate).getTime() - new Date(dailyStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                      </span> diárias, totalizando <span className="font-bold">
                        {formatCurrency(parseCurrencyInput(dailyAmount) * (Math.ceil((new Date(dailyEndDate).getTime() - new Date(dailyStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1))}
                      </span>
                    </p>
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsDailyModalOpen(false)}
                    className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-900/30"
                  >
                    Adicionar {dailyMode === 'range' ? 'Diárias' : 'Diária'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal - Sugestão Inteligente de Alocação */}
      {showAllocationSuggestion && createPortal(
        <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#1c2e26] via-[#15221c] to-[#0f1a16] border border-axxy-primary/30 rounded-3xl w-full max-w-2xl shadow-[0_20px_60px_rgba(34,197,94,0.4)] animate-fade-in relative">
            <button
              onClick={handleRejectAllocation}
              className="absolute top-4 right-4 text-gray-500 hover:text-white z-10"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-axxy-primary to-green-600 flex items-center justify-center shadow-lg shadow-green-900/40">
                    <Sparkles className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Sugestão Inteligente 🧠</h3>
                    <p className="text-gray-400 text-sm">A IA analisou seus orçamentos</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 rounded-xl p-4">
                  <p className="text-green-300 text-sm">
                    💰 Você recebeu <span className="font-bold text-white">{formatCurrency(lastDailyAmount)}</span> em diária(s)!
                    <br />
                    Veja como a IA sugere distribuir esse valor entre seus orçamentos:
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {loadingAllocation && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 border-4 border-axxy-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400">Analisando seus orçamentos...</p>
                </div>
              )}

              {/* Suggestions */}
              {!loadingAllocation && allocationSuggestions && (
                <div className="space-y-4">
                  {allocationSuggestions.allocations && allocationSuggestions.allocations.length > 0 ? (
                    <>
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Distribuição Recomendada:</h4>

                      {allocationSuggestions.allocations.map((allocation: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-[#0b120f] border border-white/10 rounded-2xl p-5 hover:border-axxy-primary/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-axxy-primary/20 flex items-center justify-center">
                                <DollarSign className="text-axxy-primary" size={20} />
                              </div>
                              <div>
                                <h5 className="text-white font-bold">{allocation.category}</h5>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${allocation.priority === 'essencial' ? 'bg-red-500/20 text-red-400' :
                                  allocation.priority === 'alto' ? 'bg-orange-500/20 text-orange-400' :
                                    allocation.priority === 'medio' ? 'bg-blue-500/20 text-blue-400' :
                                      'bg-gray-500/20 text-gray-400'
                                  }`}>
                                  {allocation.priority}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-axxy-primary">
                                {formatCurrency(allocation.suggested_amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Novo total: {formatCurrency(allocation.new_total)} ({allocation.new_percentage}%)
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${allocation.new_percentage >= 100 ? 'bg-red-500' :
                                allocation.new_percentage >= 80 ? 'bg-yellow-500' :
                                  'bg-axxy-primary'
                                }`}
                              style={{ width: `${Math.min(allocation.new_percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Total Summary */}
                      <div className="bg-gradient-to-r from-axxy-primary/10 to-green-600/10 border border-axxy-primary/30 rounded-2xl p-5 mt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Total Alocado</p>
                            <p className="text-2xl font-bold text-white">
                              {formatCurrency(allocationSuggestions.total_allocated)}
                            </p>
                          </div>
                          {allocationSuggestions.total_allocated < lastDailyAmount && (
                            <div className="text-right">
                              <p className="text-sm text-gray-400 mb-1">Sobra</p>
                              <p className="text-lg font-bold text-yellow-400">
                                {formatCurrency(lastDailyAmount - allocationSuggestions.total_allocated)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500">
                        Nenhuma sugestão disponível. Crie orçamentos primeiro!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {!loadingAllocation && (
                <div className="pt-6 flex gap-4">
                  <button
                    onClick={handleRejectAllocation}
                    className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors border border-gray-700 rounded-xl hover:border-gray-500"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={handleAcceptAllocation}
                    className="flex-1 bg-gradient-to-r from-axxy-primary to-green-600 hover:from-green-600 hover:to-axxy-primary text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/30"
                  >
                    Entendi! 👍
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};