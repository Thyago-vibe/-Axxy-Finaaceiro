import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Sparkles, ChevronRight, Check, Clock, AlertCircle,
    Home, Heart, Plane, Briefcase, Users, Car, Laptop, Package,
    MoreVertical, Trash2, Edit, RefreshCw, Target, Calendar,
    DollarSign, TrendingUp, CheckCircle2, Circle, Loader2
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

// Tipos
interface ProjectTask {
    id: number;
    project_id: number;
    name: string;
    estimated_cost: number;
    actual_cost: number | null;
    priority: 'alta' | 'media' | 'baixa';
    status: 'pendente' | 'em_andamento' | 'concluido';
    notes: string | null;
    due_date: string | null;
}

interface LifeProject {
    id: number;
    name: string;
    category: string;
    icon: string;
    description: string | null;
    total_estimated: number;
    total_spent: number;
    deadline: string | null;
    status: 'ativo' | 'pausado' | 'concluido';
    priority: 'alta' | 'media' | 'baixa';
    tasks: ProjectTask[];
    tasks_count: number;
    completed_count: number;
    progress: number;
}

interface Category {
    id: string;
    name: string;
    icon: string;
}

// Ícones por categoria
const CATEGORY_ICONS: Record<string, React.ElementType> = {
    casa: Home,
    saude: Heart,
    lazer: Plane,
    carreira: Briefcase,
    familia: Users,
    veiculo: Car,
    tecnologia: Laptop,
    outro: Package,
};

const PRIORITY_COLORS = {
    alta: 'bg-red-500/20 text-red-400 border-red-500/30',
    media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    baixa: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const STATUS_COLORS = {
    pendente: 'text-gray-400',
    em_andamento: 'text-yellow-400',
    concluido: 'text-emerald-400',
};

export const LifeProjects: React.FC = () => {
    // Estados
    const [projects, setProjects] = useState<LifeProject[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [expandedProject, setExpandedProject] = useState<number | null>(null);

    // Modais
    const [showNewProject, setShowNewProject] = useState(false);
    const [showAISuggest, setShowAISuggest] = useState(false);
    const [showAddTask, setShowAddTask] = useState<number | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    // Forms
    const [newProject, setNewProject] = useState({
        name: '',
        category: 'casa',
        description: '',
        deadline: '',
        priority: 'media',
    });

    const [aiDescription, setAiDescription] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<any>(null);

    const [newTask, setNewTask] = useState({
        name: '',
        estimated_cost: 0,
        priority: 'media',
        notes: '',
    });

    // Carregar dados
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [projectsRes, categoriesRes] = await Promise.all([
                fetch('/api/life-projects'),
                fetch('/api/life-projects/categories'),
            ]);

            if (projectsRes.ok) {
                setProjects(await projectsRes.json());
            }
            if (categoriesRes.ok) {
                setCategories(await categoriesRes.json());
            }
        } catch (error) {
            console.error('Erro ao carregar:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filtrar projetos por categoria
    const filteredProjects = useMemo(() => {
        if (!selectedCategory) return projects;
        return projects.filter(p => p.category === selectedCategory);
    }, [projects, selectedCategory]);

    // Resumo geral
    const summary = useMemo(() => {
        const active = projects.filter(p => p.status === 'ativo');
        const totalEstimated = active.reduce((s, p) => s + p.total_estimated, 0);
        const totalSpent = active.reduce((s, p) => s + p.total_spent, 0);
        const highPriority = active.filter(p => p.priority === 'alta').length;

        return { active: active.length, totalEstimated, totalSpent, highPriority };
    }, [projects]);

    // Criar projeto
    const handleCreateProject = async () => {
        try {
            const res = await fetch('/api/life-projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newProject,
                    icon: categories.find(c => c.id === newProject.category)?.icon || '📦',
                }),
            });

            if (res.ok) {
                await loadData();
                setShowNewProject(false);
                setNewProject({ name: '', category: 'casa', description: '', deadline: '', priority: 'media' });
            }
        } catch (error) {
            console.error('Erro ao criar projeto:', error);
        }
    };

    // IA Sugerir etapas
    const handleAISuggest = async () => {
        if (!aiDescription.trim()) return;

        setIsLoadingAI(true);
        try {
            const res = await fetch('/api/life-projects/ai-suggest-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_description: aiDescription,
                    category: newProject.category,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setAiSuggestions(data);
            }
        } catch (error) {
            console.error('Erro na IA:', error);
        } finally {
            setIsLoadingAI(false);
        }
    };

    // Criar projeto com sugestões da IA
    const handleCreateFromAI = async () => {
        if (!aiSuggestions) return;

        try {
            // Criar projeto
            const projectRes = await fetch('/api/life-projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: aiSuggestions.project_name,
                    category: newProject.category,
                    description: aiDescription,
                    icon: categories.find(c => c.id === newProject.category)?.icon || '📦',
                    priority: 'media',
                }),
            });

            if (projectRes.ok) {
                const project = await projectRes.json();

                // Adicionar tarefas sugeridas
                for (const task of aiSuggestions.tasks || []) {
                    await fetch(`/api/life-projects/${project.id}/tasks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(task),
                    });
                }

                await loadData();
                setShowAISuggest(false);
                setAiDescription('');
                setAiSuggestions(null);
            }
        } catch (error) {
            console.error('Erro ao criar:', error);
        }
    };

    // Adicionar tarefa
    const handleAddTask = async (projectId: number) => {
        try {
            const res = await fetch(`/api/life-projects/${projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask),
            });

            if (res.ok) {
                await loadData();
                setShowAddTask(null);
                setNewTask({ name: '', estimated_cost: 0, priority: 'media', notes: '' });
            }
        } catch (error) {
            console.error('Erro:', error);
        }
    };

    // Marcar tarefa como concluída
    const handleCompleteTask = async (taskId: number) => {
        try {
            await fetch(`/api/life-projects/tasks/${taskId}/complete`, { method: 'PUT' });
            await loadData();
        } catch (error) {
            console.error('Erro:', error);
        }
    };

    // Excluir projeto
    const handleDeleteProject = async (projectId: number) => {
        if (!confirm('Excluir este projeto e todas as tarefas?')) return;

        try {
            await fetch(`/api/life-projects/${projectId}`, { method: 'DELETE' });
            await loadData();
        } catch (error) {
            console.error('Erro:', error);
        }
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
                        <Target className="text-axxy-primary" size={32} />
                        Projetos de Vida
                    </h2>
                    <p className="text-gray-400 mt-1">Planeje sua vida. A IA ajuda você a estimar custos e prioridades.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowAISuggest(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-600/30 transition-all"
                    >
                        <Sparkles size={18} />
                        Criar com IA
                    </button>
                    <button
                        onClick={() => setShowNewProject(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-axxy-primary text-black font-bold rounded-xl hover:bg-axxy-primary/90 transition-all shadow-lg shadow-axxy-primary/20"
                    >
                        <Plus size={18} />
                        Novo Projeto
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-axxy-card rounded-2xl border border-axxy-border p-5">
                    <p className="text-gray-400 text-sm">Projetos Ativos</p>
                    <p className="text-2xl font-bold text-white mt-1">{summary.active}</p>
                </div>
                <div className="bg-axxy-card rounded-2xl border border-axxy-border p-5">
                    <p className="text-gray-400 text-sm">Total Estimado</p>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(summary.totalEstimated)}</p>
                </div>
                <div className="bg-axxy-card rounded-2xl border border-axxy-border p-5">
                    <p className="text-gray-400 text-sm">Já Investido</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(summary.totalSpent)}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/10 to-axxy-card rounded-2xl border border-red-500/30 p-5">
                    <p className="text-red-400 text-sm">Alta Prioridade</p>
                    <p className="text-2xl font-bold text-white mt-1">{summary.highPriority}</p>
                </div>
            </div>

            {/* Filtro por Categoria */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${!selectedCategory
                        ? 'bg-axxy-primary text-black'
                        : 'bg-axxy-card text-gray-400 hover:text-white'
                        }`}
                >
                    Todos
                </button>
                {categories.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.id] || Package;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === cat.id
                                ? 'bg-axxy-primary text-black'
                                : 'bg-axxy-card text-gray-400 hover:text-white'
                                }`}
                        >
                            <Icon size={16} />
                            {cat.name}
                        </button>
                    );
                })}
            </div>

            {/* Lista de Projetos */}
            {filteredProjects.length === 0 ? (
                <div className="bg-axxy-card rounded-3xl border border-axxy-border p-12 text-center">
                    <Target size={48} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum projeto ainda</h3>
                    <p className="text-gray-400 mb-6">Crie seu primeiro projeto de vida para começar a planejar!</p>
                    <button
                        onClick={() => setShowAISuggest(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-600/30 transition-all"
                    >
                        <Sparkles size={20} />
                        Criar com ajuda da IA
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredProjects.map(project => {
                        const Icon = CATEGORY_ICONS[project.category] || Package;
                        const isExpanded = expandedProject === project.id;

                        return (
                            <div
                                key={project.id}
                                className="bg-axxy-card rounded-2xl border border-axxy-border overflow-hidden"
                            >
                                {/* Header do Projeto */}
                                <div
                                    className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-axxy-primary/20 flex items-center justify-center text-2xl">
                                                {project.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{project.name}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[project.priority]}`}>
                                                        {project.priority}
                                                    </span>
                                                    <span className="text-sm text-gray-400">
                                                        {project.completed_count}/{project.tasks_count} tarefas
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400">Estimado</p>
                                                <p className="font-bold text-white">{formatCurrency(project.total_estimated)}</p>
                                            </div>

                                            {/* Barra de progresso */}
                                            <div className="w-32 hidden md:block">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-400">Progresso</span>
                                                    <span className="text-axxy-primary font-bold">{project.progress.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-2 bg-axxy-bg rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-axxy-primary rounded-full transition-all"
                                                        style={{ width: `${project.progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <ChevronRight
                                                size={20}
                                                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tarefas (expandido) */}
                                {isExpanded && (
                                    <div className="border-t border-axxy-border">
                                        <div className="p-5 space-y-3">
                                            {project.tasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${task.status === 'concluido'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                                        : 'bg-axxy-bg border-axxy-border hover:border-white/10'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            onClick={() => task.status !== 'concluido' && handleCompleteTask(task.id)}
                                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'concluido'
                                                                ? 'bg-emerald-500 border-emerald-500'
                                                                : 'border-gray-500 hover:border-axxy-primary'
                                                                }`}
                                                        >
                                                            {task.status === 'concluido' && <Check size={14} className="text-white" />}
                                                        </button>
                                                        <div>
                                                            <p className={`font-medium ${task.status === 'concluido' ? 'text-gray-400 line-through' : 'text-white'}`}>
                                                                {task.name}
                                                            </p>
                                                            {task.notes && (
                                                                <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                                                            {task.priority}
                                                        </span>
                                                        <p className={`font-bold ${task.status === 'concluido' ? 'text-emerald-400' : 'text-white'}`}>
                                                            {formatCurrency(task.estimated_cost)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Botão adicionar tarefa */}
                                            {showAddTask === project.id ? (
                                                <div className="p-4 bg-axxy-bg rounded-xl border border-axxy-border space-y-3">
                                                    <input
                                                        type="text"
                                                        value={newTask.name}
                                                        onChange={(e) => setNewTask(p => ({ ...p, name: e.target.value }))}
                                                        placeholder="Nome da tarefa"
                                                        className="w-full bg-axxy-card border border-axxy-border rounded-lg px-4 py-2 text-white"
                                                    />
                                                    <div className="flex gap-3">
                                                        <input
                                                            type="number"
                                                            value={newTask.estimated_cost || ''}
                                                            onChange={(e) => setNewTask(p => ({ ...p, estimated_cost: parseFloat(e.target.value) || 0 }))}
                                                            placeholder="Custo estimado"
                                                            className="flex-1 bg-axxy-card border border-axxy-border rounded-lg px-4 py-2 text-white"
                                                        />
                                                        <select
                                                            value={newTask.priority}
                                                            onChange={(e) => setNewTask(p => ({ ...p, priority: e.target.value }))}
                                                            className="bg-axxy-card border border-axxy-border rounded-lg px-4 py-2 text-white"
                                                        >
                                                            <option value="alta">Alta</option>
                                                            <option value="media">Média</option>
                                                            <option value="baixa">Baixa</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setShowAddTask(null)}
                                                            className="flex-1 py-2 rounded-lg bg-axxy-card text-gray-400"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={() => handleAddTask(project.id)}
                                                            className="flex-1 py-2 rounded-lg bg-axxy-primary text-black font-bold"
                                                        >
                                                            Adicionar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowAddTask(project.id)}
                                                    className="w-full p-3 rounded-xl border border-dashed border-axxy-border text-gray-400 hover:text-white hover:border-axxy-primary transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Plus size={18} />
                                                    Adicionar tarefa
                                                </button>
                                            )}
                                        </div>

                                        {/* Footer do projeto */}
                                        <div className="flex justify-between items-center px-5 py-3 bg-axxy-bg border-t border-axxy-border">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDeleteProject(project.id)}
                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                Gasto: <span className="text-emerald-400 font-bold">{formatCurrency(project.total_spent)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Novo Projeto */}
            {showNewProject && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-axxy-card rounded-3xl border border-axxy-border p-8 w-full max-w-lg animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="text-axxy-primary" />
                            Novo Projeto de Vida
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Nome do Projeto</label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Ex: Reforma da Casa"
                                    className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Categoria</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setNewProject(p => ({ ...p, category: cat.id }))}
                                            className={`p-3 rounded-xl border text-center transition-all ${newProject.category === cat.id
                                                ? 'bg-axxy-primary/20 border-axxy-primary'
                                                : 'bg-axxy-bg border-axxy-border hover:border-white/20'
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">{cat.icon}</span>
                                            <span className="text-xs text-gray-400">{cat.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Descrição (opcional)</label>
                                <textarea
                                    value={newProject.description}
                                    onChange={(e) => setNewProject(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Descreva seu projeto..."
                                    className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white h-20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Prazo (opcional)</label>
                                    <input
                                        type="date"
                                        value={newProject.deadline}
                                        onChange={(e) => setNewProject(p => ({ ...p, deadline: e.target.value }))}
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Prioridade</label>
                                    <select
                                        value={newProject.priority}
                                        onChange={(e) => setNewProject(p => ({ ...p, priority: e.target.value }))}
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white"
                                    >
                                        <option value="alta">Alta</option>
                                        <option value="media">Média</option>
                                        <option value="baixa">Baixa</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowNewProject(false)}
                                className="flex-1 px-4 py-3 bg-axxy-bg border border-axxy-border rounded-xl text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProject.name}
                                className="flex-1 px-4 py-3 bg-axxy-primary text-black font-bold rounded-xl disabled:opacity-50"
                            >
                                Criar Projeto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Criar com IA */}
            {showAISuggest && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-axxy-card rounded-3xl border border-axxy-border p-8 w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Sparkles className="text-purple-400" />
                            Criar Projeto com IA
                        </h3>

                        {!aiSuggestions ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Categoria</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setNewProject(p => ({ ...p, category: cat.id }))}
                                                className={`px-4 py-2 rounded-xl border transition-all ${newProject.category === cat.id
                                                    ? 'bg-purple-600/20 border-purple-500'
                                                    : 'bg-axxy-bg border-axxy-border'
                                                    }`}
                                            >
                                                {cat.icon} {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Descreva o que você quer fazer</label>
                                    <textarea
                                        value={aiDescription}
                                        onChange={(e) => setAiDescription(e.target.value)}
                                        placeholder="Ex: Quero reformar meu quarto, colocar piso novo, pintar as paredes de branco, comprar uma cama box e um guarda-roupa planejado..."
                                        className="w-full bg-axxy-bg border border-axxy-border rounded-xl px-4 py-3 text-white h-32 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowAISuggest(false); setAiDescription(''); }}
                                        className="flex-1 px-4 py-3 bg-axxy-bg border border-axxy-border rounded-xl text-white"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAISuggest}
                                        disabled={!aiDescription.trim() || isLoadingAI}
                                        className="flex-1 px-4 py-3 bg-purple-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoadingAI ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Analisando...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Gerar Plano
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Resultado da IA */}
                                <div className="bg-purple-600/10 rounded-xl p-5 border border-purple-500/30">
                                    <h4 className="font-bold text-white text-lg mb-2">{aiSuggestions.project_name}</h4>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-gray-400">
                                            💰 Total: <span className="text-white font-bold">{formatCurrency(aiSuggestions.total_estimated)}</span>
                                        </span>
                                        <span className="text-gray-400">
                                            📅 Prazo: <span className="text-white font-bold">{aiSuggestions.timeline_months} meses</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Lista de tarefas sugeridas */}
                                <div>
                                    <h4 className="text-white font-bold mb-3">Etapas sugeridas:</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {aiSuggestions.tasks?.map((task: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-axxy-bg rounded-lg border border-axxy-border">
                                                <div>
                                                    <p className="text-white font-medium">{task.name}</p>
                                                    {task.notes && <p className="text-xs text-gray-500">{task.notes}</p>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.media}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className="text-white font-bold">{formatCurrency(task.estimated_cost)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Dicas */}
                                {aiSuggestions.tips?.length > 0 && (
                                    <div className="bg-axxy-bg rounded-xl p-4 border border-axxy-border">
                                        <h4 className="text-yellow-400 font-bold text-sm mb-2">💡 Dicas</h4>
                                        <ul className="text-sm text-gray-400 space-y-1">
                                            {aiSuggestions.tips.map((tip: string, idx: number) => (
                                                <li key={idx}>• {tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setAiSuggestions(null); setAiDescription(''); }}
                                        className="flex-1 px-4 py-3 bg-axxy-bg border border-axxy-border rounded-xl text-white"
                                    >
                                        Refazer
                                    </button>
                                    <button
                                        onClick={handleCreateFromAI}
                                        className="flex-1 px-4 py-3 bg-axxy-primary text-black font-bold rounded-xl"
                                    >
                                        Criar Projeto
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
