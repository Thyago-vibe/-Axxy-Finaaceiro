import React, { useState } from 'react';
import { MoreVertical, Plus, Landmark, CreditCard, PiggyBank, Wallet, X, Trash2, Edit2 } from 'lucide-react';
import { Account } from '../types';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';

interface AccountsProps {
  accounts: Account[];
  onAddAccount: (account: Account) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onAddAccount, onUpdateAccount, onDeleteAccount }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [icon, setIcon] = useState('bank');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('');
    setBalance('');
    setColor('bg-blue-500');
    setIcon('bank');
    setOpenMenuId(null);
  };

  const openEditModal = (account: Account) => {
    setEditingId(account.id!);
    setName(account.name);
    setType(account.type);
    // Format initial balance
    setBalance(account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setColor(account.color);
    setIcon(account.icon);
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type || !balance) return;

    const accountData: Account = {
      id: editingId || undefined,
      name,
      type,
      balance: parseCurrencyInput(balance),
      color,
      icon
    };

    if (editingId) {
      onUpdateAccount(accountData);
    } else {
      onAddAccount(accountData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'bank': return Landmark;
      case 'card': return CreditCard;
      case 'piggy': return PiggyBank;
      default: return Wallet;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Contas</h2>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-axxy-primary text-axxy-bg font-semibold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-axxy-primaryHover transition-colors"
        >
          <Plus size={18} /> Adicionar Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = getIcon(account.icon);
          const isNegative = account.balance < 0;

          return (
            <div key={account.id} className="bg-axxy-card border border-axxy-border p-6 rounded-3xl relative group">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${account.color}/20 flex items-center justify-center text-white`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{account.name}</h3>
                    <p className="text-gray-400 text-sm">{account.type}</p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === account.id ? null : account.id)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {openMenuId === account.id && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a2c24] border border-[#2a4539] rounded-xl shadow-xl z-10 overflow-hidden animate-fade-in">
                      <button
                        onClick={() => openEditModal(account)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button
                        onClick={() => { onDeleteAccount(account.id!.toString()); setOpenMenuId(null); }}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-2xl font-bold ${isNegative ? 'text-red-400' : 'text-white'}`}>
                  {isNegative ? '-' : ''} R$ {Math.abs(account.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-gray-500 text-xs mt-1">Saldo atual</p>
              </div>
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-3xl">
            <p className="mb-4">Nenhuma conta cadastrada.</p>
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="text-axxy-primary hover:underline"
            >
              Criar primeira conta
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center w-full h-screen bg-transparent backdrop-blur-sm p-4">
          <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl w-full max-w-[450px] shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="p-6">
              <h3 className="text-2xl font-bold text-white mb-6">
                {editingId ? 'Editar Conta' : 'Nova Conta'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Nome da Conta</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Banco Principal"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Tipo</label>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="Ex: Corrente, Investimento"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Saldo Inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input
                      type="text"
                      value={balance}
                      onChange={(e) => setBalance(formatCurrencyInput(e.target.value))}
                      placeholder="0,00"
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 pl-9 pr-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Ícone</label>
                    <select
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                    >
                      <option value="bank">Banco</option>
                      <option value="card">Cartão</option>
                      <option value="piggy">Cofrinho</option>
                      <option value="wallet">Carteira</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Cor</label>
                    <select
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-2.5 px-3 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors text-sm"
                    >
                      <option value="bg-blue-500">Azul</option>
                      <option value="bg-purple-500">Roxo</option>
                      <option value="bg-green-500">Verde</option>
                      <option value="bg-yellow-500">Amarelo</option>
                      <option value="bg-red-500">Vermelho</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
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
                    {editingId ? 'Salvar Alterações' : 'Criar Conta'}
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
