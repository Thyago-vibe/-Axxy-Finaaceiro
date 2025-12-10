
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Home, Car, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Wallet, Building, Landmark, CreditCard, MoreHorizontal, Lightbulb, Target, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../services/apiService';
import { NetWorthDashboardData, Asset, Liability } from '../types';

export const NetWorth: React.FC = () => {
    const [data, setData] = useState<NetWorthDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isAssetModalOpen, setAssetModalOpen] = useState(false);
    const [isLiabilityModalOpen, setLiabilityModalOpen] = useState(false);
    const [isGoalModalOpen, setGoalModalOpen] = useState(false);

    // Form States
    const [itemName, setItemName] = useState('');
    const [itemValue, setItemValue] = useState('');
    const [itemType, setItemType] = useState('');
    const [itemIcon, setItemIcon] = useState('other');

    // Goal Form States
    const [goalName, setGoalName] = useState('');
    const [goalTarget, setGoalTarget] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');

    // AI Insight State
    const [aiInsight, setAiInsight] = useState<{ insight_title: string; insight_message: string; action_text: string; priority: string; category: string } | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);

    // Active Goal State
    const [activeGoal, setActiveGoal] = useState<{ goal: any; progress: number; remaining: number } | null>(null);

    const fetchData = () => {
        setLoading(true);
        apiService.getNetWorth()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const fetchAIInsight = () => {
        setLoadingInsight(true);
        apiService.getNetWorthAIInsight()
            .then(res => {
                if (res.success) {
                    setAiInsight(res.insight);
                }
            })
            .catch(console.error)
            .finally(() => setLoadingInsight(false));
    };

    const fetchActiveGoal = () => {
        apiService.getActiveNetWorthGoal()
            .then(setActiveGoal)
            .catch(console.error);
    };

    useEffect(() => {
        fetchData();
        fetchAIInsight();
        fetchActiveGoal();
    }, []);

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || !itemValue) return;

        await apiService.createAsset({
            id: '',
            name: itemName,
            value: parseFloat(itemValue),
            type: itemType || 'Outros',
            iconType: itemIcon as any
        });
        setAssetModalOpen(false);
        resetForm();
        fetchData();
    };

    const handleAddLiability = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || !itemValue) return;

        await apiService.createLiability({
            id: '',
            name: itemName,
            value: parseFloat(itemValue),
            type: itemType || 'Outros',
            iconType: itemIcon as any
        });
        setLiabilityModalOpen(false);
        resetForm();
        fetchData();
    };

    const handleDeleteAsset = async (id: string) => {
        if (confirm("Remover este ativo?")) {
            await apiService.deleteAsset(id);
            fetchData();
        }
    }

    const handleDeleteLiability = async (id: string) => {
        if (confirm("Remover este passivo?")) {
            await apiService.deleteLiability(id);
            fetchData();
        }
    }

    const resetForm = () => {
        setItemName('');
        setItemValue('');
        setItemType('');
        setItemIcon('other');
    }

    const resetGoalForm = () => {
        setGoalName('');
        setGoalTarget('');
        setGoalDeadline('');
    }

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalName || !goalTarget) return;

        await apiService.createNetWorthGoal({
            name: goalName,
            target_amount: parseFloat(goalTarget),
            deadline: goalDeadline || undefined,
            is_active: true
        });
        setGoalModalOpen(false);
        resetGoalForm();
        fetchActiveGoal();
    };

    const getIcon = (type: string, isAsset: boolean) => {
        if (isAsset) {
            switch (type) {
                case 'home': return <Home size={20} />;
                case 'car': return <Car size={20} />;
                case 'investment': return <TrendingUp size={20} />;
                default: return <Landmark size={20} />;
            }
        } else {
            switch (type) {
                case 'loan': return <Landmark size={20} />;
                case 'card': return <CreditCard size={20} />;
                case 'car': return <Car size={20} />;
                default: return <CreditCard size={20} />;
            }
        }
    }

    if (loading) return <div className="text-white text-center py-20">Carregando patrimônio...</div>;
    if (!data) return <div className="text-gray-500 text-center py-20">Sem dados.</div>;

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Patrimônio Líquido</h2>
                <p className="text-gray-400">Acompanhe a evolução dos seus ativos e passivos.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Patrimônio Líquido</p>
                    <h3 className="text-3xl font-bold text-white mb-1">{formatCurrency(data.netWorth)}</h3>
                    <span className="text-green-500 text-sm font-medium">+2.5%</span>
                </div>
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Total de Ativos</p>
                    <h3 className="text-3xl font-bold text-white mb-1">{formatCurrency(data.totalAssets)}</h3>
                    <span className="text-green-500 text-sm font-medium">+1.8%</span>
                </div>
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Total de Passivos</p>
                    <h3 className="text-3xl font-bold text-white mb-1">{formatCurrency(data.totalLiabilities)}</h3>
                    <span className="text-orange-500 text-sm font-medium">+0.8%</span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution Chart */}
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                    <h3 className="text-white text-lg font-bold mb-1">Evolução do Patrimônio</h3>
                    <h4 className="text-2xl font-bold text-white mb-6">{formatCurrency(data.netWorth)}</h4>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.history}>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0b120f', border: '1px solid #1e332a', borderRadius: '8px', color: '#fff' }} />
                                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Composition Chart */}
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 flex flex-col">
                    <h3 className="text-white text-lg font-bold mb-6">Composição dos Ativos</h3>
                    <div className="flex flex-col md:flex-row items-center gap-8 flex-1">
                        <div className="w-48 h-48 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.composition} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {data.composition.map((entry, index) => (
                                            <Cell key={`cell - ${index} `} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-white font-bold">R$ {(data.totalAssets / 1000).toFixed(0)}k</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                            {data.composition.map((item) => (
                                <div key={item.name} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-gray-300">{item.name}</span>
                                    </div>
                                    <span className="text-gray-500 font-medium">
                                        {((item.value / data.totalAssets) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Assets & Liabilities Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Meus Ativos</h3>
                        <button
                            onClick={() => { resetForm(); setAssetModalOpen(true); }}
                            className="bg-[#1e332a] hover:bg-green-900/40 text-green-500 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Adicionar Ativo
                        </button>
                    </div>
                    {data.assets.map(asset => (
                        <div key={asset.id} className="bg-[#15221c] border border-[#1e332a] p-4 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#0b120f] border border-white/5 flex items-center justify-center text-green-500">
                                    {getIcon(asset.iconType, true)}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">{asset.name}</h4>
                                    <p className="text-xs text-gray-500">{asset.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-white font-bold">{formatCurrency(asset.value)}</span>
                                <button onClick={() => handleDeleteAsset(asset.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {data.assets.length === 0 && <div className="text-gray-500 text-center py-4">Nenhum ativo cadastrado.</div>}
                </div>

                {/* Liabilities */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Meus Passivos</h3>
                        <button
                            onClick={() => { resetForm(); setLiabilityModalOpen(true); }}
                            className="bg-[#1e332a] hover:bg-green-900/40 text-green-500 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Adicionar Passivo
                        </button>
                    </div>
                    {data.liabilities.map(liab => (
                        <div key={liab.id} className="bg-[#15221c] border border-[#1e332a] p-4 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#0b120f] border border-white/5 flex items-center justify-center text-red-400">
                                    {getIcon(liab.iconType, false)}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">{liab.name}</h4>
                                    <p className="text-xs text-gray-500">{liab.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-white font-bold">{formatCurrency(liab.value)}</span>
                                <button onClick={() => handleDeleteLiability(liab.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {data.liabilities.length === 0 && <div className="text-gray-500 text-center py-4">Nenhum passivo cadastrado.</div>}
                </div>
            </div>

            {/* Bottom Insight Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Insight da IA */}
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 hover:border-green-500/30 transition-colors cursor-pointer" onClick={fetchAIInsight}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-[#0b120f]">
                            {loadingInsight ? <Loader2 size={18} className="animate-spin" /> : <Lightbulb size={18} />}
                        </div>
                        <h4 className="text-white font-bold">{aiInsight?.insight_title || 'Insight da IA'}</h4>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                        {loadingInsight
                            ? 'Analisando seu patrimônio...'
                            : aiInsight?.insight_message || 'Clique para gerar um insight personalizado sobre seu patrimônio.'}
                    </p>
                    <button
                        onClick={(e) => { e.stopPropagation(); fetchAIInsight(); }}
                        className="text-green-500 text-sm font-bold hover:underline"
                        disabled={loadingInsight}
                    >
                        {loadingInsight ? 'Carregando...' : (aiInsight?.action_text || 'Gerar insight')}
                    </button>
                </div>

                {/* Card 2: Meta de Patrimônio */}
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 hover:border-green-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-[#1e332a] text-green-500 flex items-center justify-center border border-green-500/30">
                            <Target size={18} />
                        </div>
                        <h4 className="text-white font-bold">
                            {activeGoal?.goal?.name || 'Meta de Patrimônio'}
                        </h4>
                    </div>
                    {activeGoal ? (
                        <>
                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                <span>Progresso</span>
                                <span>
                                    {formatCurrency(activeGoal.goal.current_amount)} / {formatCurrency(activeGoal.goal.target_amount)}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-[#0b120f] rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, activeGoal.progress)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    {activeGoal.progress.toFixed(1)}% concluído
                                </span>
                                <button
                                    onClick={() => setGoalModalOpen(true)}
                                    className="text-green-500 text-sm font-bold hover:underline"
                                >
                                    Editar meta
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500 text-sm">
                            Nenhuma meta definida. Crie uma meta para acompanhar seu progresso!
                        </p>
                    )}
                </div>

                {/* Card 3: Definir Nova Meta */}
                <div
                    onClick={() => { resetGoalForm(); setGoalModalOpen(true); }}
                    className="bg-green-900/20 border border-green-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center border-dashed cursor-pointer hover:bg-green-900/30 hover:border-green-500/50 transition-all"
                >
                    <div className="w-10 h-10 rounded-full bg-green-500 text-[#0b120f] flex items-center justify-center mb-3">
                        <Plus size={24} />
                    </div>
                    <h4 className="text-white font-bold mb-1">Definir Nova Meta</h4>
                    <p className="text-green-200/60 text-xs mb-0">Crie uma nova meta de acumulação de ativos.</p>
                </div>
            </div>

            {/* Modal Asset */}
            {isAssetModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative">
                        <button
                            onClick={() => setAssetModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4">Adicionar Ativo</h3>
                        <form onSubmit={handleAddAsset} className="space-y-4">
                            <input placeholder="Nome (ex: Casa de Praia)" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3" value={itemName} onChange={e => setItemName(e.target.value)} />
                            <input type="number" placeholder="Valor (R$)" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3" value={itemValue} onChange={e => setItemValue(e.target.value)} />
                            <input placeholder="Tipo (ex: Imóvel)" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3" value={itemType} onChange={e => setItemType(e.target.value)} />

                            <div>
                                <label className="text-gray-400 text-xs mb-2 block">Ícone</label>
                                <div className="flex gap-2">
                                    {['home', 'car', 'investment', 'other'].map(ic => (
                                        <button key={ic} type="button" onClick={() => setItemIcon(ic)} className={`p-2 rounded-lg border ${itemIcon === ic ? 'bg-green-500 text-black border-green-500' : 'bg-[#0b120f] border-gray-700 text-gray-400'}`}>
                                            {getIcon(ic, true)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setAssetModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white">Cancelar</button>
                                <button type="submit" className="flex-1 bg-axxy-primary text-black font-bold py-3 rounded-xl">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Liability */}
            {isLiabilityModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative">
                        <button
                            onClick={() => setLiabilityModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4">Adicionar Passivo</h3>
                        <form onSubmit={handleAddLiability} className="space-y-4">
                            <input placeholder="Nome (ex: Empréstimo)" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3" value={itemName} onChange={e => setItemName(e.target.value)} />
                            <input type="number" placeholder="Valor (R$)" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3" value={itemValue} onChange={e => setItemValue(e.target.value)} />
                            <input placeholder="Tipo (ex: Financiamento)" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3" value={itemType} onChange={e => setItemType(e.target.value)} />

                            <div>
                                <label className="text-gray-400 text-xs mb-2 block">Ícone</label>
                                <div className="flex gap-2">
                                    {['loan', 'card', 'car', 'other'].map(ic => (
                                        <button key={ic} type="button" onClick={() => setItemIcon(ic)} className={`p-2 rounded-lg border ${itemIcon === ic ? 'bg-red-500 text-white border-red-500' : 'bg-[#0b120f] border-gray-700 text-gray-400'}`}>
                                            {getIcon(ic, false)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setLiabilityModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white">Cancelar</button>
                                <button type="submit" className="flex-1 bg-axxy-primary text-black font-bold py-3 rounded-xl">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Goal */}
            {isGoalModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative">
                        <button
                            onClick={() => setGoalModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-2">Nova Meta de Patrimônio</h3>
                        <p className="text-gray-400 text-sm mb-6">Defina um objetivo para acumulação de patrimônio.</p>

                        <form onSubmit={handleCreateGoal} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-2 block">Nome da Meta</label>
                                <input
                                    placeholder="Ex: Primeiro Milhão, Aposentadoria"
                                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3"
                                    value={goalName}
                                    onChange={e => setGoalName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs mb-2 block">Valor Alvo (R$)</label>
                                <input
                                    type="number"
                                    placeholder="1000000"
                                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3"
                                    value={goalTarget}
                                    onChange={e => setGoalTarget(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs mb-2 block">Prazo (opcional)</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl p-3"
                                    value={goalDeadline}
                                    onChange={e => setGoalDeadline(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setGoalModalOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white">Cancelar</button>
                                <button type="submit" className="flex-1 bg-axxy-primary text-black font-bold py-3 rounded-xl">Criar Meta</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
