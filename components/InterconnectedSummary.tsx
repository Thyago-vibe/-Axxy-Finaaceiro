
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Scissors, AlertCircle, Hourglass, Trophy, TrendingUp, ArrowRight, Target, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { apiService } from '../services/apiService';
import { InterconnectedSummaryData } from '../types';

interface InterconnectedSummaryProps {
  setView: (view: string) => void;
}

export const InterconnectedSummary: React.FC<InterconnectedSummaryProps> = ({ setView }) => {
  const [data, setData] = useState<InterconnectedSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getInterconnectedSummary()
      .then(setData)
      .catch(err => console.error("Failed to load summary:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white text-center py-20">Carregando resumo...</div>;
  if (!data) return <div className="text-gray-500 text-center py-20">Não foi possível carregar o resumo interligado.</div>;

  const { activeGoals, upcomingDebts, insights } = data;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Resumo Interligado</h2>
        <p className="text-gray-400">Sua visão financeira conectada</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column (Goals & Debts) */}
        <div className="lg:col-span-2 space-y-10">

          {/* Active Goals Section */}
          <section>
            <h3 className="text-xl font-bold text-white mb-6">Suas Metas Ativas</h3>
            <div className="space-y-4">
              {activeGoals.map(goal => {
                const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                return (
                  <div key={goal.id} className="bg-[#15221c] border border-[#1e332a] rounded-3xl overflow-hidden flex flex-col sm:flex-row hover:border-gray-700 transition-colors group">
                    <div className="w-full sm:w-40 h-32 sm:h-auto relative bg-gray-800 shrink-0">
                      {/* Default placeholder or image from backend */}
                      <div className={`w - full h - full ${goal.imageUrl ? '' : 'bg-gradient-to-br from-gray-800 to-gray-900'} flex items - center justify - center`}>
                        {goal.imageUrl ? (
                          <img src={goal.imageUrl} alt={goal.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <Trophy className="text-gray-600" />
                        )}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-white">{goal.name}</h4>
                        <span className="text-gray-400 text-sm font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progresso</span>
                        </div>
                        <div className="h-2.5 w-full bg-[#0b120f] rounded-full overflow-hidden">
                          <div className={`h - full ${goal.color || 'bg-green-500'} rounded - full`} style={{ width: `${progress}% ` }}></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Meta para {new Date(goal.deadline).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} -
                          Faltam {formatCurrency(goal.targetAmount - goal.currentAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeGoals.length === 0 && (
                <div className="text-gray-500 text-center py-6 border border-[#1e332a] rounded-3xl">Nenhuma meta ativa no momento.</div>
              )}
            </div>

            <button
              onClick={() => setView('goals')}
              className="w-full mt-4 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-[0.99]"
            >
              Gerenciar Metas Inteligentes
            </button>
          </section>

          {/* Upcoming Debts Section */}
          <section>
            <h3 className="text-xl font-bold text-white mb-6">Atenção: Dívidas Próximas</h3>
            <div className="space-y-4">
              {upcomingDebts.map(debt => (
                <div key={debt.id} className="bg-[#15221c] border border-[#1e332a] rounded-2xl p-5 flex items-center gap-4 hover:bg-[#1a2b24] transition-colors">
                  <div className={`w - 12 h - 12 rounded - full flex items - center justify - center shrink - 0 border ${debt.isUrgent ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'} `}>
                    {debt.isUrgent ? <AlertCircle size={24} /> : <Hourglass size={24} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold">{debt.name}</h4>
                    <p className="text-sm text-gray-400">Vence em {new Date(debt.dueDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">{formatCurrency(debt.remaining)}</p>
                    {debt.isUrgent ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide">Urgente</span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-600 text-white text-[10px] font-bold uppercase tracking-wide">Atenção</span>
                    )}
                  </div>
                </div>
              ))}

              {upcomingDebts.length === 0 && (
                <div className="text-gray-500 text-center py-6 border border-[#1e332a] rounded-3xl">Nenhuma dívida próxima do vencimento.</div>
              )}
            </div>

            <button
              onClick={() => setView('financial-health')}
              className="w-full mt-4 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-[0.99]"
            >
              Ver Saúde Financeira
            </button>
          </section>

        </div>

        {/* Right Column (AI Insights) */}
        <div className="lg:col-span-1">
          <section className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-8">Insights da IA</h3>

            <div className="space-y-8 flex-1">
              <div>
                <p className="text-xs font-bold text-green-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Trophy size={14} /> Melhores Decisões
                </p>
                <div className="space-y-4">
                  {insights.bestDecisions.length > 0 ? insights.bestDecisions.map((decision, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500 text-axxy-bg flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} strokeWidth={4} />
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{decision}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">Ainda sem insights de decisões.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Scissors size={14} /> Cortes Sugeridos
                </p>
                <div className="space-y-4">
                  {insights.suggestedCuts.length > 0 ? insights.suggestedCuts.map((cut, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center justify-center shrink-0">
                        <TrendingUp size={12} />
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {cut.text} <span className="text-white font-medium">{formatCurrency(cut.value)}/mês</span>.
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">Nenhum corte sugerido no momento.</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setView('ai-assist')}
              className="w-full mt-8 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-[0.99]"
            >
              Analisar Decisões
            </button>
          </section>
        </div>

      </div>
    </div>
  );
};
