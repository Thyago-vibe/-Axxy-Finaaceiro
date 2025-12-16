
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { Transaction, Account, Debt } from '../types';
import { apiService } from '../services/apiService';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, accounts }) => {

  // State para dívidas
  const [debts, setDebts] = useState<Debt[]>([]);

  // Carregar dívidas do backend
  useEffect(() => {
    apiService.getDebts().then(setDebts).catch(console.error);
  }, []);

  // Calculate balance from accounts
  const totalAccountBalance = useMemo(() => {
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }, [accounts]);

  // Dynamic Calculation: Financial Summary (for monthly income/expense)
  const { incomeMonth, expenseMonth } = useMemo(() => {
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

    return { incomeMonth: inc, expenseMonth: exp };
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
  // Inclui tanto transações de despesa quanto dívidas por categoria
  const dataDistribution = useMemo(() => {
    const categories: { [key: string]: number } = {};

    // Adicionar transações de despesa
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    // Adicionar dívidas/compromissos por categoria (valor mensal)
    debts.forEach(d => {
      const cat = d.category || 'Outros';
      categories[cat] = (categories[cat] || 0) + (d.monthly || 0);
    });

    const colors = ['#c084fc', '#fb923c', '#38bdf8', '#facc15', '#818cf8', '#ef4444', '#22c55e', '#f43f5e'];
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [transactions, debts]);

  // Cálculos de Dívidas/Compromissos do Mês
  const debtSummary = useMemo(() => {
    const monthlyTotal = debts.reduce((sum, d) => sum + (d.monthly || 0), 0);
    const pendingDebts = debts.filter(d => d.status === 'Pendente' || d.status === 'Atrasado');
    const pendingTotal = pendingDebts.reduce((sum, d) => sum + (d.monthly || 0), 0);
    const overdueCount = debts.filter(d => d.status === 'Atrasado').length;
    return { monthlyTotal, pendingTotal, pendingCount: pendingDebts.length, overdueCount };
  }, [debts]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Dashboard Principal</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-axxy-card p-6 rounded-3xl border border-axxy-border">
          <p className="text-gray-400 text-sm mb-1">Saldo Total (Contas)</p>
          <h3 className="text-3xl font-bold text-white">{formatCurrency(totalAccountBalance)}</h3>
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
        <div className={`bg-axxy-card p-6 rounded-3xl border ${debtSummary.overdueCount > 0 ? 'border-red-500/50' : 'border-axxy-border'}`}>
          <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
            <CreditCard size={14} /> Compromissos do Mês
          </p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-white">{formatCurrency(debtSummary.monthlyTotal)}</h3>
            {debtSummary.overdueCount > 0 && (
              <span className="bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded-full flex items-center">
                <AlertTriangle size={12} className="mr-1" /> {debtSummary.overdueCount} atrasado
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">{debts.length} dívidas • {debtSummary.pendingCount} pendentes</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Fluxo de Caixa */}
        <div className="bg-axxy-card p-6 rounded-3xl border border-axxy-border">
          <h3 className="text-lg font-semibold text-white mb-1">Fluxo de Caixa</h3>
          <p className="text-sm text-gray-500 mb-6">Receitas vs Despesas (Últimos 6 Meses)</p>
          <div className="h-64 w-full">
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

        {/* Bar Chart - Compromissos por Categoria */}
        <div className="bg-axxy-card p-6 rounded-3xl border border-axxy-border flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-1">Compromissos</h3>
          <p className="text-sm text-gray-500 mb-6">Despesas e Dívidas por Categoria</p>

          <div className="flex-1 min-h-[250px] w-full relative">
            {dataDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#15221c', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {dataDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">Sem despesas</div>
            )}
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
