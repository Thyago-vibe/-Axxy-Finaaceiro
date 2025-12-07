
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, ShoppingBag, Clapperboard, Car, AlertCircle, Plus, Lightbulb, Sparkles, Target, Zap } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { apiService } from '../services/apiService';
import { PredictionBaseData, PredictionScenario } from '../types';

export const PredictiveAnalysis: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '12m'>('3m');
  const [loading, setLoading] = useState(true);

  // State for fetched base data
  const [baseData, setBaseData] = useState<PredictionBaseData | null>(null);

  // Local state for toggling checkboxes (initialized after fetch)
  const [scenarios, setScenarios] = useState<PredictionScenario[]>([]);

  useEffect(() => {
    apiService.getPredictiveAnalysis()
      .then(data => {
        setBaseData(data);
        setScenarios(data.scenarios); // Initialize scenarios from backend
      })
      .catch(err => console.error("Failed to load predictive data:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleScenario = (id: number) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag': return ShoppingBag;
      case 'Clapperboard': return Clapperboard;
      case 'Car': return Car;
      default: return AlertCircle;
    }
  };

  const generateData = () => {
    if (!baseData) return [];

    const { currentBalance, monthlyIncome, baseExpense } = baseData;

    // Calculate monthly savings from active scenarios
    const scenarioSavings = scenarios
      .filter(s => s.checked)
      .reduce((acc, curr) => acc + curr.savings, 0);

    const netMonthly = monthlyIncome - baseExpense + scenarioSavings;

    const months = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
    const chartData = [];

    for (let i = 0; i <= months; i++) {
      chartData.push({
        name: i === 0 ? 'Agora' : `Mês ${i}`,
        balance: currentBalance + (netMonthly * i),
      });
    }
    return chartData;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-axxy-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Carregando análise preditiva...</p>
      </div>
    </div>
  );

  if (!baseData) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500">Dados insuficientes para análise.</p>
      </div>
    </div>
  );

  const chartData = generateData();
  const totalSavings = scenarios.filter(s => s.checked).reduce((acc, curr) => acc + curr.savings, 0);
  const projectedExtra = totalSavings * (timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12);
  const finalBalance = chartData[chartData.length - 1]?.balance || 0;
  const balanceChange = finalBalance - (baseData?.currentBalance || 0);
  const isPositive = balanceChange >= 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-8">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1c2e26] via-[#15221c] to-[#0f1a16] border border-white/10 rounded-3xl p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-axxy-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-axxy-primary to-green-600 flex items-center justify-center shadow-lg shadow-green-900/30">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Análise Preditiva</h2>
              <p className="text-gray-400 text-sm">Powered by IA Axxy</p>
            </div>
          </div>
          <p className="text-gray-300 max-w-2xl">
            Projete seu futuro financeiro com precisão e tome decisões mais inteligentes baseadas em dados reais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Main Chart Area */}
        <div className="xl:col-span-2 space-y-6">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#1c2e26] to-[#15221c] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Target className="text-blue-400" size={20} />
                </div>
                <span className="text-gray-400 text-sm">Saldo Atual</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(baseData?.currentBalance || 0)}</p>
            </div>

            <div className="bg-gradient-to-br from-[#1c2e26] to-[#15221c] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                  {isPositive ? <TrendingUp className="text-green-400" size={20} /> : <TrendingDown className="text-red-400" size={20} />}
                </div>
                <span className="text-gray-400 text-sm">Projeção</span>
              </div>
              <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(balanceChange)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1c2e26] to-[#15221c] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Zap className="text-purple-400" size={20} />
                </div>
                <span className="text-gray-400 text-sm">Economia Mensal</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalSavings)}</p>
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-gradient-to-br from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Projeção de Saldo</h3>
                <p className="text-gray-400 text-sm">Evolução estimada do seu patrimônio</p>
              </div>
              <div className="flex bg-[#0b120f] p-1.5 rounded-xl border border-white/5 shadow-inner">
                {(['3m', '6m', '12m'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${timeframe === t
                        ? 'bg-gradient-to-r from-axxy-primary to-green-600 text-white shadow-lg shadow-green-900/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {t === '3m' ? '3 Meses' : t === '6m' ? '6 Meses' : '12 Meses'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e332a" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
                    tickFormatter={(val) => `R$${(val / 1000).toFixed(1)}k`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b120f',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '16px',
                      color: '#fff',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ color: '#22c55e', fontWeight: 600 }}
                    formatter={(val: number) => [formatCurrency(val), 'Saldo Projetado']}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#22c55e"
                    strokeWidth={3}
                    fill="url(#colorBalance)"
                    dot={{ r: 5, fill: '#0b120f', stroke: '#22c55e', strokeWidth: 3 }}
                    activeDot={{ r: 8, fill: '#22c55e', stroke: '#fff', strokeWidth: 3, boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">

          {/* Scenario Simulator */}
          <div className="bg-gradient-to-br from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Sparkles className="text-orange-400" size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">Simular Cenários</h3>
            </div>

            <div className="space-y-3 mb-4">
              {scenarios.map((scenario) => {
                const Icon = getIcon(scenario.iconName);
                return (
                  <div
                    key={scenario.id}
                    onClick={() => toggleScenario(scenario.id)}
                    className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${scenario.checked
                        ? 'bg-gradient-to-r from-axxy-primary/10 to-green-600/10 border-axxy-primary/40 shadow-lg shadow-green-900/20'
                        : 'bg-[#0b120f]/50 border-white/5 hover:bg-[#0b120f] hover:border-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${scenario.checked ? 'bg-axxy-primary/20' : 'bg-white/5'} flex items-center justify-center transition-colors`}>
                        <Icon size={18} className={scenario.checked ? 'text-axxy-primary' : 'text-gray-500'} />
                      </div>
                      <div>
                        <span className={`text-sm font-semibold block ${scenario.checked ? 'text-white' : 'text-gray-400'}`}>
                          {scenario.label}
                        </span>
                        <span className="text-xs text-gray-500">+{formatCurrency(scenario.savings)}/mês</span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${scenario.checked
                        ? 'bg-axxy-primary border-axxy-primary scale-110'
                        : 'border-gray-600 group-hover:border-gray-500'
                      }`}>
                      {scenario.checked && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
              {scenarios.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum cenário disponível</p>
                </div>
              )}
            </div>

            <button className="w-full flex items-center justify-center gap-2 text-axxy-primary text-sm font-bold hover:text-green-400 transition-colors py-3 px-4 rounded-xl border border-dashed border-axxy-primary/30 hover:border-axxy-primary/60 hover:bg-axxy-primary/5">
              <Plus size={18} />
              Adicionar Cenário Personalizado
            </button>
          </div>

          {/* AI Insights Card */}
          <div className="bg-gradient-to-br from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Lightbulb size={140} className="text-green-500" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center shadow-lg">
                  <Lightbulb size={22} className="text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Insights da IA</h3>
              </div>

              <div className="bg-[#0b120f]/50 rounded-2xl p-5 border border-white/5">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {isPositive ? (
                    <>
                      🎯 <span className="text-green-400 font-bold">Excelente!</span> Se você manter esses hábitos,
                      seu saldo em <span className="text-white font-semibold">{timeframe === '3m' ? '3 meses' : timeframe === '6m' ? '6 meses' : '1 ano'}</span> pode
                      aumentar em <span className="text-green-400 font-bold">{formatCurrency(projectedExtra)}</span>.
                      <br /><br />
                      💡 Considere criar uma meta de economia com esse valor para maximizar seus resultados.
                    </>
                  ) : (
                    <>
                      ⚠️ <span className="text-orange-400 font-bold">Atenção!</span> Suas despesas estão superando suas receitas.
                      <br /><br />
                      💡 Ative alguns cenários de economia para reverter essa tendência.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
