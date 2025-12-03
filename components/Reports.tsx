import React, { useState } from 'react';
import { Printer, Download, ArrowUpRight, ArrowDownRight, ChevronDown, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [dateRange, setDateRange] = useState('this-month');

  // Mock data to match the screenshot specific values
  const reportData = [
    { name: 'Alimentação', value: 1150.00, percentage: 27.0, color: '#3b82f6' }, // Blue
    { name: 'Moradia', value: 980.50, percentage: 23.1, color: '#1d4ed8' }, // Darker Blue
    { name: 'Transporte', value: 750.25, percentage: 17.6, color: '#60a5fa' }, // Light Blue
    { name: 'Lazer', value: 620.00, percentage: 14.6, color: '#93c5fd' }, // Lighter Blue
    { name: 'Saúde', value: 450.00, percentage: 10.6, color: '#2563eb' }, // Medium Blue
    { name: 'Outros', value: 300.00, percentage: 7.1, color: '#bfdbfe' }, // Very Light Blue
  ];

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
              <select className="w-full appearance-none bg-[#15221c] border border-[#1e332a] text-white py-2.5 px-4 rounded-xl focus:outline-none focus:border-axxy-primary">
                <option>Todas as contas</option>
                <option>Banco Principal</option>
                <option>Cartão de Crédito</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
            </div>
          </div>

          <button className="w-full md:w-auto px-8 py-2.5 bg-axxy-primary text-axxy-bg font-bold rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20">
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#1e332a]">
        <nav className="flex gap-8 overflow-x-auto pb-1 scrollbar-hide">
          {['Despesas por Categoria', 'Fluxo de Caixa', 'Tendências de Gastos', 'Receitas por Fonte'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab('categories')} // Simplified for demo
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                tab === 'Despesas por Categoria' // Mock active state
                  ? 'text-axxy-primary' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
              {tab === 'Despesas por Categoria' && (
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
          <h3 className="text-4xl font-bold text-white mb-2">R$ 4.250,75</h3>
          <p className="text-red-400 text-xs font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> 12% vs. mês anterior
          </p>
        </div>

        <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
          <p className="text-gray-400 text-sm mb-2">Categoria com Maior Gasto</p>
          <h3 className="text-3xl font-bold text-white mb-2">Alimentação</h3>
          <p className="text-gray-500 text-xs">R$ 1.150,00 do total</p>
        </div>

        <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl">
          <p className="text-gray-400 text-sm mb-2">Número de Transações</p>
          <h3 className="text-4xl font-bold text-white mb-2">82</h3>
          <p className="text-axxy-primary text-xs font-medium flex items-center gap-1">
            <ArrowDownRight size={14} /> 5% vs. mês anterior
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column */}
        <div className="bg-[#15221c] border border-[#1e332a] p-6 rounded-3xl lg:col-span-1">
          <h3 className="text-lg font-bold text-white mb-6">Distribuição de Despesas</h3>
          <div className="h-[300px] relative flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={reportData}
                   innerRadius={60}
                   outerRadius={100}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="none"
                 >
                   {reportData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip 
                   formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                   contentStyle={{ backgroundColor: '#0b120f', borderColor: '#1e332a', borderRadius: '12px', color: '#fff' }}
                   itemStyle={{ color: '#fff' }}
                 />
               </PieChart>
             </ResponsiveContainer>
             {/* Center Label Mockup */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-[#15221c] flex items-center justify-center"></div>
             </div>
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
                {reportData.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-2 font-medium text-white">{item.name}</td>
                    <td className="py-4 text-right text-gray-300">R$ {item.value.toFixed(2)}</td>
                    <td className="py-4 text-right pr-2 text-gray-300">{item.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
