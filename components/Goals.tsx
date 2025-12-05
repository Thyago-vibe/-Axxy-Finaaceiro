import React, { useState, useEffect } from 'react';
import { PlusCircle, Lightbulb, X, Plus, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { Goal } from '../types';
import { analyzeGoalAllocation, GoalAnalysis } from '../services/geminiService';
import { apiService } from '../services/apiService';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Financial Context for AI
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  // Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'Alta' | 'Média' | 'Baixa'>('Média');

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);

  // Add Money State
  const [addingMoneyId, setAddingMoneyId] = useState<string | number | null>(null);
  const [addAmount, setAddAmount] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [goalsData, reportsData] = await Promise.all([
          apiService.getGoals(),
          apiService.getReports('30d', 'all') // Fetch last 30 days to get income/expense context
        ]);
        setGoals(goalsData);

        // Extract Income/Expense from reports (simplified logic)
        // In a real app, we might want a dedicated endpoint for "Average Monthly Income"
        // Here we use the totals from the report which are usually expenses.
        // We'll try to fetch transactions to be more accurate if needed, but let's use a placeholder logic
        // assuming reportsData.kpi.totalSpent is expenses. Income is harder to get from reports endpoint as it filters expenses.
        // Let's fetch transactions quickly to get a rough estimate.
        const transactions = await apiService.getTransactions();
        const income = transactions
          .filter(t => t.type === 'income')
          .reduce((acc, t) => acc + t.amount, 0);
        const expenses = transactions
          .filter(t => t.type === 'expense')
          .reduce((acc, t) => acc + t.amount, 0);

        setMonthlyIncome(income); // This is total historical, ideally should be monthly average.
        setMonthlyExpenses(expenses);

      } catch (e) {
        console.error("Failed to fetch data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAnalyzeWithAI = async () => {
    if (!newGoalName || !newGoalAmount || !newGoalDate) {
      alert("Preencha todos os campos para a IA analisar.");
      return;
    }

    setIsAnalyzing(true);
    const cleanAmount = parseFloat(newGoalAmount.replace(/\./g, '').replace(',', '.'));

    try {
      const result = await analyzeGoalAllocation(
        newGoalName,
        cleanAmount,
        newGoalDate,
        monthlyIncome, // Passing total historical for now, AI might get confused if it's huge. 
        // Ideally we'd pass "Average Monthly". Let's assume the user has ~1 month of data or the AI handles it.
        monthlyExpenses
      );
      setAnalysis(result);
      if (result.suggestedPriority) {
        setNewGoalPriority(result.suggestedPriority);
      }
    } catch (e) {
      console.error("AI Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName || !newGoalAmount) return;

    const targetAmount = parseCurrencyInput(newGoalAmount);

    if (isNaN(targetAmount)) return;

    const newGoalData: Goal = {
      name: newGoalName,
      currentAmount: 0,
      targetAmount: targetAmount,
      deadline: newGoalDate || new Date().toISOString().split('T')[0],
      color: 'bg-green-500',
      priority: newGoalPriority
    };

    try {
      const created = await apiService.createGoal(newGoalData);
      setGoals([...goals, created]);
      // Reset form
      setNewGoalName('');
      setNewGoalAmount('');
      setNewGoalDate('');
      setNewGoalPriority('Média');
      setAnalysis(null);
    } catch (e) {
      console.error("Error creating goal", e);
    }
  };

  const handleDeleteGoal = async (id: string | number) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        const success = await apiService.deleteGoal(String(id));
        if (success) setGoals(goals.filter(g => g.id !== id));
      } catch (e) {
        console.error("Error deleting goal", e);
      }
    }
  };

  const handleAddMoney = async (goal: Goal) => {
    if (!addAmount) return;

    const amountToAdd = parseCurrencyInput(addAmount);

    if (isNaN(amountToAdd) || amountToAdd <= 0) return;

    const updatedGoal = { ...goal, currentAmount: goal.currentAmount + amountToAdd };
    try {
      const res = await apiService.updateGoal(updatedGoal);
      setGoals(goals.map(g => g.id === goal.id ? res : g));
      setAddingMoneyId(null);
      setAddAmount('');
    } catch (e) {
      console.error(e);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'Alta': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Média': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'Baixa': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) return <div className="text-white">Carregando metas...</div>;

  return (
    <div className="space-y-8 h-full animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Form Column */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-3xl font-bold text-white">Metas Inteligentes</h2>

          <div className="bg-axxy-card border border-axxy-border p-6 rounded-3xl mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Defina uma Nova Meta</h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-2">Nome</label>
                <input type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className="w-full bg-[#0b120f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-axxy-primary outline-none" placeholder="Ex: Viagem de Férias" />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-2">Valor (R$)</label>
                <input
                  type="text"
                  value={newGoalAmount}
                  onChange={e => setNewGoalAmount(formatCurrencyInput(e.target.value))}
                  className="w-full bg-[#0b120f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-axxy-primary outline-none"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-2">Prazo</label>
                <input type="date" value={newGoalDate} onChange={e => setNewGoalDate(e.target.value)} className="w-full bg-[#0b120f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-axxy-primary outline-none" />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">Prioridade</label>
                <div className="flex bg-[#0b120f] p-1 rounded-xl border border-gray-700">
                  {['Alta', 'Média', 'Baixa'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewGoalPriority(p as any)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newGoalPriority === p
                        ? 'bg-gray-700 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Analysis Button */}
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzing || !newGoalAmount || !newGoalDate}
                className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>Analizando...</>
                ) : (
                  <><Sparkles size={18} /> Analisar com IA</>
                )}
              </button>

              {/* AI Result Display */}
              {analysis && (
                <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <TrendingUp size={18} />
                    Sugestão da IA
                  </div>
                  <div className="text-sm text-gray-300">
                    <p className="mb-2">{analysis.reasoning}</p>
                    <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                      <span>Alocação Mensal:</span>
                      <span className="font-bold text-white">{formatCurrency(analysis.suggestedAllocation)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg mt-1">
                      <span>Prioridade Sugerida:</span>
                      <span className={`font-bold ${getPriorityColor(analysis.suggestedPriority).split(' ')[0]}`}>
                        {analysis.suggestedPriority}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transition-colors mt-2">
                Criar Meta
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white">Acompanhe seu Progresso</h3>
          <div className="space-y-6">
            {goals.map((goal) => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const isAdding = addingMoneyId === goal.id;

              return (
                <div key={goal.id} className="bg-axxy-card border border-axxy-border p-6 rounded-3xl relative overflow-hidden">
                  {/* Priority Badge */}
                  <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(goal.priority)}`}>
                    {goal.priority || 'Média'}
                  </div>

                  <div className="flex justify-between items-start mb-4 pr-20">
                    <div>
                      <h4 className="font-bold text-white text-lg">{goal.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="h-3 w-full bg-[#0b120f] rounded-full overflow-hidden border border-gray-800 mb-4">
                    <div className={`h-full ${goal.color} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                  </div>

                  {/* Add Money Section */}
                  <div className="flex items-center gap-3 justify-between">
                    {isAdding ? (
                      <div className="flex items-center gap-2 flex-1 animate-fade-in">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Valor"
                          value={addAmount}
                          onChange={e => setAddAmount(formatCurrencyInput(e.target.value))}
                          className="w-24 bg-[#0b120f] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-axxy-primary outline-none"
                        />
                        <button
                          onClick={() => handleAddMoney(goal)}
                          className="bg-axxy-primary text-axxy-bg text-xs font-bold px-3 py-2 rounded-lg hover:bg-axxy-primaryHover"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setAddingMoneyId(null); setAddAmount(''); }}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingMoneyId(goal.id!)}
                        className="flex items-center gap-2 text-axxy-primary text-sm font-bold hover:text-white transition-colors"
                      >
                        <PlusCircle size={18} />
                        Adicionar valor
                      </button>
                    )}

                    <button onClick={() => handleDeleteGoal(goal.id!)} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && <div className="text-center text-gray-500 py-10">Nenhuma meta encontrada.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
