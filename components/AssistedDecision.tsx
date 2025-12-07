
import React, { useEffect, useState } from 'react';
import { PiggyBank, Droplets, Calendar, RotateCw, Play, ShoppingBag, Landmark, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import { LeakageAnalysis } from '../types';

export const AssistedDecision: React.FC = () => {
  const [data, setData] = useState<LeakageAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
      setLoading(true);
      apiService.getLeakageAnalysis()
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getIcon = (category: string) => {
      switch(category) {
          case 'subscription': return <Play size={24} fill="currentColor" />;
          case 'impulse': return <ShoppingBag size={24} />;
          case 'fees': return <Landmark size={24} />;
          default: return <AlertCircle size={24} />;
      }
  };

  const getIconBg = (category: string) => {
      switch(category) {
          case 'subscription': return 'bg-blue-500/20 text-blue-500';
          case 'impulse': return 'bg-purple-500/20 text-purple-500';
          case 'fees': return 'bg-red-900/30 text-red-400';
          default: return 'bg-gray-700/50 text-gray-300';
      }
  };

  if (loading) return <div className="text-white text-center py-10">Carregando análise...</div>;
  if (!data) return <div className="text-gray-500 text-center py-10">Não foi possível carregar a análise.</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl pb-10">
       {/* Header */}
       <div>
         <h2 className="text-3xl font-bold text-white mb-2">Análise de Vazamento</h2>
         <p className="text-gray-400">Insights da IA para otimizar suas finanças.</p>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 flex flex-col items-center text-center hover:border-green-500/30 transition-colors">
             <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-4">
               <PiggyBank size={24} />
             </div>
             <h3 className="text-3xl font-bold text-white mb-1">R$ {data.totalPotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
             <p className="text-sm text-gray-400">Potencial de Economia Mensal</p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 flex flex-col items-center text-center hover:border-yellow-500/30 transition-colors">
             <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center mb-4">
               <Droplets size={24} />
             </div>
             <h3 className="text-3xl font-bold text-white mb-1">{data.leaksCount} Vazamentos</h3>
             <p className="text-sm text-gray-400">Identificados nos Últimos 30 Dias</p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 flex flex-col items-center text-center hover:border-gray-600 transition-colors">
             <div className="w-12 h-12 rounded-full bg-gray-700/30 text-gray-300 flex items-center justify-center mb-4">
               <Calendar size={24} />
             </div>
             <p className="text-sm text-gray-400 mb-1">Análise de</p>
             <h3 className="text-lg font-bold text-white">{data.period}</h3>
          </div>
       </div>

       {/* Suggestions List */}
       <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-white">Cortes Sugeridos pela IA</h3>
             <button 
                onClick={fetchData} 
                className="flex items-center gap-2 text-green-500 hover:text-green-400 transition-colors text-sm font-medium"
             >
               <RotateCw size={16} /> Reanalisar
             </button>
          </div>

          <div className="space-y-4">
             {data.suggestions.map((item) => (
                 <div key={item.id} className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 hover:border-gray-700 transition-colors">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${getIconBg(item.category)}`}>
                      {getIcon(item.category)}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="text-white font-bold text-lg">{item.title}</h4>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto justify-center md:justify-end">
                       <span className="text-yellow-400 font-bold text-lg whitespace-nowrap">
                           - R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           <span className="text-sm text-gray-500 font-normal">/mês</span>
                       </span>
                       <button className="bg-transparent border border-green-500/30 text-green-500 hover:bg-green-500/10 font-bold px-6 py-2.5 rounded-xl transition-colors min-w-[120px]">
                         {item.actionLabel}
                       </button>
                    </div>
                 </div>
             ))}
             
             {data.suggestions.length === 0 && (
                 <div className="text-center text-gray-500 py-8">
                     Nenhum vazamento identificado no momento. Ótimo trabalho!
                 </div>
             )}
          </div>
       </div>
    </div>
  );
};
