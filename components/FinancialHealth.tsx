import React, { useState, useEffect } from 'react';
import { Plus, PenLine, Trash2, TrendingDown, TrendingUp, AlertCircle, Calendar, DollarSign, CreditCard, Wallet, Sparkles } from 'lucide-react';
import { Debt } from '../types';
import { apiService } from '../services/apiService';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';
import { XAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export const FinancialHealth: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [remaining, setRemaining] = useState('');
  const [monthly, setMonthly] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('Pendente');
  const [category, setCategory] = useState('Outros');

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  useEffect(() => {
    fetchDebts();
    fetchFinancialContext();
  }, []);

  const fetchFinancialContext = async () => {
    try {
      const transactions = await apiService.getTransactions();
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
      setMonthlyIncome(income);
      setMonthlyExpenses(expenses);
    } catch (e) {
      console.error("Failed to fetch financial context", e);
    }
  };

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    setIsAiModalOpen(true);
    try {
      // Dynamic import to avoid circular dependency issues if any
      const { analyzeDebtStrategy } = await import('../services/geminiService');
      const result = await analyzeDebtStrategy(
        debts.map(d => ({ name: d.name, remaining: d.remaining, monthly: d.monthly, category: d.category || 'Outros', status: d.status })),
        monthlyIncome,
        monthlyExpenses
      );
      setAnalysis(result);
    } catch (e) {
      console.error("AI Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchDebts = () => {
    setLoading(true);
    apiService.getDebts()
      .then(data => {
        console.log("Fetched debts:", data);
        setDebts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleOpenModal = (debt?: Debt) => {
    if (debt) {
      setEditingDebt(debt);
      setName(debt.name);
      setRemaining(debt.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setMonthly(debt.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setDueDate(debt.dueDate);
      setStatus(debt.status);
      setCategory(debt.category || 'Outros');
    } else {
      setEditingDebt(null);
      setName('');
      setRemaining('');
      setMonthly('');
      setDueDate('');
      setStatus('Pendente');
      setCategory('Outros');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !remaining) return;

    const debtData: Debt = {
      id: editingDebt?.id,
      name,
      remaining: parseCurrencyInput(remaining),
      monthly: parseCurrencyInput(monthly),
      dueDate,
      status: status as 'Em dia' | 'Pendente' | 'Atrasado',
      category,
      isUrgent: editingDebt ? editingDebt.isUrgent : false
    };

    try {
      if (editingDebt) {
        await apiService.updateDebt(debtData);
      } else {
        await apiService.createDebt(debtData);
      }
      fetchDebts();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar dívida:", error);
      alert("Erro ao salvar. Verifique o console.");
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Tem certeza que deseja excluir esta dívida?')) {
      try {
        await apiService.deleteDebt(id.toString());
        fetchDebts();
      } catch (error) {
        console.error("Erro ao deletar dívida:", error);
        alert("Erro ao deletar dívida. Verifique o console.");
      }
    }
  };

  // Calculations
  const totalDebt = debts.reduce((acc, d) => acc + d.remaining, 0);
  const totalMonthlyPayment = debts.reduce((acc, d) => acc + d.monthly, 0);

  // Calculate Composition by Category
  const compositionMap = debts.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + d.remaining;
    return acc;
  }, {} as Record<string, number>);

  const compositionData = Object.entries(compositionMap).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#13ec5b', '#92c9a4', '#326744', '#1e332a'];

  if (loading) return <div className="text-white">Carregando saúde financeira...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-white">Saúde Financeira</h1>
          <p className="text-base font-normal text-[#92c9a4] mt-1">Acompanhe e gerencie suas dívidas para uma vida financeira mais saudável.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAnalyzeWithAI}
            className="flex h-12 items-center justify-center overflow-hidden rounded-xl bg-purple-600/20 border border-purple-500/50 px-6 text-sm font-bold text-purple-300 transition-transform hover:scale-105 hover:bg-purple-600/30"
          >
            <Sparkles size={18} className="mr-2" /> Consultor IA
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#13ec5b] px-6 text-sm font-bold text-[#102216] transition-transform hover:scale-105 shadow-lg shadow-green-900/20"
          >
            Adicionar Nova Dívida
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-2 rounded-xl border border-[#326744] bg-[#112217] p-6">
          <p className="text-base font-medium text-white">Dívida Total</p>
          <p className="text-2xl font-bold text-white">R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[#326744] bg-[#112217] p-6">
          <p className="text-base font-medium text-white">Pagamentos Mensais</p>
          <p className="text-2xl font-bold text-white">R$ {totalMonthlyPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[#326744] bg-[#112217] p-6">
          <p className="text-base font-medium text-white">Próximo Vencimento</p>
          <p className="text-2xl font-bold text-white">
            {debts.length > 0
              ? new Date(Math.min(...debts.map(d => new Date(d.dueDate).getTime()))).toLocaleDateString('pt-BR')
              : '-'}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[#326744] bg-[#112217] p-6">
          <p className="text-base font-medium text-white">Score de Crédito</p>
          <p className="text-2xl font-bold text-white">-</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#326744] bg-[#112217] p-6">
          <p className="text-base font-medium text-white">Evolução da Dívida</p>
          <div className="flex items-end gap-2 mb-4">
            <p className="text-3xl font-bold text-white">R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="h-[200px] w-full flex items-center justify-center border border-dashed border-[#326744] rounded-lg">
            <p className="text-[#92c9a4] text-sm">Histórico indisponível</p>
          </div>
        </div>

        {/* Composition Chart */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#326744] bg-[#112217] p-6">
          <p className="text-base font-medium text-white">Composição das Dívidas</p>
          <div className="flex items-end gap-2 mb-4">
            <p className="text-3xl font-bold text-white">Por Categoria</p>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compositionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#326744" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#92c9a4', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#112217', borderColor: '#326744', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Debts Table */}
      <div className="rounded-xl border border-[#326744] bg-[#112217] overflow-hidden">
        <h2 className="px-6 py-5 text-xl font-bold text-white border-b border-[#326744]">Minhas Dívidas Ativas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1a3323] text-[#92c9a4] uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Nome da Dívida</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Valor Restante</th>
                <th className="px-6 py-4">Parcela Mensal</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#326744]/50">
              {debts.map((debt, idx) => (
                <tr key={debt.id || idx} className="hover:bg-[#1a3323]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{debt.name}</td>
                  <td className="px-6 py-4 text-gray-300">{debt.category}</td>
                  <td className="px-6 py-4 text-white font-bold">R$ {debt.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-gray-300">R$ {debt.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-gray-300">{new Date(debt.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${debt.status === 'Em dia' ? 'bg-green-500/20 text-green-400' :
                        debt.status === 'Pendente' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'}`}>
                      {debt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(debt)}
                        className="p-2 text-gray-400 hover:text-[#13ec5b] hover:bg-[#13ec5b]/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <PenLine size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (debt.id) handleDelete(debt.id);
                          else alert("Erro: ID da dívida não encontrado.");
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {debts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma dívida cadastrada. Comece adicionando uma nova dívida.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Advisor Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center w-full h-screen bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#112217] border border-purple-500/30 rounded-3xl w-full max-w-[600px] shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-purple-500/20 bg-purple-900/10">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" /> Consultor de Dívidas IA
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  <p className="text-purple-300 animate-pulse">Analisando suas dívidas e calculando a melhor estratégia...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
                    <h4 className="text-lg font-bold text-purple-300 mb-2">{analysis.strategyName}</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">{analysis.description}</p>
                  </div>

                  <div>
                    <h5 className="text-white font-bold mb-3 flex items-center gap-2">
                      <TrendingUp size={18} className="text-[#13ec5b]" /> Ordem de Pagamento Recomendada
                    </h5>
                    <div className="space-y-2">
                      {analysis.recommendedOrder.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-[#0b160f] p-3 rounded-lg border border-[#326744]">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#13ec5b] text-[#102216] font-bold text-xs">
                            {idx + 1}
                          </span>
                          <span className="text-white font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-white font-bold mb-3 flex items-center gap-2">
                      <AlertCircle size={18} className="text-yellow-400" /> Dicas de Negociação
                    </h5>
                    <ul className="space-y-2">
                      {analysis.negotiationTips.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-yellow-400 mt-1">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Não foi possível gerar a análise. Tente novamente.
                </div>
              )}

              <button
                onClick={() => setIsAiModalOpen(false)}
                className="w-full py-3 bg-[#326744]/50 hover:bg-[#326744] text-white font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center w-full h-screen bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#112217] border border-[#326744] rounded-3xl w-full max-w-[500px] shadow-2xl animate-fade-in relative">
            <div className="p-6 border-b border-[#326744]">
              <h3 className="text-2xl font-bold text-white">
                {editingDebt ? 'Editar Dívida' : 'Nova Dívida'}
              </h3>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#92c9a4] mb-1.5">Nome da Dívida</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Financiamento Carro"
                  className="w-full bg-[#0b160f] border border-[#326744] text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-[#13ec5b] outline-none transition-colors placeholder-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#92c9a4] mb-1.5">Valor Restante</label>
                  <input
                    type="text"
                    value={remaining}
                    onChange={(e) => setRemaining(formatCurrencyInput(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-[#0b160f] border border-[#326744] text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-[#13ec5b] outline-none transition-colors placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#92c9a4] mb-1.5">Parcela Mensal</label>
                  <input
                    type="text"
                    value={monthly}
                    onChange={(e) => setMonthly(formatCurrencyInput(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-[#0b160f] border border-[#326744] text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-[#13ec5b] outline-none transition-colors placeholder-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#92c9a4] mb-1.5">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0b160f] border border-[#326744] text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-[#13ec5b] outline-none transition-colors appearance-none"
                  >
                    <option value="Outros">Outros</option>
                    <option value="Cartão">Cartão de Crédito</option>
                    <option value="Financiamento">Financiamento</option>
                    <option value="Empréstimo">Empréstimo</option>
                    <option value="Pessoal">Dívida Pessoal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#92c9a4] mb-1.5">Vencimento</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#0b160f] border border-[#326744] text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-[#13ec5b] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#92c9a4] mb-1.5">Status</label>
                <div className="flex gap-2">
                  {['Em dia', 'Pendente', 'Atrasado'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${status === s
                        ? 'bg-[#13ec5b]/20 border-[#13ec5b] text-[#13ec5b]'
                        : 'bg-[#0b160f] border-[#326744] text-gray-400 hover:text-white'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#13ec5b] hover:bg-[#13ec5b]/90 text-[#102216] font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-900/20"
                >
                  {editingDebt ? 'Salvar Alterações' : 'Adicionar Dívida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
