import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Wallet, DollarSign, Plus, Download,
    Sparkles, Lightbulb, AlertTriangle, Search, Filter, MoreVertical,
    PieChart, Target, Trophy, RefreshCw, ChevronRight, ExternalLink,
    Coins, BarChart3, Building, Bitcoin, Banknote, Shield
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { Transaction, Debt, Goal } from '../types';
import { apiService } from '../services/apiService';

// Tipos para investimentos
interface Investment {
    id: number;
    name: string;
    ticker: string;
    category: 'stocks' | 'crypto' | 'fixed_income' | 'fiis' | 'funds' | 'other';
    average_price: number;
    current_price: number;
    quantity: number;
    total_invested: number;
    current_value: number;
    profit_loss: number;
    profit_loss_percent: number;
    created_at?: string;
}

interface AIInvestmentSuggestion {
    type: 'opportunity' | 'warning' | 'tip' | 'allocation';
    title: string;
    description: string;
    suggested_amount?: number;
    priority: 'high' | 'medium' | 'low';
    category?: string;
}

interface InvestmentSummary {
    total_invested: number;
    current_value: number;
    total_profit: number;
    total_profit_percent: number;
    best_performer: { name: string; percent: number } | null;
    worst_performer: { name: string; percent: number } | null;
}

interface AllocationData {
    category: string;
    value: number;
    percent: number;
    color: string;
}

// Cores por categoria
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
    stocks: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', icon: TrendingUp },
    crypto: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', icon: Bitcoin },
    fixed_income: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: Shield },
    fiis: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: Building },
    funds: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: PieChart },
    other: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: Coins },
};

const CATEGORY_LABELS: Record<string, string> = {
    stocks: 'Ações',
    crypto: 'Cripto',
    fixed_income: 'Renda Fixa',
    fiis: 'FIIs',
    funds: 'Fundos',
    other: 'Outros',
};

export const Investments: React.FC = () => {
    // Estados
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [aiSuggestions, setAISuggestions] = useState<AIInvestmentSuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [availableToInvest, setAvailableToInvest] = useState(0);

    // Dados financeiros para IA
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);

    // Form para novo investimento
    const [newInvestment, setNewInvestment] = useState({
        name: '',
        ticker: '',
        category: 'stocks' as Investment['category'],
        average_price: 0,
        current_price: 0,
        quantity: 0,
    });

    // Carregar dados
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [invData, txData, debtData] = await Promise.all([
                    fetch('/api/investments').then(r => r.ok ? r.json() : []),
                    apiService.getTransactions(),
                    apiService.getDebts(),
                ]);
                setInvestments(invData || []);
                setTransactions(txData || []);
                setDebts(debtData || []);
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                setInvestments([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Calcular valor disponível para investir
    useEffect(() => {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const monthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= monthStart && d <= monthEnd;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const monthlyDebts = debts.reduce((s, d) => s + d.monthly, 0);

        const available = income - expenses - monthlyDebts;
        setAvailableToInvest(Math.max(0, available));
    }, [transactions, debts]);

    // Buscar sugestões de IA
    const fetchAISuggestions = async () => {
        setIsLoadingAI(true);
        try {
            const response = await fetch('/api/investments/ai-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    available_amount: availableToInvest,
                    current_investments: investments,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setAISuggestions(data.suggestions || []);
            } else {
                generateLocalSuggestions();
            }
        } catch (error) {
            console.error('Erro ao buscar sugestões:', error);
            generateLocalSuggestions();
        } finally {
            setIsLoadingAI(false);
        }
    };

    // Gerar sugestões localmente (fallback)
    const generateLocalSuggestions = () => {
        const suggestions: AIInvestmentSuggestion[] = [];

        // Sugestão baseada no valor disponível
        if (availableToInvest > 0) {
            if (availableToInvest >= 1000) {
                suggestions.push({
                    type: 'opportunity',
                    title: `💰 ${formatCurrency(availableToInvest)} disponível para investir!`,
                    description: 'Baseado em suas receitas e despesas, você tem esse valor sobrando este mês.',
                    suggested_amount: availableToInvest,
                    priority: 'high',
                });
            }

            // Sugestão de reserva de emergência
            const hasFixedIncome = investments.some(i => i.category === 'fixed_income');
            if (!hasFixedIncome && availableToInvest >= 500) {
                suggestions.push({
                    type: 'tip',
                    title: '🛡️ Construa sua reserva de emergência',
                    description: 'Invista em Tesouro Selic para ter liquidez imediata. Recomendado ter 6 meses de despesas guardados.',
                    suggested_amount: Math.min(availableToInvest * 0.4, 2000),
                    priority: 'high',
                    category: 'fixed_income',
                });
            }

            // Sugestão de diversificação
            const categories = [...new Set(investments.map(i => i.category))];
            if (categories.length < 3 && availableToInvest >= 500) {
                suggestions.push({
                    type: 'allocation',
                    title: '📊 Diversifique sua carteira',
                    description: 'Você tem poucos tipos de ativos. Considere adicionar FIIs ou ações para reduzir risco.',
                    priority: 'medium',
                });
            }
        } else {
            suggestions.push({
                type: 'warning',
                title: '⚠️ Sem saldo disponível este mês',
                description: 'Suas despesas e dívidas consomem toda a renda. Revise seus gastos antes de investir.',
                priority: 'high',
            });
        }

        // Análise de performance
        const worstPerformer = investments.reduce((worst, inv) =>
            inv.profit_loss_percent < (worst?.profit_loss_percent ?? 0) ? inv : worst, investments[0]);

        if (worstPerformer && worstPerformer.profit_loss_percent < -20) {
            suggestions.push({
                type: 'warning',
                title: `📉 ${worstPerformer.name} está em queda forte`,
                description: `Perda de ${Math.abs(worstPerformer.profit_loss_percent).toFixed(1)}%. Avalie se faz sentido manter ou realizar prejuízo.`,
                priority: 'medium',
            });
        }

        setAISuggestions(suggestions);
    };

    useEffect(() => {
        if (!isLoading && (transactions.length > 0 || investments.length > 0)) {
            generateLocalSuggestions();
        }
    }, [isLoading, transactions, investments, availableToInvest]);

    // Resumo da carteira
    const summary = useMemo((): InvestmentSummary => {
        const total_invested = investments.reduce((s, i) => s + i.total_invested, 0);
        const current_value = investments.reduce((s, i) => s + i.current_value, 0);
        const total_profit = current_value - total_invested;
        const total_profit_percent = total_invested > 0 ? (total_profit / total_invested) * 100 : 0;

        const sorted = [...investments].sort((a, b) => b.profit_loss_percent - a.profit_loss_percent);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];

        return {
            total_invested,
            current_value,
            total_profit,
            total_profit_percent,
            best_performer: best ? { name: best.ticker, percent: best.profit_loss_percent } : null,
            worst_performer: worst && worst.profit_loss_percent < 0 ? { name: worst.ticker, percent: worst.profit_loss_percent } : null,
        };
    }, [investments]);

    // Alocação por categoria
    const allocation = useMemo((): AllocationData[] => {
        const categoryTotals: Record<string, number> = {};
        investments.forEach(inv => {
            categoryTotals[inv.category] = (categoryTotals[inv.category] || 0) + inv.current_value;
        });

        const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
        const colors = ['#26edab', '#92c9b7', '#f59e0b', '#8b5cf6', '#06b6d4', '#6b7280'];

        return Object.entries(categoryTotals).map(([category, value], idx) => ({
            category,
            value,
            percent: total > 0 ? (value / total) * 100 : 0,
            color: colors[idx % colors.length],
        }));
    }, [investments]);

    // Filtrar investimentos
    const filteredInvestments = useMemo(() => {
        return investments.filter(inv => {
            const matchesSearch = inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.ticker.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || inv.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [investments, searchTerm, selectedCategory]);

    // Adicionar investimento
    const handleAddInvestment = async () => {
        const total_invested = newInvestment.average_price * newInvestment.quantity;
        const current_value = newInvestment.current_price * newInvestment.quantity;
        const profit_loss = current_value - total_invested;
        const profit_loss_percent = total_invested > 0 ? (profit_loss / total_invested) * 100 : 0;

        const investment: Investment = {
            id: Date.now(),
            ...newInvestment,
            total_invested,
            current_value,
            profit_loss,
            profit_loss_percent,
        };

        try {
            await fetch('/api/investments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(investment),
            });
        } catch (e) {
            console.error('Erro ao salvar:', e);
        }

        setInvestments(prev => [...prev, investment]);
        setShowAddModal(false);
        setNewInvestment({
            name: '',
            ticker: '',
            category: 'stocks',
            average_price: 0,
            current_price: 0,
            quantity: 0,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-axxy-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                        <TrendingUp className="text-axxy-primary" size={32} />
                        Carteira de Investimentos
                    </h2>
                    <p className="text-gray-400 mt-1">Visão geral da sua performance e alocação de ativos</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-axxy-card border border-axxy-border rounded-xl text-white hover:border-white/20 transition-all">
                        <Download size={18} />
                        Relatório
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-axxy-primary text-black font-bold rounded-xl hover:bg-axxy-primary/90 transition-all shadow-lg shadow-axxy-primary/20"
                    >
                        <Plus size={18} />
                        Novo Aporte
                    </button>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Patrimônio Total */}
                <div className="bg-axxy-card rounded-2xl border border-axxy-border p-6 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                        <Wallet size={18} />
                        <span>Patrimônio Total</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(summary.current_value)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-sm font-bold ${summary.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {summary.total_profit >= 0 ? '+' : ''}{summary.total_profit_percent.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">desde o início</span>
                    </div>
                </div>

                {/* Valor Investido */}
                <div className="bg-axxy-card rounded-2xl border border-axxy-border p-6 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                        <DollarSign size={18} />
                        <span>Valor Investido</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_invested)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-sm font-bold ${summary.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {summary.total_profit >= 0 ? '+' : ''}{formatCurrency(summary.total_profit)}
                        </span>
                        <span className="text-xs text-gray-500">lucro total</span>
                    </div>
                </div>

                {/* Disponível para Investir */}
                <div className="bg-gradient-to-br from-axxy-primary/10 to-axxy-card rounded-2xl border border-axxy-primary/30 p-6 hover:border-axxy-primary/50 transition-all">
                    <div className="flex items-center gap-2 text-axxy-primary text-sm mb-3">
                        <Coins size={18} />
                        <span>Disponível p/ Investir</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(availableToInvest)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">baseado no saldo do mês</span>
                    </div>
                </div>

                {/* Melhor Ativo */}
                <div className="bg-axxy-card rounded-2xl border border-axxy-border p-6 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                        <Trophy size={18} />
                        <span>Melhor Ativo</span>
                    </div>
                    {summary.best_performer ? (
                        <>
                            <p className="text-2xl font-bold text-white">
                                {summary.best_performer.name}
                                <span className="text-emerald-400 text-lg ml-2">+{summary.best_performer.percent.toFixed(0)}%</span>
                            </p>
                            <span className="text-xs text-gray-500">maior valorização</span>
                        </>
                    ) : (
                        <p className="text-gray-500">Nenhum investimento</p>
                    )}
                </div>
            </div>

            {/* Main Grid - Charts + AI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Alocação & Performance (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Alocação por Categoria */}
                    <div className="bg-axxy-card rounded-3xl border border-axxy-border p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Alocação por Categoria</h3>

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            {/* Donut Chart */}
                            <div className="relative w-40 h-40">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {allocation.reduce((acc, item, idx) => {
                                        const previousPercent = allocation.slice(0, idx).reduce((s, i) => s + i.percent, 0);
                                        const strokeDasharray = `${item.percent} ${100 - item.percent}`;
                                        const strokeDashoffset = -previousPercent;

                                        acc.push(
                                            <circle
                                                key={item.category}
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke={item.color}
                                                strokeWidth="12"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                className="transition-all duration-500"
                                            />
                                        );
                                        return acc;
                                    }, [] as React.ReactNode[])}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xs text-gray-400">Total</span>
                                    <span className="text-lg font-bold text-white">100%</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                {allocation.map(item => (
                                    <div key={item.category} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-sm text-gray-300">
                                                {CATEGORY_LABELS[item.category] || item.category}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-white">{item.percent.toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Insights (1 col) */}
                <div className="bg-gradient-to-br from-purple-900/30 to-axxy-card rounded-3xl border border-purple-500/30 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sparkles size={20} className="text-purple-400" />
                            Axxy AI Insights
                        </h3>
                        <button
                            onClick={fetchAISuggestions}
                            disabled={isLoadingAI}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isLoadingAI ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {isLoadingAI ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px]">
                            {aiSuggestions.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-xl border backdrop-blur-sm ${suggestion.type === 'warning'
                                        ? 'bg-red-500/10 border-red-500/30'
                                        : suggestion.type === 'opportunity'
                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                            : 'bg-black/20 border-white/10'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {suggestion.type === 'warning' ? (
                                            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                        ) : suggestion.type === 'opportunity' ? (
                                            <TrendingUp size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                                        ) : (
                                            <Lightbulb size={18} className="text-yellow-400 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-bold text-white text-sm">{suggestion.title}</p>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{suggestion.description}</p>
                                            {suggestion.suggested_amount && (
                                                <p className="text-xs text-axxy-primary font-bold mt-2">
                                                    Sugestão: {formatCurrency(suggestion.suggested_amount)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={fetchAISuggestions}
                        className="mt-4 w-full py-2 rounded-lg bg-white/5 text-sm font-bold text-purple-400 hover:bg-white/10 transition-colors"
                    >
                        Ver análise completa
                    </button>
                </div>
            </div>

            {/* Lista de Ativos */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-xl font-bold text-white">Meus Ativos</h3>

                    <div className="flex w-full md:w-auto gap-3">
                        {/* Search */}
                        <div className="relative flex-1 md:w-64">
                            <Search size={18} className="absolute left-3 top-2.5 text-gray-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar ativo..."
                                className="w-full bg-axxy-card border border-axxy-border rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-axxy-primary transition-all"
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => setSelectedCategory(e.target.value || null)}
                            className="bg-axxy-card border border-axxy-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-axxy-primary transition-all"
                        >
                            <option value="">Todas categorias</option>
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-axxy-card rounded-2xl border border-axxy-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-axxy-border bg-white/[0.02]">
                                    <th className="px-6 py-4 font-medium text-gray-400">Ativo</th>
                                    <th className="px-6 py-4 font-medium text-gray-400">Categoria</th>
                                    <th className="px-6 py-4 font-medium text-gray-400 text-right">Preço Médio</th>
                                    <th className="px-6 py-4 font-medium text-gray-400 text-right">Preço Atual</th>
                                    <th className="px-6 py-4 font-medium text-gray-400 text-right">Saldo Total</th>
                                    <th className="px-6 py-4 font-medium text-gray-400 text-right">Rentabilidade</th>
                                    <th className="px-6 py-4 font-medium text-gray-400 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-axxy-border">
                                {filteredInvestments.map(inv => {
                                    const catStyle = CATEGORY_COLORS[inv.category] || CATEGORY_COLORS.other;
                                    const CatIcon = catStyle.icon;

                                    return (
                                        <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-full ${catStyle.bg} flex items-center justify-center ${catStyle.text} font-bold text-xs`}>
                                                        {inv.ticker.slice(0, 3)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{inv.name}</p>
                                                        <p className="text-xs text-gray-500">{inv.ticker}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 rounded-full ${catStyle.bg} px-2.5 py-1 text-xs font-medium ${catStyle.text} border ${catStyle.border}`}>
                                                    <CatIcon size={12} />
                                                    {CATEGORY_LABELS[inv.category]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-300">{formatCurrency(inv.average_price)}</td>
                                            <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(inv.current_price)}</td>
                                            <td className="px-6 py-4 text-right text-white font-bold">{formatCurrency(inv.current_value)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center gap-1 font-bold ${inv.profit_loss_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {inv.profit_loss_percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    {inv.profit_loss_percent >= 0 ? '+' : ''}{inv.profit_loss_percent.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="text-gray-500 hover:text-white transition-colors p-1">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredInvestments.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            <Coins size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Nenhum investimento encontrado</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 text-axxy-primary hover:underline"
                            >
                                Adicionar primeiro investimento
                            </button>
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredInvestments.length > 0 && (
                        <div className="flex items-center justify-between border-t border-axxy-border bg-white/[0.02] px-6 py-3">
                            <p className="text-xs text-gray-400">Mostrando {filteredInvestments.length} de {investments.length} ativos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Adicionar Investimento */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-axxy-card rounded-3xl border border-axxy-border p-8 w-full max-w-lg animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="text-axxy-primary" />
                            Adicionar Investimento
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Nome do Ativo</label>
                                    <input
                                        type="text"
                                        value={newInvestment.name}
                                        onChange={(e) => setNewInvestment(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Ex: Bitcoin"
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-axxy-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Ticker/Código</label>
                                    <input
                                        type="text"
                                        value={newInvestment.ticker}
                                        onChange={(e) => setNewInvestment(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                                        placeholder="Ex: BTC"
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-axxy-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Categoria</label>
                                <select
                                    value={newInvestment.category}
                                    onChange={(e) => setNewInvestment(p => ({ ...p, category: e.target.value as Investment['category'] }))}
                                    className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-axxy-primary"
                                >
                                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Preço Médio</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newInvestment.average_price || ''}
                                        onChange={(e) => setNewInvestment(p => ({ ...p, average_price: parseFloat(e.target.value) || 0 }))}
                                        placeholder="0,00"
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-axxy-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Preço Atual</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newInvestment.current_price || ''}
                                        onChange={(e) => setNewInvestment(p => ({ ...p, current_price: parseFloat(e.target.value) || 0 }))}
                                        placeholder="0,00"
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-axxy-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Quantidade</label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={newInvestment.quantity || ''}
                                        onChange={(e) => setNewInvestment(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                                        placeholder="0"
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-axxy-primary"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {newInvestment.average_price > 0 && newInvestment.quantity > 0 && (
                                <div className="bg-axxy-bg rounded-xl p-4 border border-axxy-border">
                                    <p className="text-sm text-gray-400">Total investido:</p>
                                    <p className="text-xl font-bold text-white">
                                        {formatCurrency(newInvestment.average_price * newInvestment.quantity)}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-3 bg-axxy-bg border border-axxy-border rounded-xl text-white hover:border-white/20 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddInvestment}
                                disabled={!newInvestment.name || !newInvestment.ticker || newInvestment.quantity <= 0}
                                className="flex-1 px-4 py-3 bg-axxy-primary text-black font-bold rounded-xl hover:bg-axxy-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
