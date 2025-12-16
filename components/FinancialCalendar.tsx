import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertTriangle,
    TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Sparkles,
    Eye, EyeOff, Clock, CheckCircle, XCircle, RefreshCw, Lightbulb,
    ArrowUp, ArrowDown, Bell, Filter, Wallet, PieChart
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { Transaction, Debt, Goal, Budget } from '../types';
import { apiService } from '../services/apiService';

// Dias de pagamento de quinzena/salário
const PAYDAY_DAYS = [10, 25];

// Tipos para eventos do calendário
interface CalendarEvent {
    id: string;
    date: string;
    title: string;
    amount: number;
    type: 'income' | 'expense' | 'debt' | 'goal' | 'recurring';
    status: 'pending' | 'paid' | 'overdue' | 'upcoming';
    category?: string;
    sourceType: 'transaction' | 'debt' | 'goal' | 'budget';
    sourceId?: number | string;
    isRecurring?: boolean;
    daysUntilDue?: number;
}

interface AIInsight {
    type: 'warning' | 'tip' | 'success' | 'info';
    title: string;
    description: string;
    action?: string;
}

interface MonthSummary {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    pendingDebts: number;
    overdueCount: number;
    upcomingCount: number;
}

// Cores por tipo
const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    income: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
    expense: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
    debt: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
    goal: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
    recurring: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
    pending: Clock,
    paid: CheckCircle,
    overdue: AlertTriangle,
    upcoming: Bell,
};

interface FinancialCalendarProps {
    onNavigateToAllocation?: (date: string) => void;
}

export const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ onNavigateToAllocation }) => {
    // Estados
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAIInsights, setShowAIInsights] = useState(true);
    const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'debt'>('all');
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');

    // Dados brutos
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);

    // Carregar dados
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [txData, debtData, goalData] = await Promise.all([
                    apiService.getTransactions(),
                    apiService.getDebts(),
                    apiService.getGoals(),
                ]);
                setTransactions(txData || []);
                setDebts(debtData || []);
                setGoals(goalData || []);
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Converter dados em eventos do calendário
    useEffect(() => {
        const calendarEvents: CalendarEvent[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Transações -> Eventos
        transactions.forEach(tx => {
            const txDate = new Date(tx.date);
            const isPast = txDate < today;

            calendarEvents.push({
                id: `tx-${tx.id}`,
                date: tx.date,
                title: tx.description,
                amount: tx.amount,
                type: tx.type as 'income' | 'expense',
                status: tx.status === 'completed' ? 'paid' : (isPast ? 'overdue' : 'pending'),
                category: tx.category,
                sourceType: 'transaction',
                sourceId: tx.id,
            });
        });

        // Dívidas -> Eventos (gerar para o mês atual e próximo)
        debts.forEach(debt => {
            const dueDay = parseInt(debt.dueDate.split('-')[2] || debt.dueDate);

            // Gerar eventos para mês atual e próximo
            for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
                const eventMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
                const eventDate = new Date(eventMonth.getFullYear(), eventMonth.getMonth(), dueDay);

                if (isNaN(eventDate.getTime())) continue;

                const diffTime = eventDate.getTime() - today.getTime();
                const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let status: CalendarEvent['status'] = 'upcoming';
                if (daysUntil < 0) status = debt.status === 'Atrasado' ? 'overdue' : 'paid';
                else if (daysUntil <= 3) status = 'pending';

                calendarEvents.push({
                    id: `debt-${debt.id}-${monthOffset}`,
                    date: eventDate.toISOString().split('T')[0],
                    title: debt.name,
                    amount: debt.monthly,
                    type: 'debt',
                    status,
                    category: debt.category,
                    sourceType: 'debt',
                    sourceId: debt.id,
                    isRecurring: debt.debtType === 'fixo',
                    daysUntilDue: daysUntil,
                });
            }
        });

        // Metas com deadline -> Eventos
        goals.forEach(goal => {
            if (goal.deadline) {
                const deadlineDate = new Date(goal.deadline);
                const diffTime = deadlineDate.getTime() - today.getTime();
                const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                calendarEvents.push({
                    id: `goal-${goal.id}`,
                    date: goal.deadline,
                    title: `Meta: ${goal.name}`,
                    amount: goal.targetAmount - goal.currentAmount,
                    type: 'goal',
                    status: daysUntil < 0 ? 'overdue' : (daysUntil <= 7 ? 'pending' : 'upcoming'),
                    sourceType: 'goal',
                    sourceId: goal.id,
                    daysUntilDue: daysUntil,
                });
            }
        });

        setEvents(calendarEvents);
    }, [transactions, debts, goals, currentDate]);

    // Buscar insights da IA
    const fetchAIInsights = async () => {
        setIsLoadingAI(true);
        try {
            const response = await fetch('/api/calendar/ai-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month: currentDate.getMonth() + 1,
                    year: currentDate.getFullYear(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setAIInsights(data.insights || []);
            }
        } catch (error) {
            console.error('Erro ao buscar insights:', error);
            // Fallback local
            generateLocalInsights();
        } finally {
            setIsLoadingAI(false);
        }
    };

    // Gerar insights localmente (fallback)
    const generateLocalInsights = () => {
        const insights: AIInsight[] = [];
        const today = new Date();

        // Verificar dívidas próximas
        const upcomingDebts = debts.filter(d => {
            const dueDay = parseInt(d.dueDate.split('-')[2] || d.dueDate);
            const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
            const diff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            return diff > 0 && diff <= 5;
        });

        if (upcomingDebts.length > 0) {
            const total = upcomingDebts.reduce((sum, d) => sum + d.monthly, 0);
            insights.push({
                type: 'warning',
                title: `${upcomingDebts.length} conta(s) vencem em breve`,
                description: `Total de ${formatCurrency(total)} nos próximos 5 dias`,
                action: 'Prepare-se para esses pagamentos',
            });
        }

        // Verificar dívidas atrasadas
        const overdueDebts = debts.filter(d => d.status === 'Atrasado');
        if (overdueDebts.length > 0) {
            insights.push({
                type: 'warning',
                title: `⚠️ ${overdueDebts.length} dívida(s) atrasada(s)`,
                description: 'Regularize para evitar juros e multas',
            });
        }

        // Análise do fluxo do mês
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const monthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= monthStart && d <= monthEnd;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const monthlyDebts = debts.reduce((s, d) => s + d.monthly, 0);

        if (income > expenses + monthlyDebts) {
            insights.push({
                type: 'success',
                title: '✨ Mês com saldo positivo!',
                description: `Sobra estimada: ${formatCurrency(income - expenses - monthlyDebts)}`,
                action: 'Considere investir ou guardar',
            });
        } else if (income < expenses + monthlyDebts) {
            insights.push({
                type: 'warning',
                title: '📊 Atenção ao orçamento',
                description: `Despesas excedem receitas em ${formatCurrency(expenses + monthlyDebts - income)}`,
                action: 'Revise gastos não essenciais',
            });
        }

        // Dica motivacional
        const goalsProgress = goals.filter(g => g.currentAmount >= g.targetAmount * 0.8);
        if (goalsProgress.length > 0) {
            insights.push({
                type: 'success',
                title: '🎯 Meta quase alcançada!',
                description: `${goalsProgress[0].name} está em ${Math.round((goalsProgress[0].currentAmount / goalsProgress[0].targetAmount) * 100)}%`,
            });
        }

        setAIInsights(insights);
    };

    useEffect(() => {
        if (events.length > 0 && !isLoading) {
            generateLocalInsights();
        }
    }, [events, isLoading]);

    // Cálculos do mês
    const monthSummary = useMemo((): MonthSummary => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const monthEvents = events.filter(e => {
            const d = new Date(e.date);
            return d >= monthStart && d <= monthEnd;
        });

        const totalIncome = monthEvents.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
        const totalExpense = monthEvents.filter(e => e.type === 'expense' || e.type === 'debt').reduce((s, e) => s + e.amount, 0);
        const pendingDebts = monthEvents.filter(e => e.type === 'debt' && e.status !== 'paid').reduce((s, e) => s + e.amount, 0);
        const overdueCount = monthEvents.filter(e => e.status === 'overdue').length;
        const upcomingCount = monthEvents.filter(e => e.status === 'pending' || e.status === 'upcoming').length;

        return {
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
            pendingDebts,
            overdueCount,
            upcomingCount,
        };
    }, [events, currentDate]);

    // Navegação
    const goToPrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Gerar dias do calendário
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days: { date: Date; isCurrentMonth: boolean; events: CalendarEvent[] }[] = [];

        // Dias do mês anterior
        const startPadding = firstDay.getDay();
        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, isCurrentMonth: false, events: [] });
        }

        // Dias do mês atual
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d);
            const dateStr = date.toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.date === dateStr);

            // Aplicar filtro
            const filteredEvents = filter === 'all'
                ? dayEvents
                : dayEvents.filter(e => e.type === filter || (filter === 'expense' && e.type === 'debt'));

            days.push({ date, isCurrentMonth: true, events: filteredEvents });
        }

        // Preencher para completar 6 semanas
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({ date, isCurrentMonth: false, events: [] });
        }

        return days;
    }, [currentDate, events, filter]);

    // Eventos do dia selecionado
    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = selectedDate.toISOString().split('T')[0];
        return events.filter(e => e.date === dateStr);
    }, [selectedDate, events]);

    // Formato do mês
    const monthYear = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarIcon className="text-axxy-primary" size={28} />
                        Calendário Financeiro
                    </h2>
                    <p className="text-gray-400 mt-1">Visualize e planeje suas finanças ao longo do tempo</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filtros */}
                    <div className="flex bg-axxy-card rounded-xl p-1 border border-axxy-border">
                        {(['all', 'income', 'expense', 'debt'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'bg-axxy-primary text-black'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : f === 'expense' ? 'Despesas' : 'Dívidas'}
                            </button>
                        ))}
                    </div>

                    {/* Toggle AI Insights */}
                    <button
                        onClick={() => setShowAIInsights(!showAIInsights)}
                        className={`p-2 rounded-xl border transition-all ${showAIInsights
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                            : 'bg-axxy-card border-axxy-border text-gray-400'
                            }`}
                        title="Insights da IA"
                    >
                        <Sparkles size={20} />
                    </button>
                </div>
            </div>

            {/* Resumo do Mês */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-axxy-card p-4 rounded-2xl border border-axxy-border">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <ArrowUp size={16} className="text-emerald-400" />
                        Receitas
                    </div>
                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(monthSummary.totalIncome)}</p>
                </div>

                <div className="bg-axxy-card p-4 rounded-2xl border border-axxy-border">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <ArrowDown size={16} className="text-red-400" />
                        Despesas
                    </div>
                    <p className="text-xl font-bold text-red-400">{formatCurrency(monthSummary.totalExpense)}</p>
                </div>

                <div className="bg-axxy-card p-4 rounded-2xl border border-axxy-border">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <DollarSign size={16} className="text-axxy-primary" />
                        Saldo
                    </div>
                    <p className={`text-xl font-bold ${monthSummary.netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(monthSummary.netBalance)}
                    </p>
                </div>

                <div className="bg-axxy-card p-4 rounded-2xl border border-axxy-border">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <CreditCard size={16} className="text-orange-400" />
                        Contas Pendentes
                    </div>
                    <p className="text-xl font-bold text-orange-400">{formatCurrency(monthSummary.pendingDebts)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendário Principal */}
                <div className="lg:col-span-2 bg-axxy-card rounded-3xl border border-axxy-border p-6">
                    {/* Navegação do mês */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={goToPrevMonth}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-semibold text-white capitalize">{monthYear}</h3>
                            <button
                                onClick={goToToday}
                                className="text-sm text-axxy-primary hover:underline"
                            >
                                Hoje
                            </button>
                        </div>

                        <button
                            onClick={goToNextMonth}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {/* Cabeçalho dos dias */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Grid do calendário */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                            const isToday = day.date.toDateString() === new Date().toDateString();
                            const isSelected = selectedDate?.toDateString() === day.date.toDateString();
                            const hasEvents = day.events.length > 0;
                            const hasOverdue = day.events.some(e => e.status === 'overdue');
                            const hasIncome = day.events.some(e => e.type === 'income');
                            const hasExpense = day.events.some(e => e.type === 'expense' || e.type === 'debt');
                            const isPayday = day.isCurrentMonth && PAYDAY_DAYS.includes(day.date.getDate());

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day.date)}
                                    className={`
                    min-h-[80px] p-2 rounded-xl border transition-all text-left flex flex-col
                    ${day.isCurrentMonth ? 'bg-axxy-bg' : 'bg-axxy-card/30 opacity-50'}
                    ${isSelected ? 'border-axxy-primary ring-2 ring-axxy-primary/30' : 'border-transparent hover:border-axxy-border'}
                    ${isToday ? 'ring-2 ring-axxy-primary/50' : ''}
                    ${isPayday ? 'bg-gradient-to-br from-axxy-primary/10 to-axxy-bg border-axxy-primary/30' : ''}
                  `}
                                >
                                    <span className={`text-sm font-medium ${isToday ? 'text-axxy-primary' :
                                        day.isCurrentMonth ? 'text-white' : 'text-gray-600'
                                        }`}>
                                        {day.date.getDate()}
                                    </span>

                                    {/* Indicador de Dia de Pagamento */}
                                    {day.isCurrentMonth && PAYDAY_DAYS.includes(day.date.getDate()) && (
                                        <div className="flex items-center gap-1 text-xs text-axxy-primary font-medium">
                                            <Wallet size={10} />
                                            <span>Quinzena</span>
                                        </div>
                                    )}

                                    {/* Indicadores de eventos */}
                                    <div className="flex-1 mt-1 space-y-1 overflow-hidden">
                                        {day.events.slice(0, 2).map((event, i) => (
                                            <div
                                                key={i}
                                                className={`text-xs px-1.5 py-0.5 rounded truncate ${EVENT_COLORS[event.type].bg} ${EVENT_COLORS[event.type].text}`}
                                            >
                                                {event.title.length > 10 ? event.title.slice(0, 10) + '...' : event.title}
                                            </div>
                                        ))}
                                        {day.events.length > 2 && (
                                            <span className="text-xs text-gray-500">+{day.events.length - 2} mais</span>
                                        )}
                                    </div>

                                    {/* Dots indicadores */}
                                    {hasEvents && (
                                        <div className="flex gap-1 mt-auto pt-1">
                                            {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                            {hasIncome && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                            {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar - Detalhes e Insights */}
                <div className="space-y-6">
                    {/* Eventos do dia selecionado */}
                    <div className="bg-axxy-card rounded-3xl border border-axxy-border p-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <CalendarIcon size={20} className="text-axxy-primary" />
                            {selectedDate ? (
                                selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
                            ) : (
                                'Selecione um dia'
                            )}
                        </h4>

                        {/* Botão de Alocação Quinzenal - aparece nos dias 10 e 25 */}
                        {selectedDate && PAYDAY_DAYS.includes(selectedDate.getDate()) && onNavigateToAllocation && (
                            <button
                                onClick={() => {
                                    const dateStr = selectedDate.toISOString().split('T')[0];
                                    onNavigateToAllocation(dateStr);
                                }}
                                className="w-full mb-4 p-4 bg-gradient-to-r from-axxy-primary/20 to-emerald-600/20 rounded-xl border border-axxy-primary/50 hover:border-axxy-primary transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-axxy-primary/20 rounded-lg group-hover:bg-axxy-primary/30 transition-colors">
                                        <PieChart size={24} className="text-axxy-primary" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-semibold text-white">💰 Dia de Pagamento!</p>
                                        <p className="text-sm text-gray-400">Clique para alocar sua quinzena</p>
                                    </div>
                                    <ChevronRight size={20} className="text-axxy-primary group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        )}

                        {selectedDate && selectedDayEvents.length > 0 ? (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {selectedDayEvents.map(event => {
                                    const StatusIcon = STATUS_ICONS[event.status];
                                    const colors = EVENT_COLORS[event.type];

                                    return (
                                        <div
                                            key={event.id}
                                            className={`p-3 rounded-xl border ${colors.bg} ${colors.border}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium ${colors.text} truncate`}>{event.title}</p>
                                                    {event.category && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{event.category}</p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`font-bold ${colors.text}`}>
                                                        {event.type === 'income' ? '+' : '-'}{formatCurrency(event.amount)}
                                                    </p>
                                                    <div className="flex items-center gap-1 justify-end mt-1">
                                                        <StatusIcon size={12} className={colors.text} />
                                                        <span className="text-xs text-gray-500 capitalize">{event.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {event.isRecurring && (
                                                <div className="flex items-center gap-1 mt-2 text-xs text-purple-400">
                                                    <RefreshCw size={12} />
                                                    Recorrente
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : selectedDate ? (
                            <div className="text-center py-8 text-gray-500">
                                <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhum evento neste dia</p>
                                {PAYDAY_DAYS.includes(selectedDate.getDate()) && !onNavigateToAllocation && (
                                    <p className="text-xs text-axxy-primary mt-2">📅 Dia de pagamento da quinzena</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Clique em um dia para ver os detalhes</p>
                            </div>
                        )}
                    </div>

                    {/* AI Insights */}
                    {showAIInsights && (
                        <div className="bg-gradient-to-br from-purple-900/30 to-axxy-card rounded-3xl border border-purple-500/30 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Sparkles size={20} className="text-purple-400" />
                                    Insights da IA
                                </h4>
                                <button
                                    onClick={fetchAIInsights}
                                    disabled={isLoadingAI}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={isLoadingAI ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {isLoadingAI ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : aiInsights.length > 0 ? (
                                <div className="space-y-3">
                                    {aiInsights.map((insight, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-xl border ${insight.type === 'warning'
                                                ? 'bg-yellow-500/10 border-yellow-500/30'
                                                : insight.type === 'success'
                                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                                    : 'bg-blue-500/10 border-blue-500/30'
                                                }`}
                                        >
                                            <p className={`font-medium text-sm ${insight.type === 'warning'
                                                ? 'text-yellow-400'
                                                : insight.type === 'success'
                                                    ? 'text-emerald-400'
                                                    : 'text-blue-400'
                                                }`}>
                                                {insight.title}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{insight.description}</p>
                                            {insight.action && (
                                                <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                                                    <Lightbulb size={12} />
                                                    {insight.action}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhum insight disponível</p>
                            )}
                        </div>
                    )}

                    {/* Legenda */}
                    <div className="bg-axxy-card rounded-2xl border border-axxy-border p-4">
                        <h5 className="text-sm font-medium text-gray-400 mb-3">Legenda</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(EVENT_COLORS).map(([type, colors]) => (
                                <div key={type} className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${colors.bg} border ${colors.border}`} />
                                    <span className="text-gray-400 capitalize">
                                        {type === 'income' ? 'Receita' : type === 'expense' ? 'Despesa' : type === 'debt' ? 'Dívida' : type === 'goal' ? 'Meta' : 'Recorrente'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
