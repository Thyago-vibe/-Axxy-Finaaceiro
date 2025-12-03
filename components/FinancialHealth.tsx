import React, { useState, useEffect } from 'react';
import { Plus, PenLine, Trash2 } from 'lucide-react';
import { Debt } from '../types';
import { djangoService } from '../services/djangoService';

export const FinancialHealth: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    djangoService.getDebts()
        .then(setDebts)
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white">Carregando saúde financeira...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Saúde Financeira</h2>
        <button className="flex items-center gap-2 px-6 py-3 bg-axxy-primary text-axxy-bg font-bold rounded-xl">
          <Plus size={20} /> <span>Nova Dívida</span>
        </button>
      </div>

      <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-8">
        <h3 className="text-xl font-bold text-white mb-6">Minhas Dívidas Ativas</h3>
        <table className="w-full">
            <tbody className="text-sm">
              {debts.map((debt) => (
                <tr key={debt.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-5 font-medium text-white">{debt.name}</td>
                  <td className="py-5 text-gray-300">R$ {debt.remaining}</td>
                  <td className="py-5 text-gray-300">{debt.status}</td>
                </tr>
              ))}
              {debts.length === 0 && <tr><td className="py-4 text-gray-500">Nenhuma dívida ativa.</td></tr>}
            </tbody>
        </table>
      </div>
    </div>
  );
};