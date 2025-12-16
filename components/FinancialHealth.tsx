import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle, Sparkles, TrendingUp, Target, Zap, DollarSign, Tag, ChevronDown } from 'lucide-react';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';
import { Debt, Account, Category } from '../types';
import { apiService } from '../services/apiService';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Removendo createPortal temporariamente para simplicidade e compatibilidade
// Usaremos um modal com z-index alto e fixed position direto no DOM

type DebtStatus = 'Em dia' | 'Pendente' | 'Atrasado';

interface AIAnalysis {
  score?: number;
  status?: string;
  summary?: string;
  recommendations?: string[];
  priority_debt?: string;
  savings_tip?: string;
}

interface DebtPriority {
  id: number;
  nome: string;
  prioridade: number;
  urgencia: string;
  motivo: string;
  acao_recomendada: string;
  valor_restante?: number;
}

interface FinancialHealthProps {
  debts?: Debt[]; // Opcional - o componente busca seus próprios dados
  onAddDebt?: () => void;
  onUpdateDebts?: () => void;
}

export const FinancialHealth: React.FC<FinancialHealthProps> = ({ debts: initialDebts = [], onAddDebt, onUpdateDebts }) => {
  console.log('Rendering FinancialHealth Component'); // Debug Log

  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'status' | 'category'>('status');

  // Cálculo de totalDebt movido para antes do useMemo para evitar erro de referência
  const safeDebtsForCalc = Array.isArray(debts) ? debts : [];
  const totalDebt = safeDebtsForCalc.reduce((sum, d) => sum + (typeof d.remaining === 'number' ? d.remaining : 0), 0);

  // Mock data for Evolution Chart
  const evolutionData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('pt-BR', { month: 'short' });
      // Mock past data: varies +/- 20% from current total, but last point is exact
      // If totalDebt is 0, just random small numbers for visual
      const baseVal = totalDebt || 1000;
      const val = i === 0
        ? totalDebt
        : baseVal * (0.8 + Math.random() * 0.4);

      data.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        valor: val
      });
    }
    return data;
  }, [totalDebt]);

  // Estados para IA
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiPriorities, setAiPriorities] = useState<DebtPriority[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    debtId: null as number | null,
    amount: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [newDebt, setNewDebt] = useState({
    name: '',
    remaining: '',
    monthly: '',
    dueDate: '',
    status: 'Em dia' as DebtStatus,
    isUrgent: false,
    debtType: 'parcelado' as 'fixo' | 'parcelado',
    totalInstallments: '',
    currentInstallment: '',
    category: 'Outros' // Added category
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [debtsData, categoriesData, accountsData] = await Promise.all([
        apiService.getDebts(),
        apiService.getCategories(),
        apiService.getAccounts()
      ]);
      console.log('Debts loaded:', debtsData); // Debug Log
      setDebts(Array.isArray(debtsData) ? debtsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setError(null);
      // Carregar IA após carregar dívidas
      loadAIAnalysis();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Não foi possível carregar seus dados.');
      setDebts([]);
      setCategories([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDebts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDebts();
      console.log('Debts loaded:', data); // Debug Log
      setDebts(Array.isArray(data) ? data : []);
      setError(null);
      // Carregar IA após carregar dívidas
      loadAIAnalysis();
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error);
      setError('Não foi possível carregar suas dívidas.');
      setDebts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAIAnalysis = async () => {
    try {
      setLoadingAI(true);
      // Buscar análise geral
      const analysisRes = await fetch('http://localhost:8000/api/ai/financial-health/');
      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        if (analysisData.analysis) {
          setAiAnalysis(analysisData.analysis);
        }
      }
      // Buscar prioridades
      const priorityRes = await fetch('http://localhost:8000/api/ai/debt-priority/');
      if (priorityRes.ok) {
        const priorityData = await priorityRes.json();
        if (priorityData.priorities) {
          setAiPriorities(priorityData.priorities);
        } else if (priorityData.analysis?.priorities) {
          setAiPriorities(priorityData.analysis.priorities);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar análise IA:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validar inputs
      const monthlyVal = parseCurrencyInput(newDebt.monthly);
      let remainingVal = 0;

      if (newDebt.debtType === 'parcelado') {
        remainingVal = parseCurrencyInput(newDebt.remaining);
        if (isNaN(remainingVal)) {
          alert('Por favor, insira um valor restante válido.');
          return;
        }
      }

      if (isNaN(monthlyVal)) {
        alert('Por favor, insira um valor mensal válido.');
        return;
      }

      const debtData = editingDebt
        ? {
          id: editingDebt.id,
          name: newDebt.name,
          remaining: remainingVal,
          monthly: monthlyVal,
          dueDate: newDebt.dueDate,
          status: newDebt.status,
          isUrgent: newDebt.isUrgent,
          debtType: newDebt.debtType,
          totalInstallments: newDebt.totalInstallments ? parseInt(newDebt.totalInstallments) : null,
          currentInstallment: newDebt.currentInstallment ? parseInt(newDebt.currentInstallment) : null,
          category: newDebt.category
        }
        : {
          name: newDebt.name,
          remaining: remainingVal,
          monthly: monthlyVal,
          dueDate: newDebt.dueDate,
          status: newDebt.status,
          isUrgent: newDebt.isUrgent,
          debtType: newDebt.debtType,
          totalInstallments: newDebt.totalInstallments ? parseInt(newDebt.totalInstallments) : null,
          currentInstallment: newDebt.currentInstallment ? parseInt(newDebt.currentInstallment) : null,
          category: newDebt.category
        };

      if (editingDebt) {
        await apiService.updateDebt(editingDebt.id, debtData as Debt);
      } else {
        await apiService.createDebt(debtData);
      }

      await loadDebts();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar dívida:', error);
      alert('Erro ao salvar. Verificar o console.');
    }
  };

  const openModal = (debt?: Debt) => {
    if (debt) {
      setEditingDebt(debt);
      setNewDebt({
        name: debt.name,
        remaining: formatCurrencyInput(debt.remaining.toFixed(2)),
        monthly: formatCurrencyInput(debt.monthly.toFixed(2)),
        dueDate: debt.dueDate.split('T')[0],
        status: debt.status as DebtStatus,
        isUrgent: debt.isUrgent || false,
        debtType: debt.debtType || 'parcelado',
        totalInstallments: debt.totalInstallments?.toString() || '',
        currentInstallment: debt.currentInstallment?.toString() || '',
        category: debt.category || 'Outros'
      });
    } else {
      setNewDebt({
        name: '',
        remaining: '',
        monthly: '',
        dueDate: '',
        status: 'Em dia',
        isUrgent: false,
        debtType: 'parcelado',
        totalInstallments: '',
        currentInstallment: '',
        category: 'Outros'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDebt(null);
  };

  const handleDeleteDebt = async (debt: Debt) => {
    if (confirm(`Deseja excluir a dívida "${debt.name}"?`)) {
      try {
        await apiService.deleteDebt(debt.id);
        await loadDebts();
      } catch (error) {
        console.error('Erro ao excluir dívida:', error);
        alert('Erro ao excluir. Verifique o console.');
      }
    }
  };

  const openPaymentModal = (debt: Debt) => {
    // Default payment amount: monthly installment OR remaining amount (if smaller or fixed)
    let defaultAmount = '';
    if (debt.debtType === 'fixo') {
      defaultAmount = formatCurrencyInput(debt.monthly.toFixed(2));
    } else {
      // If remaining is less than monthly, suggest remaining. Otherwise monthly.
      // Or just default to monthly.
      // Let's suggest monthly if it exists, otherwise remaining.
      const val = (debt.monthly > 0 && debt.monthly < debt.remaining) ? debt.monthly : debt.remaining;
      defaultAmount = formatCurrencyInput(val.toFixed(2));
    }

    setPaymentData({
      debtId: debt.id,
      amount: defaultAmount,
      accountId: accounts.length > 0 ? accounts[0].id?.toString() || '' : '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.debtId || !paymentData.accountId || !paymentData.amount) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const amount = parseCurrencyInput(paymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Valor inválido.');
        return;
      }

      await apiService.payDebt(
        paymentData.debtId,
        amount,
        parseInt(paymentData.accountId),
        paymentData.date
      );

      setIsPaymentModalOpen(false);
      await loadDebts();
      await loadData(); // Refresh accounts to show new balance if we were showing it
      alert('Pagamento registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento.');
    }
  };

  // Cálculos Seguros (Imutáveis) - safeDebts e totalDebt já foram definidos acima
  const safeDebts = safeDebtsForCalc;

  const pendingPayments = safeDebts
    .filter(d => d.status === 'Pendente')
    .reduce((sum, d) => sum + (typeof d.monthly === 'number' ? d.monthly : 0), 0);

  // Sort seguro usando cópia
  const sortedDebts = [...safeDebts].sort((a, b) => {
    const timeA = new Date(a.dueDate).getTime();
    const timeB = new Date(b.dueDate).getTime();
    return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
  });

  const nextDueDate = sortedDebts.length > 0 ? sortedDebts[0].dueDate : null;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'Em dia': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Em dia' },
      'Pendente': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pendente' },
      'Atrasado': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Atrasado' }
    };
    // Fallback seguro
    const badge = badges[status] || badges['Em dia'];
    return (
      <span className={`inline-block rounded-full ${badge.bg} px-3 py-1 text-xs font-medium ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) return <div className="text-white p-8">Carregando saúde financeira...</div>;
  if (error) return <div className="text-red-400 p-8 flex items-center gap-2"><AlertCircle /> {error}</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-8 relative">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Saúde Financeira</h2>
          <p className="text-gray-400">Acompanhe e gerencie suas dívidas para uma vida financeira mais saudável</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 bg-axxy-primary text-axxy-bg font-bold rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg"
        >
          <Plus size={20} /> <span>Nova Dívida</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#15221c] border border-[#1e332a] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">Dívida Total</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalDebt)}</p>
        </div>
        <div className="bg-[#15221c] border border-[#1e332a] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">Pagamentos Pendentes</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(pendingPayments)}</p>
        </div>
        <div className="bg-[#15221c] border border-[#1e332a] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">Próximo Vencimento</p>
          <p className="text-3xl font-bold text-white">
            {nextDueDate ? new Date(nextDueDate).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
        <div className="bg-[#15221c] border border-[#1e332a] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-3">Status das Dívidas</p>
          {(() => {
            const emDia = safeDebts.filter(d => d.status === 'Em dia').length;
            const pendente = safeDebts.filter(d => d.status === 'Pendente').length;
            const atrasado = safeDebts.filter(d => d.status === 'Atrasado').length;
            const total = safeDebts.length || 1;
            return (
              <div className="flex flex-col gap-2">
                <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-gray-700">
                  {emDia > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(emDia / total) * 100}%` }} />}
                  {pendente > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${(pendente / total) * 100}%` }} />}
                  {atrasado > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(atrasado / total) * 100}%` }} />}
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-green-400">● {emDia} Em dia</span>
                  <span className="text-yellow-400">● {pendente} Pend.</span>
                  <span className="text-red-400">● {atrasado} Atras.</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução (Mock visual) */}
        {/* Evolução (Area Chart) */}
        <div className="bg-[#15221c] border border-[#1e332a] rounded-xl p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <p className="text-gray-400 text-sm mb-2">Evolução do Valor</p>
            <p className="text-3xl font-bold text-white mb-4">{formatCurrency(totalDebt)}</p>
          </div>
          <div className="h-[250px] w-full items-end gap-2 px-2 -ml-4">
            {/* Fallback to simple fixed size if responsive container is the issue */}
            <div className="w-full h-full overflow-hidden">
              <AreaChart width={500} height={250} data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e332a" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  dy={10}
                />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#15221c', borderColor: '#1e332a', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#22c55e' }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#22c55e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValor)"
                />
              </AreaChart>
            </div>
          </div>
        </div>

        {/* Composição por Status (Requested) */}
        {/* Composição por Status (Requested) */}
        <div className="bg-[#15221c] border border-[#1e332a] rounded-xl p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Distribuição das Dívidas</p>
              <h3 className="text-2xl font-bold text-white">
                {chartView === 'status' ? 'Por Status' : 'Por Categoria'}
              </h3>
            </div>
            <div className="flex bg-[#0b120f] rounded-lg p-1 border border-gray-700/50">
              <button
                onClick={() => setChartView('status')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${chartView === 'status'
                  ? 'bg-axxy-primary text-axxy-bg shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                Status
              </button>
              <button
                onClick={() => setChartView('category')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${chartView === 'category'
                  ? 'bg-axxy-primary text-axxy-bg shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                Categoria
              </button>
            </div>
          </div>

          <div className="h-[200px] w-full">
            {chartView === 'status' ? (
              // Status View (Existing Bars)
              (() => {
                const getDebtValue = (d: Debt) => (d.debtType === 'fixo' || d.remaining === 0) ? d.monthly : d.remaining;
                const emDiaVal = safeDebts.filter(d => d.status === 'Em dia').reduce((acc, d) => acc + getDebtValue(d), 0);
                const pendenteVal = safeDebts.filter(d => d.status === 'Pendente').reduce((acc, d) => acc + getDebtValue(d), 0);
                const atrasadoVal = safeDebts.filter(d => d.status === 'Atrasado').reduce((acc, d) => acc + getDebtValue(d), 0);
                const maxBar = Math.max(emDiaVal, pendenteVal, atrasadoVal) || 1;
                const totalValue = emDiaVal + pendenteVal + atrasadoVal || 1;

                return (
                  <div className="grid grid-cols-3 gap-4 h-full items-end px-2">
                    <div className="flex flex-col items-center gap-3 group h-full justify-end">
                      <div className="w-full max-w-[60px] bg-green-500/20 group-hover:bg-green-500/30 border border-green-500/30 rounded-t-xl transition-all relative"
                        style={{ height: `${(emDiaVal / maxBar) * 80}%`, minHeight: '4px' }}></div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-green-400">Em dia</p>
                        <p className="text-[10px] text-gray-400">{formatCurrency(emDiaVal)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3 group h-full justify-end">
                      <div className="w-full max-w-[60px] bg-yellow-500/20 group-hover:bg-yellow-500/30 border border-yellow-500/30 rounded-t-xl transition-all relative"
                        style={{ height: `${(pendenteVal / maxBar) * 80}%`, minHeight: '4px' }}></div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-yellow-400">Pendente</p>
                        <p className="text-[10px] text-gray-400">{formatCurrency(pendenteVal)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3 group h-full justify-end">
                      <div className="w-full max-w-[60px] bg-red-500/20 group-hover:bg-red-500/30 border border-red-500/30 rounded-t-xl transition-all relative"
                        style={{ height: `${(atrasadoVal / maxBar) * 80}%`, minHeight: '4px' }}></div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-red-500">Atrasado</p>
                        <p className="text-[10px] text-gray-400">{formatCurrency(atrasadoVal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              // Category View (Pie Chart)
              (() => {
                const categoryData = safeDebts.reduce((acc, debt) => {
                  const cat = debt.category || 'Outros';
                  const value = (debt.debtType === 'fixo' || debt.remaining === 0) ? debt.monthly : debt.remaining;
                  acc[cat] = (acc[cat] || 0) + value;
                  return acc;
                }, {} as Record<string, number>);

                const data = Object.entries(categoryData)
                  .map(([name, value]) => ({ name, value }))
                  .sort((a, b) => b.value - a.value);

                const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7', '#ec4899'];

                if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sem dados</div>;

                return (
                  <div className="flex items-center h-full">
                    <div className="flex-1 h-full min-w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            innerRadius={45} // Increased slightly
                            outerRadius={70} // Reduced slightly from 75/80 often used
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ backgroundColor: '#0b120f', border: '1px solid #1e332a', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-28 flex flex-col justify-center gap-1 overflow-y-auto max-h-[180px] pl-2">
                      {/* Increased width to 28, added pl-2 */}
                      {data.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-white truncate font-medium">{entry.name}</span>
                            <span className="text-[9px] text-gray-500">{formatCurrency(entry.value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-[#15221c] to-[#1a2f23] border border-[#1e332a] rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-axxy-primary/20 rounded-xl">
            <Sparkles className="w-6 h-6 text-axxy-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Análise Inteligente</h3>
            <p className="text-sm text-gray-400">Insights da IA para sua saúde financeira</p>
          </div>
          <button
            onClick={loadAIAnalysis}
            className="ml-auto px-4 py-2 bg-axxy-primary/20 hover:bg-axxy-primary/30 text-axxy-primary rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Zap size={16} />
            Atualizar
          </button>
        </div>

        {loadingAI ? (
          <div className="text-center py-8 text-gray-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 animate-pulse text-axxy-primary" />
            <p>Analisando seus dados...</p>
          </div>
        ) : aiAnalysis ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score e Status */}
            <div className="bg-[#0f1a16] rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className={`text-5xl font-black ${(aiAnalysis.score || 0) >= 70 ? 'text-green-400' :
                  (aiAnalysis.score || 0) >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                  {aiAnalysis.score || 50}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Score de Saúde</p>
                  <p className={`font-bold ${aiAnalysis.status === 'excellent' ? 'text-green-400' :
                    aiAnalysis.status === 'good' ? 'text-green-300' :
                      aiAnalysis.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                    {aiAnalysis.status === 'excellent' ? '🌟 Excelente' :
                      aiAnalysis.status === 'good' ? '✅ Bom' :
                        aiAnalysis.status === 'warning' ? '⚠️ Atenção' : '🚨 Crítico'}
                  </p>
                </div>
              </div>
              {aiAnalysis.summary && (
                <p className="text-gray-300 text-sm">{aiAnalysis.summary}</p>
              )}
              {aiAnalysis.savings_tip && (
                <div className="mt-4 p-3 bg-axxy-primary/10 rounded-xl border border-axxy-primary/20">
                  <p className="text-xs text-axxy-primary font-medium">💡 Dica de Economia</p>
                  <p className="text-sm text-gray-300 mt-1">{aiAnalysis.savings_tip}</p>
                </div>
              )}
            </div>

            {/* Recomendações */}
            <div className="bg-[#0f1a16] rounded-2xl p-5">
              <p className="text-white font-bold mb-3 flex items-center gap-2">
                <Target size={18} className="text-axxy-primary" />
                Recomendações
              </p>
              {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {aiAnalysis.recommendations.slice(0, 4).map((rec, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-axxy-primary mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Sem recomendações no momento</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Cadastre dívidas para receber análise da IA</p>
          </div>
        )}

        {/* Prioridades de Pagamento */}
        {aiPriorities.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-axxy-primary" />
              Ordem de Prioridade para Pagamento
            </p>
            <div className="grid gap-3">
              {aiPriorities.slice(0, 5).map((p, i) => (
                <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl ${p.urgencia === 'alta' ? 'bg-red-500/10 border border-red-500/20' :
                  p.urgencia === 'media' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                    'bg-green-500/10 border border-green-500/20'
                  }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${p.urgencia === 'alta' ? 'bg-red-500/30 text-red-400' :
                    p.urgencia === 'media' ? 'bg-yellow-500/30 text-yellow-400' :
                      'bg-green-500/30 text-green-400'
                    }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{p.nome}</p>
                    <p className="text-sm text-gray-400">{p.motivo}</p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      // Tentar encontrar a dívida original para pegar o valor mensal se for fixa
                      const debtRef = safeDebts.find(d => d.name === p.nome);
                      const displayValue = (debtRef?.debtType === 'fixo' || !p.valor_restante) ? (debtRef?.monthly || p.valor_restante || 0) : p.valor_restante;
                      return <p className="text-white font-bold">{formatCurrency(displayValue)}</p>;
                    })()}
                    <p className={`text-xs ${p.urgencia === 'alta' ? 'text-red-400' :
                      p.urgencia === 'media' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                      {p.acao_recomendada}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Debts Table */}
      <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-2xl font-bold text-white">Minhas Dívidas Ativas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0f1a16]">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="py-4 pl-6 font-medium text-gray-400">Nome da Dívida</th>
                <th className="py-4 font-medium text-gray-400">Tipo</th>
                <th className="py-4 font-medium text-gray-400">Valor Restante</th>
                <th className="py-4 font-medium text-gray-400">Parcela Mensal</th>
                <th className="py-4 font-medium text-gray-400">Vencimento</th>
                <th className="py-4 font-medium text-gray-400">Status</th>
                <th className="py-4 pr-6 font-medium text-center text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {safeDebts.map((debt) => (
                <tr key={debt.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-4 pl-6 font-medium text-white">
                    <div className="flex flex-col">
                      <span>{debt.name}</span>
                      {debt.debtType === 'parcelado' && debt.currentInstallment && debt.totalInstallments && (
                        <span className="text-xs text-gray-500">
                          Parcela {debt.currentInstallment}/{debt.totalInstallments}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${debt.debtType === 'fixo'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-purple-500/20 text-purple-400'
                      }`}>
                      {debt.debtType === 'fixo' ? '🔄 Fixo' : '📊 Parcelado'}
                    </span>
                  </td>
                  <td className="py-4 text-white">{formatCurrency(debt.remaining)}</td>
                  <td className="py-4 text-white">{formatCurrency(debt.monthly)}</td>
                  <td className="py-4 text-gray-300">
                    {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-4">{getStatusBadge(debt.status)}</td>
                  <td className="py-4 pr-6">

                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openPaymentModal(debt)}
                        className="text-gray-400 hover:text-green-400 transition-colors p-2 hover:bg-green-400/10 rounded-lg"
                        title="Pagar"
                      >
                        <DollarSign size={18} />
                      </button>
                      <button
                        onClick={() => openModal(debt)}
                        className="text-gray-400 hover:text-axxy-primary transition-colors p-2 hover:bg-axxy-primary/10 rounded-lg"
                        title="Editar dívida"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteDebt(debt)}
                        className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                        title="Excluir dívida"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {safeDebts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={32} className="opacity-50" />
                      <p>Nenhuma dívida cadastrada.</p>
                      <p className="text-xs">Sua saúde financeira está ótima! 🎉</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div >

      {/* Modal - Renderizado diretamente com Fixed Position (Sem Portal) para teste */}
      {/* Payment Modal */}
      {
        isPaymentModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsPaymentModalOpen(false)}
            ></div>

            <div className="relative bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl animate-fade-in z-10 overflow-hidden">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Registrar Pagamento</h3>

                <form onSubmit={handlePaymentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor do Pagamento</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: formatCurrencyInput(e.target.value) })}
                        className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Conta de Origem</label>
                    <select
                      value={paymentData.accountId}
                      onChange={(e) => setPaymentData({ ...paymentData, accountId: e.target.value })}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                      required
                    >
                      <option value="">Selecione uma conta...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Saldo: {formatCurrency(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data do Pagamento</label>
                    <input
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none [color-scheme:dark] transition-colors"
                      required
                    />
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
                    >
                      Confirmar Pagamento
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
      {
        isModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={closeModal}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl animate-fade-in z-10 overflow-hidden">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="p-8">
                <h3 className="text-2xl font-bold text-white mb-6">
                  {editingDebt ? 'Editar Dívida' : 'Nova Dívida'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Dívida</label>
                    <input
                      type="text"
                      value={newDebt.name}
                      onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                      placeholder="Ex: Financiamento Veículo"
                      className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1">Tipo de Dívida</label>
                      <select
                        value={newDebt.debtType}
                        onChange={(e) => setNewDebt({ ...newDebt, debtType: e.target.value as any })}
                        className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-axxy-primary"
                      >
                        <option value="parcelado">Parcelado</option>
                        <option value="fixo">Fixo</option>
                      </select>
                    </div>

                    {newDebt.debtType === 'parcelado' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-400 mb-1">Atual</label>
                          <input
                            type="number"
                            min="1"
                            value={newDebt.currentInstallment}
                            onChange={(e) => setNewDebt({ ...newDebt, currentInstallment: e.target.value })}
                            className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-axxy-primary"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Total</label>
                          <input
                            type="number"
                            min="1"
                            value={newDebt.totalInstallments}
                            onChange={(e) => setNewDebt({ ...newDebt, totalInstallments: e.target.value })}
                            className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-axxy-primary"
                            placeholder="12"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Categoria *</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <select
                        value={newDebt.category || 'Outros'}
                        onChange={(e) => setNewDebt({ ...newDebt, category: e.target.value })}
                        className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-axxy-primary appearance-none"
                      >
                        <option value="Outros">Outros</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Data de Vencimento *</label>
                    <input
                      type="date"
                      value={newDebt.dueDate}
                      onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
                      className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-axxy-primary [color-scheme:dark]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1">Valor Restante *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={newDebt.remaining}
                          onChange={(e) => setNewDebt({ ...newDebt, remaining: formatCurrencyInput(e.target.value) })}
                          className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-axxy-primary"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Parcela Mensal *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={newDebt.monthly}
                          onChange={(e) => setNewDebt({ ...newDebt, monthly: formatCurrencyInput(e.target.value) })}
                          className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-axxy-primary"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Status</label>
                    <select
                      value={newDebt.status}
                      onChange={(e) => setNewDebt({ ...newDebt, status: e.target.value as any })}
                      className="w-full bg-[#1c2b24] border border-gray-600 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-axxy-primary"
                    >
                      <option value="Em dia">Em dia</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Atrasado">Atrasado</option>
                    </select>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl transition-colors shadow-lg"
                    >
                      {editingDebt ? 'Salvar Alterações' : 'Criar Dívida'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div >
        )
      }
    </div >
  );
};
