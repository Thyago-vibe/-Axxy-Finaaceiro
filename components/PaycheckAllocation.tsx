import React, { useState, useEffect, useMemo } from 'react';
import {
    PieChart, Calendar, RefreshCw, CheckCircle, Edit3, Save,
    Home, Target, Wallet, Shield, ChevronDown, ChevronUp,
    Lightbulb, AlertTriangle, TrendingDown, ThumbsUp, Sparkles
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { apiService } from '../services/apiService';
import { formatCurrency } from '../utils/formatters';
import { AllocationCategory, AllocationSuggestion } from '../types';

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; bgColor: string; textColor: string; borderColor: string }> = {
    essentials: { icon: Home, bgColor: 'bg-red-500/20', textColor: 'text-red-400', borderColor: 'border-red-500/30' },
    goals: { icon: Target, bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', borderColor: 'border-blue-500/30' },
    budgets: { icon: Wallet, bgColor: 'bg-purple-500/20', textColor: 'text-purple-400', borderColor: 'border-purple-500/30' },
    safety_margin: { icon: Shield, bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30' },
};

// Insight icons
const INSIGHT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
    warning: { icon: AlertTriangle, color: 'text-yellow-500' },
    trending: { icon: TrendingDown, color: 'text-blue-400' },
    success: { icon: ThumbsUp, color: 'text-emerald-400' },
};

interface PaycheckAllocationProps {
    initialAmount?: number;
    initialDate?: string;
    onClearPending?: () => void;
}

export const PaycheckAllocation: React.FC<PaycheckAllocationProps> = ({
    initialAmount,
    initialDate,
    onClearPending
}) => {
    const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : '');
    const [suggestion, setSuggestion] = useState<AllocationSuggestion | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['essentials']));
    const [isApplying, setIsApplying] = useState(false);
    const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

    // Determine paycheck period (day 10 or 25) based on transaction date
    const { currentDate, paycheckPeriod } = useMemo(() => {
        let baseDate: Date;

        if (initialDate) {
            // Use the transaction date to determine the paycheck period
            baseDate = new Date(initialDate + 'T12:00:00');
        } else {
            baseDate = new Date();
        }

        const day = baseDate.getDate();
        const month = baseDate.getMonth();
        const year = baseDate.getFullYear();

        // Determine which paycheck period this date belongs to:
        // Days 1-14 → Paycheck of day 10 (first half)
        // Days 15-31 → Paycheck of day 25 (second half)
        let paycheckDay: number;
        let periodLabel: string;

        if (day <= 14) {
            paycheckDay = 10;
            periodLabel = '1ª Quinzena (Dia 10)';
        } else {
            paycheckDay = 25;
            periodLabel = '2ª Quinzena (Dia 25)';
        }

        const paycheckDate = new Date(year, month, paycheckDay);

        return {
            currentDate: paycheckDate.toISOString().split('T')[0],
            paycheckPeriod: periodLabel
        };
    }, [initialDate]);

    const [paycheckDate, setPaycheckDate] = useState(currentDate);

    // Auto-fetch when coming from transaction with initial amount
    useEffect(() => {
        if (initialAmount && initialAmount > 0) {
            // Trigger suggestion fetch automatically
            const fetchInitialSuggestion = async () => {
                setIsLoading(true);
                setAppliedMessage(null);
                try {
                    const data = await apiService.getAllocationSuggestion(initialAmount, paycheckDate);
                    setSuggestion(data);
                    setExpandedCategories(new Set(['essentials']));
                } catch (error) {
                    console.error('Error fetching allocation suggestion:', error);
                } finally {
                    setIsLoading(false);
                    // Clear the pending state after processing
                    if (onClearPending) {
                        onClearPending();
                    }
                }
            };
            fetchInitialSuggestion();
        }
    }, [initialAmount, paycheckDate, onClearPending]);

    // Format amount for display
    const formatAmountDisplay = (value: string) => {
        const numValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Parse amount from input
    const parseAmountInput = (value: string) => {
        return value.replace(/[^\d.,]/g, '').replace(',', '.');
    };

    // Fetch suggestion from API
    const fetchSuggestion = async () => {
        setIsLoading(true);
        setAppliedMessage(null);
        try {
            const numAmount = parseFloat(amount) || 0;
            const data = await apiService.getAllocationSuggestion(numAmount, paycheckDate);
            setSuggestion(data);
            // Auto-expand essentials
            setExpandedCategories(new Set(['essentials']));
        } catch (error) {
            console.error('Error fetching allocation suggestion:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Apply allocation
    const handleApply = async () => {
        if (!suggestion) return;
        setIsApplying(true);
        try {
            const result = await apiService.applyAllocation(suggestion.id);
            setAppliedMessage(result.message || 'Alocação aplicada com sucesso!');
        } catch (error) {
            console.error('Error applying allocation:', error);
            setAppliedMessage('Erro ao aplicar alocação');
        } finally {
            setIsApplying(false);
        }
    };

    // Toggle category expansion
    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    // Check if today is a paycheck day
    const isPaycheckDay = useMemo(() => {
        const today = new Date().getDate();
        return today === 10 || today === 25;
    }, []);

    // Calculate total allocated
    const totalAllocated = useMemo(() => {
        if (!suggestion) return 0;
        return suggestion.categories.reduce((sum, cat) => sum + cat.amount, 0);
    }, [suggestion]);

    const allocationPercentage = useMemo(() => {
        const numAmount = parseFloat(amount) || 1;
        return Math.round((totalAllocated / numAmount) * 100);
    }, [totalAllocated, amount]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-axxy-primary/20 text-axxy-primary">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">Alocação Quinzenal</h2>
                                {initialAmount && (
                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 font-medium">
                                        {paycheckPeriod}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm mt-1">
                                Pagamento de {new Date(paycheckDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                {initialDate && (
                                    <span className="text-gray-500 ml-2">
                                        • Transação em {new Date(initialDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="bg-axxy-card border border-axxy-border p-1.5 rounded-2xl flex items-center gap-2 max-w-md w-full lg:w-auto">
                    <div className="flex flex-col px-4 py-1 flex-1">
                        <label className="text-xs font-medium text-axxy-primary/80 uppercase tracking-wider">Valor Recebido</label>
                        <input
                            type="text"
                            value={formatAmountDisplay(amount)}
                            onChange={(e) => setAmount(parseAmountInput(e.target.value))}
                            className="bg-transparent border-none p-0 text-xl md:text-2xl font-bold text-white focus:ring-0 focus:outline-none placeholder-gray-600 w-full font-mono tracking-tight"
                            placeholder="R$ 0,00"
                        />
                    </div>
                    <button
                        onClick={fetchSuggestion}
                        disabled={isLoading}
                        className="h-12 w-12 rounded-xl bg-axxy-primary hover:bg-axxy-primary/80 text-black flex items-center justify-center transition-all disabled:opacity-50"
                        title="Recalcular com IA"
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Paycheck Day Banner */}
            {isPaycheckDay && (
                <div className="flex items-center gap-3 rounded-full bg-axxy-primary/10 border border-axxy-primary/30 px-4 py-2 w-fit">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-axxy-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-axxy-primary"></span>
                    </span>
                    <span className="text-sm font-medium text-axxy-primary">Dia de Pagamento! 🎉</span>
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* LEFT: Suggested Allocation */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Sparkles size={20} className="text-axxy-primary" />
                            <h3 className="font-semibold text-lg">Sugestão Inteligente</h3>
                        </div>
                        {suggestion && (
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                    <span>Alocado</span>
                                    <span className="text-white font-bold">{allocationPercentage}%</span>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-32 md:w-48 h-2 bg-gray-800 rounded-full overflow-hidden flex">
                                    {suggestion.categories.map((cat) => (
                                        <div
                                            key={cat.id}
                                            className="h-full"
                                            style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <RefreshCw size={32} className="animate-spin mb-4 text-axxy-primary" />
                            <p>Analisando sua situação financeira...</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !suggestion && (
                        <div className="bg-axxy-card border border-axxy-border rounded-2xl p-8 text-center">
                            <PieChart size={48} className="mx-auto mb-4 text-gray-600" />
                            <h4 className="text-white font-semibold mb-2">Nenhuma alocação calculada</h4>
                            <p className="text-gray-400 text-sm mb-4">
                                Insira o valor do seu salário e clique no botão de recalcular para receber sugestões inteligentes.
                            </p>
                            <button
                                onClick={fetchSuggestion}
                                className="px-4 py-2 rounded-xl bg-axxy-primary text-black font-medium hover:bg-axxy-primary/80 transition-colors"
                            >
                                Gerar Sugestão
                            </button>
                        </div>
                    )}

                    {/* Category Cards */}
                    {!isLoading && suggestion && (
                        <div className="flex flex-col gap-4">
                            {suggestion.categories.map((category) => {
                                const config = CATEGORY_CONFIG[category.id] || CATEGORY_CONFIG.essentials;
                                const Icon = config.icon;
                                const isExpanded = expandedCategories.has(category.id);

                                return (
                                    <div
                                        key={category.id}
                                        className={`bg-axxy-card border border-axxy-border rounded-2xl overflow-hidden transition-all hover:border-white/20 ${category.id === 'safety_margin' ? 'border-l-4 border-l-yellow-500/50' : ''
                                            }`}
                                    >
                                        <div className="p-5 flex flex-col gap-4">
                                            {/* Header */}
                                            <div
                                                className="flex items-center justify-between cursor-pointer"
                                                onClick={() => toggleCategory(category.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-full ${config.bgColor} ${config.textColor} flex items-center justify-center border ${config.borderColor}`}>
                                                        <Icon size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-semibold flex items-center gap-2">
                                                            {category.name}
                                                            <span className={`inline-flex items-center rounded-md ${config.bgColor} px-1.5 py-0.5 text-[10px] font-medium ${config.textColor} ring-1 ring-inset ${config.borderColor}`}>
                                                                {category.items.length} {category.items.length === 1 ? 'item' : 'itens'}
                                                            </span>
                                                        </h4>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {category.id === 'essentials' && 'Custos fixos mensais'}
                                                            {category.id === 'goals' && 'Suas metas de poupança'}
                                                            {category.id === 'budgets' && 'Variáveis do dia-a-dia'}
                                                            {category.id === 'safety_margin' && 'Para imprevistos'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-white font-bold font-mono text-lg">{formatCurrency(category.amount)}</p>
                                                        <p className={`text-xs ${config.textColor} font-medium`}>{category.percentage}%</p>
                                                    </div>
                                                    {category.id !== 'safety_margin' && (
                                                        isExpanded ? (
                                                            <ChevronUp size={20} className="text-gray-500" />
                                                        ) : (
                                                            <ChevronDown size={20} className="text-gray-500" />
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Items */}
                                            {isExpanded && category.items.length > 0 && (
                                                <div className="border-t border-white/5 pt-4 mt-1 grid gap-3 animate-fade-in">
                                                    {category.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-sm group">
                                                            <div className="flex items-center gap-3 text-gray-300">
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }}></div>
                                                                <span>{item.name}</span>
                                                            </div>
                                                            <span className="text-white font-medium font-mono group-hover:text-axxy-primary transition-colors">
                                                                {formatCurrency(item.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT: Chart & Actions */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Chart */}
                    {suggestion && (
                        <div className="bg-axxy-card border border-axxy-border rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <PieChart size={80} className="text-white" />
                            </div>
                            <div className="w-[180px] h-[180px] mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie
                                            data={suggestion.chart_data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {suggestion.chart_data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => formatCurrency(value)}
                                            contentStyle={{ backgroundColor: '#15221c', border: '1px solid #1e332a', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center mb-4">
                                <p className="text-xs text-gray-400">Total</p>
                                <p className="text-2xl font-bold text-white font-mono">{formatCurrency(parseFloat(amount) || 0)}</p>
                            </div>
                            <div className="w-full grid grid-cols-2 gap-3 text-xs">
                                {suggestion.chart_data.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}50` }}
                                        ></span>
                                        <span className="text-gray-300">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Insights */}
                    {suggestion && suggestion.insights.length > 0 && (
                        <div className="bg-axxy-card border border-axxy-primary/20 rounded-2xl p-5 bg-gradient-to-br from-axxy-primary/5 to-transparent relative">
                            <div className="absolute -top-3 -right-3">
                                <span className="relative flex h-8 w-8 items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-axxy-primary opacity-20"></span>
                                    <span className="relative inline-flex rounded-full h-8 w-8 bg-axxy-card border border-axxy-primary/50 items-center justify-center">
                                        <Lightbulb size={16} className="text-axxy-primary" />
                                    </span>
                                </span>
                            </div>
                            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                Insights da IA
                            </h4>
                            <ul className="space-y-3">
                                {suggestion.insights.map((insight, idx) => {
                                    // Determine icon based on content
                                    let IconComponent = Lightbulb;
                                    let iconColor = 'text-axxy-primary';

                                    if (insight.toLowerCase().includes('vence') || insight.toLowerCase().includes('urgente')) {
                                        IconComponent = AlertTriangle;
                                        iconColor = 'text-yellow-500';
                                    } else if (insight.toLowerCase().includes('atrasad')) {
                                        IconComponent = TrendingDown;
                                        iconColor = 'text-blue-400';
                                    } else if (insight.toLowerCase().includes('menos') || insight.toLowerCase().includes('boa')) {
                                        IconComponent = ThumbsUp;
                                        iconColor = 'text-emerald-400';
                                    }

                                    return (
                                        <li key={idx} className="flex gap-3 text-sm">
                                            <IconComponent size={18} className={`${iconColor} shrink-0`} />
                                            <span className="text-gray-300">{insight}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    {suggestion && (
                        <div className="mt-auto flex flex-col gap-3">
                            {appliedMessage && (
                                <div className={`p-3 rounded-xl text-sm text-center ${appliedMessage.includes('Erro') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {appliedMessage}
                                </div>
                            )}
                            <button
                                onClick={handleApply}
                                disabled={isApplying || suggestion.categories.length === 0}
                                className="w-full h-12 rounded-xl bg-axxy-primary hover:bg-axxy-primary/80 text-black font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(45,212,164,0.15)]"
                            >
                                <CheckCircle size={20} />
                                {isApplying ? 'Aplicando...' : 'Aprovar e Aplicar'}
                            </button>
                            <button className="w-full h-12 rounded-xl border border-axxy-border hover:bg-white/5 text-white font-medium text-sm transition-all flex items-center justify-center gap-2">
                                <Edit3 size={18} />
                                Ajustar Manualmente
                            </button>
                            <button className="w-full h-10 rounded-xl text-gray-500 hover:text-white font-medium text-sm transition-colors text-center">
                                Salvar Rascunho
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-4 pt-6 border-t border-axxy-border flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                <p>Baseado no seu histórico financeiro dos últimos 6 meses.</p>
                <a href="#" className="mt-2 md:mt-0 text-axxy-primary hover:underline flex items-center gap-1">
                    Ver alocações anteriores
                    <ChevronDown size={14} className="-rotate-90" />
                </a>
            </footer>
        </div>
    );
};
