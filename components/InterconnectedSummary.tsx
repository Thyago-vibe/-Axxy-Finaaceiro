import React from 'react';
import { Share2, CheckCircle2, Scissors, AlertCircle, Hourglass, ChevronRight, Trophy, TrendingUp } from 'lucide-react';

interface InterconnectedSummaryProps {
  setView: (view: string) => void;
}

export const InterconnectedSummary: React.FC<InterconnectedSummaryProps> = ({ setView }) => {
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
              {/* Goal Card 1 */}
              <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl overflow-hidden flex flex-col sm:flex-row hover:border-gray-700 transition-colors group">
                <div className="w-full sm:w-40 h-32 sm:h-auto relative bg-gray-800 shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=300&h=300" 
                    alt="Paris" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden"></div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-white">Viagem para a Europa</h4>
                    <span className="text-gray-400 text-sm font-medium">70%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso</span>
                    </div>
                    <div className="h-2.5 w-full bg-[#0b120f] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Meta para Junho 2025 - Faltam R$ 4.500,00</p>
                  </div>
                </div>
              </div>

              {/* Goal Card 2 */}
              <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl overflow-hidden flex flex-col sm:flex-row hover:border-gray-700 transition-colors group">
                <div className="w-full sm:w-40 h-32 sm:h-auto relative bg-gray-800 shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1579621970563-ebec7560eb3e?auto=format&fit=crop&q=80&w=300&h=300" 
                    alt="Savings" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden"></div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-white">Reserva de Emergência</h4>
                    <span className="text-gray-400 text-sm font-medium">90%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso</span>
                    </div>
                    <div className="h-2.5 w-full bg-[#0b120f] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Meta para Dezembro 2024 - Faltam R$ 1.200,00</p>
                  </div>
                </div>
              </div>
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
              <div className="bg-[#15221c] border border-[#1e332a] rounded-2xl p-5 flex items-center gap-4 hover:bg-[#1a2b24] transition-colors">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold">Cartão de Crédito</h4>
                  <p className="text-sm text-gray-400">Vence em 2 dias</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">R$ 1.250,80</p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide">Urgente</span>
                </div>
              </div>

              <div className="bg-[#15221c] border border-[#1e332a] rounded-2xl p-5 flex items-center gap-4 hover:bg-[#1a2b24] transition-colors">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0 border border-yellow-500/20">
                  <Hourglass size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold">Conta de Energia</h4>
                  <p className="text-sm text-gray-400">Vence em 7 dias</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">R$ 280,00</p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-600 text-white text-[10px] font-bold uppercase tracking-wide">Atenção</span>
                </div>
              </div>
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
                  <div className="flex gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500 text-axxy-bg flex items-center justify-center shrink-0">
                      <CheckCircle2 size={12} strokeWidth={4} />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Você economizou <span className="text-white font-medium">R$ 85</span> em restaurantes este mês. Continue assim!
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500 text-axxy-bg flex items-center justify-center shrink-0">
                      <CheckCircle2 size={12} strokeWidth={4} />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Sua meta de emergência está quase completa. Ótimo trabalho!
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Scissors size={14} /> Cortes Sugeridos
                </p>
                <div className="flex gap-3">
                   <div className="mt-0.5 w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <TrendingUp size={12} />
                   </div>
                   <p className="text-sm text-gray-300 leading-relaxed">
                     Considere reduzir gastos com assinaturas. Você gasta <span className="text-white font-medium">R$ 120/mês</span>.
                   </p>
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
