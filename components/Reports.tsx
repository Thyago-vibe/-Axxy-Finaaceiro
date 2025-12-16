
import React, { useState, useEffect } from 'react';
import { Printer, Download, ArrowUpRight, ArrowDownRight, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { apiService } from '../services/apiService';
import { ReportData } from '../types';

// Tipos para dados adicionais
interface CashFlowData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface TrendData {
  month: string;
  value: number;
  change: number;
}

interface IncomeSourceData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [dateRange, setDateRange] = useState('this-month');
  const [selectedAccount, setSelectedAccount] = useState('all');

  const [data, setData] = useState<ReportData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [incomeSourceData, setIncomeSourceData] = useState<IncomeSourceData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch main report data
      const reportData = await apiService.getReports(dateRange, selectedAccount);
      setData(reportData);

      // Fetch cash flow data
      const cashFlow = await apiService.getCashFlow(dateRange, selectedAccount).catch(() => null);
      if (cashFlow) setCashFlowData(cashFlow);

      // Fetch trend data
      const trends = await apiService.getSpendingTrends(dateRange, selectedAccount).catch(() => null);
      if (trends) setTrendData(trends);

      // Fetch income sources
      const sources = await apiService.getIncomeSources(dateRange, selectedAccount).catch(() => null);
      if (sources) setIncomeSourceData(sources);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange, selectedAccount]);

  if (loading) return <div className="text-white text-center py-20">Carregando relatórios...</div>;
  if (!data) return <div className="text-gray-500 text-center py-20">Não foi possível carregar os relatórios.</div>;

  const { kpi, distribution } = data;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Relatórios Detalhados</h2>
          <p className="text-gray-400">Analise seus dados financeiros com visualizações claras e insights.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#15221c] text-gray-300 rounded-xl border border-[#1e332a] hover:bg-[#1e332a] hover:text-white transition-colors">
            <Printer size={18} />
            <span className="text-sm font-medium">Imprimir</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#15221c] text-gray-300 rounded-xl border border-[#1e332a] hover:bg-[#1e332a] hover:text-white transition-colors">
            <Download size={18} />
            <span className="text-sm font-medium">Exportar</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Filtros</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full md:w-auto">
            <label className="text-sm text-gray-400">Período</label>
            <div className="flex bg-[#15221c] p-1 rounded-xl border border-[#1e332a] w-fit">
              <button
                onClick={() => setDateRange('this-month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'this-month' ? 'bg-[#1e332a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Este Mês
              </button>
              <button
                onClick={() => setDateRange('30-days')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === '30-days' ? 'bg-[#1e332a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Últimos 30 dias
              </button>
              <button
                onClick={() => setDateRange('this-year')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'this-year' ? 'bg-[#1e332a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Este Ano
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2 w-full md:w-auto">
            <label className="text-sm text-gray-400">Contas</label>
            <div className="relative">
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full appearance-none bg-[#15221c] border border-[#1e332a] text-white py-2.5 px-4 rounded-xl focus:outline-none focus:border-axxy-primary"
              >
                <option value="all">Todas as contas</option>
                <option value="bank">Banco Principal</option>
                <option value="card">Cartão de Crédito</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
            </div>
          </div>

          <button
            onClick={fetchReports}
            className="w-full md:w-auto px-8 py-2.5 bg-axxy-primary text-axxy-bg font-bold rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#1e332a]">
        <nav className="flex gap-8 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'categories', label: 'Despesas por Categoria' },
            { id: 'cashflow', label: 'Fluxo de Caixa' },
            { id: 'trends', label: 'Tendências de Gastos' },
            { id: 'income', label: 'Receitas por Fonte' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === tab.id
                ? 'text-axxy-primary'
                : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-axxy-primary rounded-t-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
          <p className="text-gray-400 text-sm mb-2">Total Gasto</p>
          <h3 className="text-4xl font-bold text-white mb-2">{formatCurrency(kpi.totalSpent)}</h3>
          <p className={`${kpi.totalSpentChange > 0 ? 'text-red-400' : 'text-green-400'} text-xs font-medium flex items-center gap-1`}>
            {kpi.totalSpentChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(kpi.totalSpentChange)}% vs. mês anterior
          </p>
        </div>

        <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
          <p className="text-gray-400 text-sm mb-2">Categoria com Maior Gasto</p>
          <h3 className="text-3xl font-bold text-white mb-2 truncate">{kpi.topCategory || 'N/A'}</h3>
          <p className="text-gray-500 text-xs">{formatCurrency(kpi.topCategoryValue)} do total</p>
        </div>

        <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
          <p className="text-gray-400 text-sm mb-2">Número de Transações</p>
          <h3 className="text-4xl font-bold text-white mb-2">{kpi.transactionCount}</h3>
          <p className="text-axxy-primary text-xs font-medium flex items-center gap-1">
            <ArrowDownRight size={14} /> {kpi.transactionCountChange}% vs. mês anterior
          </p>
        </div>
      </div>

      {/* Main Content Grid - Conditional based on active tab */}

      {/* TAB: Despesas por Categoria */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Column */}
          <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl lg:col-span-1">
            <h3 className="text-lg font-bold text-white mb-6">Distribuição de Despesas</h3>
            <div className="h-[300px] relative flex items-center justify-center">
              {distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#0b120f', borderColor: '#1e332a', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500">Sem dados para exibir</div>
              )}
              {distribution.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 rounded-full bg-[#15221c] flex items-center justify-center"></div>
                </div>
              )}
            </div>
          </div>

          {/* Table Column */}
          <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-6">Resumo por Categoria</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-white/5">
                    <th className="text-left py-4 pl-2">Categoria</th>
                    <th className="text-right py-4">Valor</th>
                    <th className="text-right py-4 pr-2">% do Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {distribution.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-4 pl-2 font-medium text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        {item.name}
                      </td>
                      <td className="py-4 text-right text-gray-300">{formatCurrency(item.value)}</td>
                      <td className="py-4 text-right pr-2 text-gray-300">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {distribution.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-gray-500">Nenhum dado encontrado para o período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Fluxo de Caixa */}
      {activeTab === 'cashflow' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
            <h3 className="text-lg font-bold text-white mb-2">Fluxo de Caixa</h3>
            <p className="text-gray-400 text-sm mb-6">Receitas vs Despesas ao longo do tempo</p>
            <div className="h-[400px]">
              {cashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e332a" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#0b120f', borderColor: '#1e332a', borderRadius: '12px', color: '#fff' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Sem dados de fluxo de caixa para o período selecionado
                </div>
              )}
            </div>
          </div>

          {/* Cash Flow Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cashFlowData.length > 0 && (
              <>
                <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
                  <p className="text-gray-400 text-sm mb-2">Total Receitas</p>
                  <h3 className="text-2xl font-bold text-green-400">
                    {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.income, 0))}
                  </h3>
                </div>
                <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
                  <p className="text-gray-400 text-sm mb-2">Total Despesas</p>
                  <h3 className="text-2xl font-bold text-red-400">
                    {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.expense, 0))}
                  </h3>
                </div>
                <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
                  <p className="text-gray-400 text-sm mb-2">Saldo do Período</p>
                  <h3 className={`text-2xl font-bold ${cashFlowData.reduce((sum, d) => sum + d.income - d.expense, 0) >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                    }`}>
                    {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.income - d.expense, 0))}
                  </h3>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB: Tendências de Gastos */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
            <h3 className="text-lg font-bold text-white mb-2">Tendência de Gastos</h3>
            <p className="text-gray-400 text-sm mb-6">Evolução dos seus gastos ao longo do tempo</p>
            <div className="h-[400px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e332a" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#0b120f', borderColor: '#1e332a', borderRadius: '12px', color: '#fff' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Gastos"
                      stroke="#8b5cf6"
                      fill="url(#trendGradient)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Sem dados de tendência para o período selecionado
                </div>
              )}
            </div>
          </div>

          {/* Trend Analysis Cards */}
          {trendData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Média Mensal</p>
                    <h3 className="text-xl font-bold text-white">
                      {formatCurrency(trendData.reduce((sum, d) => sum + d.value, 0) / trendData.length)}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trendData[trendData.length - 1]?.change >= 0
                    ? 'bg-red-500/20'
                    : 'bg-green-500/20'
                    }`}>
                    {trendData[trendData.length - 1]?.change >= 0
                      ? <TrendingUp className="text-red-400" size={20} />
                      : <TrendingDown className="text-green-400" size={20} />
                    }
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Variação vs Mês Anterior</p>
                    <h3 className={`text-xl font-bold ${trendData[trendData.length - 1]?.change >= 0
                      ? 'text-red-400'
                      : 'text-green-400'
                      }`}>
                      {trendData[trendData.length - 1]?.change >= 0 ? '+' : ''}
                      {trendData[trendData.length - 1]?.change?.toFixed(1) || 0}%
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Receitas por Fonte */}
      {activeTab === 'income' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Column */}
          <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl lg:col-span-1">
            <h3 className="text-lg font-bold text-white mb-6">Distribuição de Receitas</h3>
            <div className="h-[300px] relative flex items-center justify-center">
              {incomeSourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeSourceData}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {incomeSourceData.map((entry, index) => (
                        <Cell key={`income-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#0b120f', borderColor: '#1e332a', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500">Sem dados de receitas para exibir</div>
              )}
              {incomeSourceData.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 rounded-full bg-[#15221c] flex items-center justify-center">
                    <span className="text-green-400 font-bold text-lg">
                      {formatCurrency(incomeSourceData.reduce((sum, d) => sum + d.value, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Column */}
          <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-6">Resumo de Receitas por Fonte</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-white/5">
                    <th className="text-left py-4 pl-2">Fonte</th>
                    <th className="text-right py-4">Valor</th>
                    <th className="text-right py-4 pr-2">% do Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {incomeSourceData.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-4 pl-2 font-medium text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        {item.name}
                      </td>
                      <td className="py-4 text-right text-green-400 font-medium">{formatCurrency(item.value)}</td>
                      <td className="py-4 text-right pr-2 text-gray-300">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {incomeSourceData.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-gray-500">Nenhuma receita encontrada para o período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
