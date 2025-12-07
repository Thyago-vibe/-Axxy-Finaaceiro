
import React, { useState, useEffect } from 'react';
import { Plus, Home, Car, TrendingUp, CreditCard, Landmark, MoreHorizontal, Lightbulb, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../services/apiService';
import { NetWorthDashboardData, Asset, Liability } from '../types';

export const NetWorth: React.FC = () => {
    const [data, setData] = useState<NetWorthDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [isAssetModalOpen, setAssetModalOpen] = useState(false);
    const [isLiabilityModalOpen, setLiabilityModalOpen] = useState(false);
    
    // Form States
    const [itemName, setItemName] = useState('');
    const [itemValue, setItemValue] = useState('');
    const [itemType, setItemType] = useState('');
    const [itemIcon, setItemIcon] = useState('other');

    const fetchData = () => {
        setLoading(true);
        apiService.getNetWorth()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!itemName || !itemValue) return;
        
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
        if(!itemName || !itemValue) return;
        
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
        if(confirm("Remover este ativo?")) {
            await apiService.deleteAsset(id);
            fetchData();
        }
    }

    const handleDeleteLiability = async (id: string) => {
        if(confirm("Remover este passivo?")) {
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

    const getIcon = (type: string, isAsset: boolean) => {
        if (isAsset) {
            switch(type) {
                case 'home': return <Home size={20} />;
                case 'car': return <Car size={20} />;
                case 'investment': return <TrendingUp size={20} />;
                default: return <Landmark size={20} />;
            }
        } else {
            switch(type) {
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
                    <h3 className="text-3xl font-bold text-white mb-1">R$ {data.netWorth.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    <span className="text-green-500 text-sm font-medium">+2.5%</span>
                </div>
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Total de Ativos</p>
                    <h3 className="text-3xl font-bold text-white mb-1">R$ {data.totalAssets.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    <span className="text-green-500 text-sm font-medium">+1.8%</span>
                </div>
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Total de Passivos</p>
                    <h3 className="text-3xl font-bold text-white mb-1">R$ {data.totalLiabilities.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    <span className="text-orange-500 text-sm font-medium">+0.8%</span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution Chart */}
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                    <h3 className="text-white text-lg font-bold mb-1">Evolução do Patrimônio</h3>
                    <h4 className="text-2xl font-bold text-white mb-6">R$ {data.netWorth.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</h4>
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={data.history}>
                                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                                 <Tooltip contentStyle={{backgroundColor: '#0b120f', border: '1px solid #1e332a', borderRadius: '8px', color: '#fff'}} />
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
                                             <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                         ))}
                                     </Pie>
                                 </PieChart>
                             </ResponsiveContainer>
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                 <span className="text-white font-bold">R$ {(data.totalAssets/1000).toFixed(0)}k</span>
                             </div>
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                             {data.composition.map((item) => (
                                 <div key={item.name} className="flex justify-between items-center text-sm">
                                     <div className="flex items-center gap-2">
                                         <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
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
                                <span className="text-white font-bold">R$ {asset.value.toLocaleString('pt-BR')}</span>
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
                                <span className="text-white font-bold">R$ {liab.value.toLocaleString('pt-BR')}</span>
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
                 <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                     <div className="flex items-center gap-3 mb-4">
                         <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-[#0b120f]">
                             <Lightbulb size={18} />
                         </div>
                         <h4 className="text-white font-bold">Insight da IA</h4>
                     </div>
                     <p className="text-gray-400 text-sm mb-4">Baseado na sua composição de ativos, considere diversificar seus investimentos em fundos de renda fixa.</p>
                     <button className="text-green-500 text-sm font-bold hover:underline">Explorar opções</button>
                 </div>

                 <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6">
                     <div className="flex items-center gap-3 mb-4">
                         <div className="w-8 h-8 rounded-full bg-[#1e332a] text-green-500 flex items-center justify-center border border-green-500/30">
                             <Target size={18} />
                         </div>
                         <h4 className="text-white font-bold">Meta de Patrimônio</h4>
                     </div>
                     <div className="flex justify-between text-xs text-gray-400 mb-2">
                         <span>Progresso</span>
                         <span>R$ 450k / R$ 1M</span>
                     </div>
                     <div className="h-2 w-full bg-[#0b120f] rounded-full overflow-hidden mb-4">
                         <div className="h-full bg-green-500 w-[45%] rounded-full"></div>
                     </div>
                     <button className="text-green-500 text-sm font-bold hover:underline">Ver detalhes da meta</button>
                 </div>

                 <div className="bg-green-900/20 border border-green-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center border-dashed">
                     <div className="w-10 h-10 rounded-full bg-green-500 text-[#0b120f] flex items-center justify-center mb-3">
                         <Plus size={24} />
                     </div>
                     <h4 className="text-white font-bold mb-1">Definir Nova Meta</h4>
                     <p className="text-green-200/60 text-xs mb-0">Crie uma nova meta de acumulação de ativos.</p>
                 </div>
            </div>

            {/* Modal Asset */}
            {isAssetModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-8 w-full max-w-md">
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
                                 <button type="submit" className="flex-1 bg-green-500 text-black font-bold rounded-xl">Salvar</button>
                             </div>
                        </form>
                    </div>
                </div>
            )}

             {/* Modal Liability */}
             {isLiabilityModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-8 w-full max-w-md">
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
                                 <button type="submit" className="flex-1 bg-green-500 text-black font-bold rounded-xl">Salvar</button>
                             </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
