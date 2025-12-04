
import React, { useState, useEffect } from 'react';
import { PlusCircle, Lightbulb, X } from 'lucide-react';
import { Goal } from '../types';
import { getSmartGoalAdvice } from '../services/geminiService';
import { apiService } from '../services/apiService';

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState<{[key: string]: string}>({});
  
  // Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');

  useEffect(() => {
    const fetchGoals = async () => {
       setLoading(true);
       try {
           const data = await apiService.getGoals();
           setGoals(data);
       } catch(e) {
           console.error("Failed to fetch goals", e);
       } finally {
           setLoading(false);
       }
    };
    fetchGoals();
  }, []);

  const handleGetAdvice = async (goal: Goal) => {
    if (advice[goal.id]) return;
    const text = await getSmartGoalAdvice(goal.name, goal.targetAmount);
    setAdvice(prev => ({...prev, [goal.id]: text}));
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName || !newGoalAmount) return;

    const newGoalData: Goal = {
      id: '', // Backend assigns ID
      name: newGoalName,
      currentAmount: 0,
      targetAmount: parseFloat(newGoalAmount),
      deadline: newGoalDate,
      color: 'bg-green-500'
    };

    try {
        const created = await apiService.createGoal(newGoalData);
        setGoals([...goals, created]);
        setNewGoalName('');
        setNewGoalAmount('');
        setNewGoalDate('');
    } catch (e) {
        console.error("Error creating goal", e);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
        try {
            const success = await apiService.deleteGoal(id);
            if (success) setGoals(goals.filter(g => g.id !== id));
        } catch (e) {
            console.error("Error deleting goal", e);
        }
    }
  };

  const handleUpdateProgress = async (goal: Goal) => {
      // Logic to simulate adding funds or connecting to transaction in real app
      // For now, we manually increment via API
      const updatedGoal = { ...goal, currentAmount: goal.currentAmount + 100 };
      try {
          const res = await apiService.updateGoal(updatedGoal);
          setGoals(goals.map(g => g.id === goal.id ? res : g));
      } catch (e) {
          console.error(e);
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
                <input type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className="w-full bg-[#0b120f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-axxy-primary outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-2">Valor (R$)</label>
                <input type="number" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className="w-full bg-[#0b120f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-axxy-primary outline-none" />
              </div>
              <button type="submit" className="w-full bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transition-colors mt-2">Criar Meta</button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white">Acompanhe seu Progresso</h3>
          <div className="space-y-6">
            {goals.map((goal) => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              return (
                <div key={goal.id} className="bg-axxy-card border border-axxy-border p-6 rounded-3xl">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white text-lg">{goal.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">R$ {goal.currentAmount} / R$ {goal.targetAmount}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleUpdateProgress(goal)} className="p-2 text-axxy-primary text-xs font-bold">+ R$100</button>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="text-gray-500 hover:text-red-400 p-1"><X size={18} /></button>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-[#0b120f] rounded-full overflow-hidden border border-gray-800 mb-2">
                    <div className={`h-full ${goal.color} rounded-full`} style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="bg-[#0f221a] border border-green-500/20 p-4 rounded-xl flex items-start gap-3 mt-4">
                    <Lightbulb size={16} className="text-green-500 mt-1" />
                    <div className="flex-1">
                       {!advice[goal.id] ? (
                         <div onClick={() => handleGetAdvice(goal)} className="text-sm text-green-400 cursor-pointer hover:underline">Obter dica da IA...</div>
                       ) : (
                         <p className="text-sm text-gray-300">{advice[goal.id]}</p>
                       )}
                    </div>
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
