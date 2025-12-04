
import React, { useState, useEffect } from 'react';
import { Settings, X, Smartphone, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { Alert } from '../types';
import { apiService } from '../services/apiService';

export const BehavioralAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    apiService.getAlerts()
        .then(setAlerts)
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  const toggleAlert = async (alert: Alert) => {
      const updated = { ...alert, enabled: !alert.enabled };
      try {
          const res = await apiService.updateAlert(updated);
          setAlerts(alerts.map(a => a.id === alert.id ? res : a));
      } catch (e) {
          console.error(e);
      }
  };

  const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-axxy-primary' : 'bg-gray-600'}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${active ? 'left-7' : 'left-1'}`}></div>
    </button>
  );

  if (loading) return <div className="text-white">Carregando alertas...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl relative">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Alertas Comportamentais</h2>
        <button onClick={() => setShowConfigModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#15221c] text-gray-300 rounded-xl border border-white/10">
          <Settings size={18} /> <span>Configurar</span>
        </button>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
            <div key={alert.id} className="bg-axxy-card border border-axxy-border p-6 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${alert.colorClass || 'bg-gray-700 text-white'}`}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold">{alert.category}</h3>
                  <p className="text-sm text-gray-400">Orçamento: R$ {alert.budget}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-gray-400 text-sm">Alertar em {alert.threshold}%</span>
                <Toggle active={alert.enabled} onToggle={() => toggleAlert(alert)} />
              </div>
            </div>
        ))}
        {alerts.length === 0 && <div className="text-gray-500">Nenhum alerta configurado.</div>}
      </div>
      
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#15221c] border border-white/10 rounded-3xl p-6 w-full max-w-md">
                <div className="flex justify-between mb-4">
                    <h3 className="text-white font-bold">Canais</h3>
                    <button onClick={() => setShowConfigModal(false)}><X className="text-gray-400" /></button>
                </div>
                <p className="text-gray-500 mb-4">Configuração mockada. Implementar backend para settings.</p>
                <button onClick={() => setShowConfigModal(false)} className="w-full bg-axxy-primary text-axxy-bg font-bold py-2 rounded-xl">Fechar</button>
            </div>
        </div>
      )}
    </div>
  );
};
