
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, ShoppingBag, Clapperboard, Car, AlertCircle, Plus, Lightbulb } from 'lucide-react';
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
        name: i === 0 ? 'Agora' : `Mês ${i} `,
        balance: currentBalance + (netMonthly * i),
      });
    }
    return chartData;
  };

  if (loading) return <div className="text-white text-center py-20">Carregando análise preditiva...</div>;
  if (!baseData) return <div className="text-gray-500 text-center py-20">Dados insuficientes para análise.</div>;

  const chartData = generateData();
  const totalSavings = scenarios.filter(s => s.checked).reduce((acc, curr) => acc + curr.savings, 0);
  const projectedExtra = totalSavings * (timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl pb-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Análise Preditiva</h2>
        <p className="text-gray-400">Projete seu futuro financeiro e tome decisões mais inteligentes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h3 className="text-xl font-bold text-white">Projeção de Saldo</h3>
            <div className="flex bg-[#0b120f] p-1 rounded-xl border border-white/5">
              {(['3m', '6m', '12m'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px - 4 py - 1.5 rounded - lg text - sm font - medium transition - all ${timeframe === t
                    ? 'bg-[#1e332a] text-white'
                    : 'text-gray-400 hover:text-white'
                    } `}
                >
                  {t === '3m' ? '3 Meses' : t === '6m' ? '6 Meses' : '12 Meses'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e332a" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(val) => `R$${(val / 1000).toFixed(1)} k`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b120f', border: '1px solid #1e332a', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#22c55e' }}
                  formatter={(val: number) => [formatCurrency(val), 'Saldo Projetado']}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#22c55e"
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#0b120f', stroke: '#22c55e', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-8">

          {/* Scenario Simulator */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Simular Cenários</h3>

            <div className="space-y-3">
              {scenarios.map((scenario) => {
                const Icon = getIcon(scenario.iconName);
                return (
                  <div
                    key={scenario.id}
                    onClick={() => toggleScenario(scenario.id)}
                    className={`flex items - center justify - between p - 4 rounded - xl border cursor - pointer transition - all ${scenario.checked
                      ? 'bg-[#15221c] border-axxy-primary/30'
                      : 'bg-[#15221c]/50 border-transparent hover:bg-[#15221c]'
                      } `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={scenario.color} />
                      <span className={`text - sm font - medium ${scenario.checked ? 'text-white' : 'text-gray-400'} `}>
                        {scenario.label}
                      </span>
                    </div>
                    <div className={`w - 5 h - 5 rounded - full border flex items - center justify - center transition - colors ${scenario.checked
                      ? 'bg-axxy-primary border-axxy-primary'
                      : 'border-gray-600'
                      } `}>
                      {scenario.checked && <div className="w-2 h-2 bg-[#0b120f] rounded-full" />}
                    </div>
                  </div>
                );
              })}
              {scenarios.length === 0 && <div className="text-gray-500">Nenhum cenário disponível.</div>}
            </div>

            <button className="flex items-center gap-2 text-axxy-primary text-sm font-bold hover:text-green-400 transition-colors mt-2">
              <Plus size={16} /> Adicionar Variável
            </button>
          </div>

          {/* AI Insights Card */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Insights da IA</h3>
            <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Lightbulb size={120} className="text-green-500" />
              </div>

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-4">
                  <Lightbulb size={20} />
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">
                  Se você <span className="text-green-400 font-bold">manter esses hábitos</span>,
                  seu saldo em {timeframe === '3m' ? '3 meses' : timeframe === '6m' ? '6 meses' : '1 ano'} pode
                  aumentar em <span className="text-green-400 font-bold">{formatCurrency(projectedExtra)}</span>.
                  Considere criar uma meta de economia com esse valor.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
