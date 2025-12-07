
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface DashboardProps {
  transactions: Transaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {

  // Dynamic Calculation: Financial Summary
  const { balance, incomeMonth, expenseMonth } = useMemo(() => {
    let bal = 0;
    let inc = 0;
    let exp = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    transactions.forEach(t => {
      const amount = t.amount;
      // Handle date parsing safely from YYYY-MM-DD
      const [y, m] = t.date.split('-').map(Number);
      const tMonth = m - 1; // 0-indexed
      const tYear = y;

      if (t.type === 'income') {
        bal += amount;
        if (tMonth === currentMonth && tYear === currentYear) inc += amount;
      } else {
        bal -= amount;
        if (tMonth === currentMonth && tYear === currentYear) exp += amount;
      }
    });

    return { balance: bal, incomeMonth: inc, expenseMonth: exp };
  }, [transactions]);

  // Dynamic Calculation: Monthly Flow (Bar Chart) - Last 6 Months
  const dataFlow = useMemo(() => {
    const today = new Date();
    const months = [];

    // Initialize last 6 months buckets
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthShort = d.toLocaleDateString('pt-BR', { month: 'short' });
      // Format: "Jan", "Fev", etc.
      const name = monthShort.replace('.', '').charAt(0).toUpperCase() + monthShort.replace('.', '').slice(1);

      months.push({
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        name,
        income: 0,
        expense: 0
      });
    }

    transactions.forEach(t => {
      const [y, m] = t.date.split('-').map(Number);
      const tMonth = m - 1;
      const tYear = y;

      const bucket = months.find(item => item.monthIdx === tMonth && item.year === tYear);
      if (bucket) {
        if (t.type === 'income') {
          bucket.income += t.amount;
        } else {
          bucket.expense += t.amount;
        }
      }
    });

    return months.map(({ name, income, expense }) => ({ name, income, expense }));
  }, [transactions]);

  // Dynamic Calculation: Category Distribution (Pie Chart)
  const dataDistribution = useMemo(() => {
    const categories: { [key: string]: number } = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const colors = ['#c084fc', '#fb923c', '#38bdf8', '#facc15', '#818cf8', '#ef4444'];
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Dashboard Principal</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-axxy-card p-6 rounded-3xl border border-axxy-border">
          <p className="text-gray-400 text-sm mb-1">Saldo Total Calculado</p>
          <h3 className="text-3xl font-bold text-white">{formatCurrency(balance)}</h3>
        </div>
        <div className="bg-axxy-card p-6 rounded-3xl border border-axxy-border">
          <p className="text-gray-400 text-sm mb-1">Receitas (Mês Atual)</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-white">{formatCurrency(incomeMonth)}</h3>
            <span className="bg-green-500/20 text-green-500 text-xs px-2 py-1 rounded-full flex items-center">
              <ArrowUpRight size={12} className="mr-1" /> --
            </span>
          </div>
        </div>
        <div className="bg-axxy-card p-6 rounded-3xl border border-axxy-border">
          <p className="text-gray-400 text-sm mb-1">Despesas (Mês Atual)</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-white">{formatCurrency(expenseMonth)}</h3>
            <span className="bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded-full flex items-center">
              <ArrowDownRight size={12} className="mr-1" /> --
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-axxy-card p-6 rounded-3xl border border-axxy-border">
          <h3 className="text-lg font-semibold text-white mb-1">Fluxo de Caixa</h3>
          <p className="text-sm text-gray-500 mb-6">Receitas vs Despesas (Últimos 6 Meses)</p>
          <div className="h-64 w-full">
            {/* Always render chart structure even if data is 0 to show timeline */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataFlow} barGap={8}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#15221c', border: '1px solid #1e332a', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="lg:col-span-1 bg-axxy-card p-6 rounded-3xl border border-axxy-border flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-1">Distribuição</h3>
          <p className="text-sm text-gray-500 mb-6">Por Categoria</p>

          <div className="flex-1 min-h-[220px] w-full relative">
            {dataDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataDistribution}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dataDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#15221c', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">Sem despesas</div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-3 justify-center mt-4">
            {dataDistribution.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-axxy-card p-6 rounded-3xl border border-axxy-border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Últimas Transações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-white/5">
                <th className="py-3 pl-2">Data</th>
                <th className="py-3">Descrição</th>
                <th className="py-3">Categoria</th>
                <th className="py-3 text-right pr-2">Valor</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.slice(0, 5).map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-4 pl-2 text-gray-400">
                    {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-4 font-medium text-white">{t.description}</td>
                  <td className="py-4"><span className="bg-white/5 px-2 py-1 rounded text-xs">{t.category}</span></td>
                  <td className={`py-4 text-right pr-2 font-medium ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">Nenhuma transação encontrada. Adicione uma para começar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
