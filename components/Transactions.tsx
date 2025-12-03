import React, { useState } from 'react';
import { Plus, Minus, Calendar, ChevronDown } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAddTransaction }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      type,
      date: date || new Date().toLocaleDateString('pt-BR'),
      category: category || 'Outros',
      status: 'completed'
    };

    onAddTransaction(newTransaction);
    // Reset form
    setAmount('');
    setDescription('');
    setCategory('');
    setDate('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Nova Transação</h2>

      <div className="bg-axxy-card p-8 rounded-3xl border border-axxy-border shadow-2xl">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Adicionar Nova Transação</h3>
          <p className="text-gray-400 text-sm">Preencha os detalhes abaixo para adicionar uma nova transação.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Transação</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  type === 'income'
                    ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                    : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Plus size={18} /> Receita
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  type === 'expense'
                    ? 'bg-axxy-primary/10 border-axxy-primary text-axxy-primary'
                    : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Minus size={18} /> Despesa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-axxy-primary focus:border-axxy-primary outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-4 pr-10 focus:ring-1 focus:ring-axxy-primary focus:border-axxy-primary outline-none transition-colors [color-scheme:dark]"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Salário, Aluguel"
              className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary focus:border-axxy-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 appearance-none focus:ring-1 focus:ring-axxy-primary focus:border-axxy-primary outline-none transition-colors"
              >
                <option value="" disabled>Selecione uma categoria</option>
                <option value="Moradia">Moradia</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Lazer">Lazer</option>
                <option value="Saúde">Saúde</option>
                <option value="Salário">Salário</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>

           <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <div className="relative">
              <select
                className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 appearance-none focus:ring-1 focus:ring-axxy-primary focus:border-axxy-primary outline-none transition-colors"
              >
                <option value="completed">Concluído</option>
                <option value="pending">Pendente</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="px-6 py-3 text-gray-300 hover:text-white font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" className="bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold px-8 py-3 rounded-xl transition-colors shadow-lg shadow-green-900/20">
              Salvar Transação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
