
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, Calendar, ChevronDown, Trash2, X } from 'lucide-react';
import { Transaction, Account } from '../types';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';

interface TransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, accounts, onAddTransaction, onDeleteTransaction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const newTransaction: Omit<Transaction, 'id'> = {
      // id removed, backend handles it
      accountId: accountId || undefined,
      description,
      amount: parseCurrencyInput(amount),
      type,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Outros',
      status: 'completed'
    };

    onAddTransaction(newTransaction);

    // Close modal and reset
    setIsModalOpen(false);
    setAmount('');
    setDescription('');
    setCategory('');
    setDate('');
    setAccountId('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Gerenciar Transações</h2>
        <button
          onClick={() => setIsModalOpen(true)}
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
                  <td className={`py - 4 text - right font - bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'} `}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className="py-4 text-center pr-6">
                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
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
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Adicionar Nova Transação</h3>
                <p className="text-gray-400 text-sm">Preencha os detalhes abaixo.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Transação</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`flex items - center justify - center gap - 2 py - 3 rounded - xl border transition - all ${type === 'income'
                        ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        } `}
                    >
                      <Plus size={18} /> Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`flex items - center justify - center gap - 2 py - 3 rounded - xl border transition - all ${type === 'expense'
                        ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        } `}
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
                          <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
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
                    placeholder="Ex: Salário, Aluguel"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
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
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
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
                    className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-900/20"
                  >
                    Salvar Transação
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