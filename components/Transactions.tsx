import React, { useState, useEffect } from 'react';
import { Plus, Minus, Calendar, ChevronDown, Trash2, X, Edit2, Check } from 'lucide-react';
import { Transaction, Category, Account } from '../types';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';

interface TransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCategory: (c: Category) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  transactions,
  categories,
  accounts,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddCategory
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // Form State
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('');

  // New Category State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setType('expense');
    setAmount('');
    setDescription('');
    setCategory('');
    setAccountId('');
    setDate('');
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const openEditModal = (t: Transaction) => {
    setEditingId(t.id!);
    setType(t.type);
    // Format existing amount to pt-BR string
    setAmount(t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setDescription(t.description);
    setCategory(t.category);
    setAccountId(t.accountId ? t.accountId.toString() : '');
    setDate(t.date);
    setIsModalOpen(true);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName) return;
    const newCat: Category = {
      name: newCategoryName,
      type: type === 'income' ? 'Receita' : 'Despesa',
      color: '#888888' // Default color
    };
    onAddCategory(newCat);
    setCategory(newCategoryName);
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const numericAmount = parseCurrencyInput(amount);

    const transactionData: Transaction = {
      id: editingId || undefined,
      description,
      amount: numericAmount,
      type,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Outros',
      accountId: accountId ? Number(accountId) : undefined,
      status: 'completed'
    };

    if (editingId) {
      onUpdateTransaction(transactionData);
    } else {
      onAddTransaction(transactionData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Gerenciar Transações</h2>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-axxy-primary text-axxy-bg font-bold px-6 py-3 rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Adicionar Nova Transação</span>
        </button>
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
                <th className="py-4 font-medium">Conta</th>
                <th className="py-4 font-medium">Tipo</th>
                <th className="py-4 font-medium text-right">Valor</th>
                <th className="py-4 font-medium text-center pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.map((t) => {
                const accountName = accounts.find(a => a.id === t.accountId)?.name || '-';
                return (
                  <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-6 text-gray-300">
                      {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-4 font-medium text-white">{t.description}</td>
                    <td className="py-4 text-gray-400">{t.category}</td>
                    <td className="py-4 text-gray-400">{accountName}</td>
                    <td className="py-4">
                      {t.type === 'income' ? (
                        <span className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-lg text-xs font-bold">Receita</span>
                      ) : (
                        <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-lg text-xs font-bold">Despesa</span>
                      )}
                    </td>
                    <td className={`py-4 text-right font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-center pr-6 flex justify-center gap-2">
                      <button
                        onClick={() => openEditModal(t)}
                        className="text-gray-500 hover:text-blue-400 transition-colors p-2 hover:bg-blue-400/10 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(t.id as string)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    Nenhuma transação encontrada. Clique em "Adicionar Nova Transação".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - New/Edit Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-24 px-4 pb-4 backdrop-blur-sm">
          <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl w-full max-w-lg shadow-2xl animate-fade-in relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white z-10"
            >
              <X size={24} />
            </button>

            <div className="p-6">
              <div className="mb-5">
                <h3 className="text-2xl font-bold text-white mb-1">
                  {editingId ? 'Editar Transação' : 'Nova Transação'}
                </h3>
                <p className="text-gray-400 text-sm">Preencha os detalhes abaixo.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Tipo de Transação</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${type === 'income'
                        ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      <Plus size={16} /> Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${type === 'expense'
                        ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      <Minus size={16} /> Despesa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Valor</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                        placeholder="0,00"
                        className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 pl-9 pr-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Data</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors [color-scheme:dark] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Descrição</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Salário, Aluguel"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Conta</label>
                  <div className="relative">
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 appearance-none focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                    >
                      <option value="" disabled>Selecione uma conta</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Categoria</label>

                  {!isCreatingCategory ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => {
                            if (e.target.value === 'new') {
                              setIsCreatingCategory(true);
                            } else {
                              setCategory(e.target.value);
                            }
                          }}
                          className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 appearance-none focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                        >
                          <option value="" disabled>Selecione uma categoria</option>
                          {categories.map(cat => (
                            <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                          ))}
                          <option value="new" className="text-axxy-primary font-bold">+ Criar Nova Categoria</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da nova categoria..."
                        className="flex-1 bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 focus:ring-1 focus:ring-axxy-primary outline-none text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="bg-axxy-primary text-axxy-bg p-2.5 rounded-xl hover:bg-axxy-primaryHover"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingCategory(false)}
                        className="bg-gray-700 text-white p-2.5 rounded-xl hover:bg-gray-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 text-gray-400 font-medium hover:text-white transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-green-900/20 text-sm"
                  >
                    {editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};