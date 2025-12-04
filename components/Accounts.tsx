
import React, { useState, useEffect } from 'react';
import { MoreVertical, Plus, Landmark, CreditCard, PiggyBank, Wallet } from 'lucide-react';
import { Account } from '../types';
import { apiService } from '../services/apiService';

export const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-white">Carregando contas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Contas</h2>
        <button className="bg-axxy-primary text-axxy-bg font-semibold px-4 py-2 rounded-xl flex items-center gap-2">
          <Plus size={18} /> Adicionar Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = getIcon(account.icon);
          const isNegative = account.balance < 0;

          return (
            <div key={account.id} className="bg-axxy-card border border-axxy-border p-6 rounded-3xl relative">
               <div className="flex items-center gap-4 mb-8">
                 <div className={`w-12 h-12 rounded-full ${account.color}/20 flex items-center justify-center text-white`}>
                    <Icon size={24} />
                 </div>
                 <div>
                   <h3 className="font-bold text-white text-lg">{account.name}</h3>
                   <p className="text-gray-400 text-sm">{account.type}</p>
                 </div>
               </div>
               <div>
                 <h4 className={`text-2xl font-bold ${isNegative ? 'text-red-400' : 'text-white'}`}>
                   {isNegative ? '-' : ''} R$ {Math.abs(account.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </h4>
               </div>
            </div>
          );
        })}
        {accounts.length === 0 && <div className="text-gray-500">Nenhuma conta encontrada.</div>}
      </div>
    </div>
  );
};
