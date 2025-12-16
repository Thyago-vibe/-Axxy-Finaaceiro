
import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Settings, AlertCircle, Plus, Trash2, Bell, DollarSign, Percent } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { Alert } from '../types';
import { apiService } from '../services/apiService';

const CATEGORY_OPTIONS = [
  { value: 'Alimentação', color: 'bg-orange-500/20 text-orange-400', icon: '🍔' },
  { value: 'Transporte', color: 'bg-blue-500/20 text-blue-400', icon: '🚗' },
  { value: 'Lazer', color: 'bg-purple-500/20 text-purple-400', icon: '🎮' },
  { value: 'Saúde', color: 'bg-red-500/20 text-red-400', icon: '💊' },
  { value: 'Educação', color: 'bg-cyan-500/20 text-cyan-400', icon: '📚' },
  { value: 'Compras', color: 'bg-pink-500/20 text-pink-400', icon: '🛍️' },
  { value: 'Moradia', color: 'bg-green-500/20 text-green-400', icon: '🏠' },
  { value: 'Assinaturas', color: 'bg-indigo-500/20 text-indigo-400', icon: '📺' },
  { value: 'Outros', color: 'bg-gray-500/20 text-gray-400', icon: '📋' },
];

export const BehavioralAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newCategory, setNewCategory] = useState('Alimentação');
  const [newBudget, setNewBudget] = useState('');
  const [newThreshold, setNewThreshold] = useState('80');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await apiService.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (alert: Alert) => {
    const updated = { ...alert, enabled: !alert.enabled };
    try {
      const res = await apiService.updateAlert(updated);
      setAlerts(alerts.map(a => a.id === alert.id ? res : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAlert = async () => {
    if (!newBudget || parseFloat(newBudget) <= 0) {
      return;
    }

    setSaving(true);
    try {
      const categoryOption = CATEGORY_OPTIONS.find(c => c.value === newCategory);
      const newAlert: Omit<Alert, 'id'> = {
        category: newCategory,
        budget: parseFloat(newBudget),
        threshold: parseInt(newThreshold),
        enabled: true,
        iconName: 'alert-circle',
        colorClass: categoryOption?.color || 'bg-gray-500/20 text-gray-400'
      };

      const res = await fetch('http://localhost:8000/api/alerts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert)
      });

      if (res.ok) {
        const created = await res.json();
        setAlerts([...alerts, created]);
        setShowAddModal(false);
        setNewCategory('Alimentação');
        setNewBudget('');
        setNewThreshold('80');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlert = async (alertId: number | string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/alerts/${alertId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-axxy-primary' : 'bg-gray-600'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${active ? 'left-7' : 'left-1'}`}></div>
    </button>
  );

  const getCategoryInfo = (category: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
  };

  if (loading) return <div className="text-white">Carregando alertas...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto relative">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Alertas Comportamentais</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-axxy-primary text-axxy-bg rounded-xl font-bold hover:bg-axxy-primary/90 transition-colors"
          >
            <Plus size={18} /> <span>Novo Alerta</span>
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#15221c] text-gray-300 rounded-xl border border-white/10 hover:bg-[#1a2a22] transition-colors"
          >
            <Settings size={18} /> <span>Configurar</span>
          </button>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {alerts.map((alert) => {
          const categoryInfo = getCategoryInfo(alert.category);
          return (
            <div key={alert.id} className="bg-axxy-card border border-axxy-border p-6 rounded-3xl flex items-center justify-between group hover:border-axxy-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${categoryInfo.color}`}>
                  {categoryInfo.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold">{alert.category}</h3>
                  <p className="text-sm text-gray-400">Orçamento: {formatCurrency(alert.budget)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-gray-400 text-sm">Alertar em</span>
                  <p className="text-axxy-primary font-bold">{alert.threshold}%</p>
                </div>
                <Toggle active={alert.enabled} onToggle={() => toggleAlert(alert)} />
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <div className="bg-axxy-card border border-axxy-border border-dashed p-12 rounded-3xl flex flex-col items-center justify-center text-gray-500">
            <Bell size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum alerta configurado</p>
            <p className="text-sm mt-1">Clique em "Novo Alerta" para começar</p>
          </div>
        )}
      </div>

      {/* Modal Adicionar Alerta */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#15221c] border border-white/10 rounded-3xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between mb-6">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <Bell className="text-axxy-primary" size={24} />
                Novo Alerta
              </h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="text-gray-400 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Categoria */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-axxy-bg border border-white/10 rounded-xl p-3 text-white focus:border-axxy-primary outline-none"
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.value}</option>
                  ))}
                </select>
              </div>

              {/* Orçamento */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                  <DollarSign size={14} /> Orçamento Mensal (R$)
                </label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  placeholder="Ex: 500.00"
                  className="w-full bg-axxy-bg border border-white/10 rounded-xl p-3 text-white focus:border-axxy-primary outline-none"
                />
              </div>

              {/* Threshold */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                  <Percent size={14} /> Alertar quando atingir (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="flex-1 accent-axxy-primary"
                  />
                  <span className="text-axxy-primary font-bold w-12 text-center">{newThreshold}%</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Você será alertado quando gastar {newThreshold}% de R$ {newBudget || '0'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-700 text-white font-bold py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAlert}
                disabled={saving || !newBudget}
                className="flex-1 bg-axxy-primary text-axxy-bg font-bold py-3 rounded-xl hover:bg-axxy-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Criar Alerta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurações */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#15221c] border border-white/10 rounded-3xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between mb-6">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <Settings className="text-axxy-primary" size={24} />
                Configurações de Alertas
              </h3>
              <button onClick={() => setShowConfigModal(false)}>
                <X className="text-gray-400 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-axxy-bg/50 rounded-xl p-4 border border-white/5">
                <h4 className="text-white font-medium mb-2">📊 Alertas Ativos</h4>
                <p className="text-axxy-primary text-2xl font-bold">{alerts.filter(a => a.enabled).length} / {alerts.length}</p>
              </div>

              <div className="bg-axxy-bg/50 rounded-xl p-4 border border-white/5">
                <h4 className="text-white font-medium mb-2">💰 Total Monitorado</h4>
                <p className="text-axxy-primary text-2xl font-bold">
                  {formatCurrency(alerts.reduce((sum, a) => sum + a.budget, 0))}
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <h4 className="text-yellow-400 font-medium mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} /> Em breve
                </h4>
                <p className="text-gray-400 text-sm">
                  Notificações por email e push estarão disponíveis em breve.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full bg-axxy-primary text-axxy-bg font-bold py-3 rounded-xl mt-6 hover:bg-axxy-primary/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
