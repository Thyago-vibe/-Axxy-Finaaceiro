import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Plus, Landmark, CreditCard, PiggyBank, Wallet, Trash2, Pencil, X } from 'lucide-react';
import { Account } from '../types';
import { apiService } from '../services/apiService';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';

export const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', balance: '', color: 'bg-blue-500', icon: 'bank' });

  useEffect(() => {
    apiService.getAccounts()
      .then(setAccounts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'bank': return Landmark;
      case 'card': return CreditCard;
      case 'piggy': return PiggyBank;
      default: return Wallet;
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name) return;

    try {
      const accountData = {
        ...newAccount,
        balance: typeof newAccount.balance === 'string' ? (parseCurrencyInput(newAccount.balance) || 0) : newAccount.balance
      };

      if (editingId) {
        const updated = await apiService.updateAccount(editingId, accountData);
        setAccounts(accounts.map(a => a.id === editingId ? updated : a));
      } else {
        const created = await apiService.createAccount(accountData);
        setAccounts([...accounts, created]);
      }

      setIsModalOpen(false);
      setNewAccount({ name: '', type: 'bank', balance: '', color: 'bg-blue-500', icon: 'bank' });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save account", error);
    }
  };

  const handleEdit = (account: Account) => {
    setNewAccount({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      color: account.color,
      icon: account.icon
    });
    setEditingId(account.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    try {
      await apiService.deleteAccount(id);
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to delete account", error);
    }
  };

  if (loading) return <div className="text-white">Carregando contas...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Contas</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setNewAccount({ name: '', type: 'bank', balance: '', color: 'bg-blue-500', icon: 'bank' });
            setIsModalOpen(true);
          }}
          className="bg-axxy-primary text-axxy-bg font-semibold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20"
        >
          <Plus size={18} /> Adicionar Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = getIcon(account.icon);
          const isNegative = account.balance < 0;

          return (
            <div key={account.id} className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl relative hover:bg-[#1a2c24] transition-colors group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(account)}
                  className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 rounded-2xl ${account.color} flex items-center justify-center text-white shadow-lg`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{account.name}</h3>
                  <p className="text-gray-400 text-sm capitalize">{account.type}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Saldo Atual</p>
                <h4 className={`text-2xl font-bold ${isNegative ? 'text-red-400' : 'text-white'}`}>
                  {isNegative ? '-' : ''} {formatCurrency(Math.abs(account.balance))}
                </h4>
              </div>
            </div>
          );
        })}
        {accounts.length === 0 && <div className="text-gray-500 text-center col-span-full py-10">Nenhuma conta encontrada.</div>}
      </div>

      {/* Modal - New Account */}
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
              <h3 className="text-2xl font-bold text-white mb-6">{editingId ? 'Editar Conta' : 'Nova Conta'}</h3>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Conta</label>
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="Ex: Nubank, Carteira"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Saldo Inicial</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={newAccount.balance}
                        onChange={(e) => setNewAccount({ ...newAccount, balance: formatCurrencyInput(e.target.value) })}
                        placeholder="0,00"
                        className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                    <select
                      value={newAccount.type}
                      onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 appearance-none focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                    >
                      <option value="bank">Banco</option>
                      <option value="card">Cartão</option>
                      <option value="wallet">Carteira</option>
                      <option value="piggy">Cofrinho</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cor do Ícone</label>
                  <div className="flex gap-3">
                    {['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewAccount({ ...newAccount, color })}
                        className={`w-8 h-8 rounded-full ${color} ${newAccount.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#15221c]' : 'opacity-50 hover:opacity-100'} transition-all`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-green-900/20 mt-4"
                >
                  {editingId ? 'Salvar Alterações' : 'Criar Conta'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
