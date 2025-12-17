import { Transaction, Goal, UserProfile, Budget, Account, Category, Debt, Alert, LeakageAnalysis, ReportData, PredictionBaseData, Asset, Liability, NetWorthGoal, LifeProject, ProjectTask, BudgetItem } from '../types';
import { djangoService } from './djangoService';

const API_URL = 'http://localhost:8000/api';

const headers = {
    'Content-Type': 'application/json',
};

export const apiService = {
    // Re-export all from djangoService
    ...djangoService,

    // --- Transactions ---
    getTransactions: async (): Promise<Transaction[]> => {
        const res = await fetch(`${API_URL}/transactions/`);
        if (!res.ok) return [];
        return res.json();
    },
    createTransaction: async (t: Omit<Transaction, 'id'>): Promise<Transaction> => {
        const res = await fetch(`${API_URL}/transactions/`, { method: 'POST', headers, body: JSON.stringify(t) });
        return res.json();
    },
    updateTransaction: async (id: string | number, t: Omit<Transaction, 'id'>): Promise<Transaction> => {
        const res = await fetch(`${API_URL}/transactions/${id}/`, { method: 'PUT', headers, body: JSON.stringify(t) });
        return res.json();
    },
    deleteTransaction: async (id: string | number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/transactions/${id}/`, { method: 'DELETE' });
        return res.ok;
    },

    // --- Accounts ---
    getAccounts: async (): Promise<Account[]> => {
        const res = await fetch(`${API_URL}/accounts/`);
        if (!res.ok) return [];
        return res.json();
    },
    createAccount: async (a: Omit<Account, 'id'>): Promise<Account> => {
        const res = await fetch(`${API_URL}/accounts/`, { method: 'POST', headers, body: JSON.stringify(a) });
        return res.json();
    },
    updateAccount: async (id: string | number, a: Partial<Account>): Promise<Account> => {
        const res = await fetch(`${API_URL}/accounts/${id}/`, { method: 'PUT', headers, body: JSON.stringify(a) });
        return res.json();
    },
    deleteAccount: async (id: string | number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/accounts/${id}/`, { method: 'DELETE' });
        return res.ok;
    },

    // --- Categories ---
    getCategories: async (): Promise<Category[]> => {
        const res = await fetch(`${API_URL}/categories/`);
        if (!res.ok) return [];
        return res.json();
    },
    createCategory: async (c: Omit<Category, 'id'>): Promise<Category> => {
        const res = await fetch(`${API_URL}/categories/`, { method: 'POST', headers, body: JSON.stringify(c) });
        return res.json();
    },
    updateCategory: async (id: string | number, c: Partial<Category>): Promise<Category> => {
        const res = await fetch(`${API_URL}/categories/${id}/`, { method: 'PUT', headers, body: JSON.stringify(c) });
        return res.json();
    },
    deleteCategory: async (id: string | number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/categories/${id}/`, { method: 'DELETE' });
        return res.ok;
    },

    // --- Debts ---
    getDebts: async (): Promise<Debt[]> => {
        const res = await fetch(`${API_URL}/debts/`);
        if (!res.ok) return [];
        return res.json();
    },
    createDebt: async (d: Omit<Debt, 'id'>): Promise<Debt> => {
        const res = await fetch(`${API_URL}/debts/`, { method: 'POST', headers, body: JSON.stringify(d) });
        return res.json();
    },
    updateDebt: async (id: number, d: Debt): Promise<Debt> => {
        const res = await fetch(`${API_URL}/debts/${id}/`, { method: 'PUT', headers, body: JSON.stringify(d) });
        return res.json();
    },
    deleteDebt: async (id: number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/debts/${id}/`, { method: 'DELETE' });
        return res.ok;
    },
    payDebt: async (debtId: number, amount: number, accountId: number, date: string): Promise<any> => {
        const res = await fetch(`${API_URL}/debts/${debtId}/pay/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount, account_id: accountId, date })
        });
        return res.json();
    },

    // --- Goals ---
    getGoals: async (): Promise<Goal[]> => {
        const res = await fetch(`${API_URL}/goals/`);
        if (!res.ok) return [];
        return res.json();
    },
    createGoal: async (g: Omit<Goal, 'id'>): Promise<Goal> => {
        const res = await fetch(`${API_URL}/goals/`, { method: 'POST', headers, body: JSON.stringify(g) });
        return res.json();
    },
    updateGoal: async (g: Goal): Promise<Goal> => {
        const res = await fetch(`${API_URL}/goals/${g.id}/`, { method: 'PUT', headers, body: JSON.stringify(g) });
        return res.json();
    },
    deleteGoal: async (id: string | number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/goals/${id}/`, { method: 'DELETE' });
        return res.ok;
    },

    // --- Budgets ---
    getBudgets: async (): Promise<Budget[]> => {
        const res = await fetch(`${API_URL}/budgets/`);
        if (!res.ok) return [];
        return res.json();
    },
    createBudget: async (b: Omit<Budget, 'id'>): Promise<Budget> => {
        const res = await fetch(`${API_URL}/budgets/`, { method: 'POST', headers, body: JSON.stringify(b) });
        return res.json();
    },
    updateBudget: async (id: string | number, b: Partial<Budget>): Promise<Budget> => {
        const res = await fetch(`${API_URL}/budgets/${id}/`, { method: 'PUT', headers, body: JSON.stringify(b) });
        return res.json();
    },
    deleteBudget: async (id: string | number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/budgets/${id}/`, { method: 'DELETE' });
        return res.ok;
    },
    calculatePriorities: async (): Promise<any> => {
        const res = await fetch(`${API_URL}/budgets/calculate-priorities/`, { method: 'POST', headers });
        return res.json();
    },
    calculateBudgetLimit: async (data: { budget_id: number; amount?: number }): Promise<any> => {
        const res = await fetch(`${API_URL}/budgets/calculate-limit/`, { method: 'POST', headers, body: JSON.stringify(data) });
        return res.json();
    },

    // --- Budget Items ---
    getBudgetItems: async (budgetId: number): Promise<BudgetItem[]> => {
        const res = await fetch(`${API_URL}/budgets/${budgetId}/items/`);
        if (!res.ok) return [];
        return res.json();
    },
    createBudgetItem: async (budgetId: number, item: Omit<BudgetItem, 'id'>): Promise<BudgetItem> => {
        const res = await fetch(`${API_URL}/budgets/${budgetId}/items/`, { method: 'POST', headers, body: JSON.stringify(item) });
        return res.json();
    },
    updateBudgetItem: async (budgetId: number, itemId: number, item: Partial<BudgetItem>): Promise<BudgetItem> => {
        const res = await fetch(`${API_URL}/budgets/${budgetId}/items/${itemId}/`, { method: 'PUT', headers, body: JSON.stringify(item) });
        return res.json();
    },
    deleteBudgetItem: async (budgetId: number, itemId: number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/budgets/${budgetId}/items/${itemId}/`, { method: 'DELETE' });
        return res.ok;
    },

    // --- Alerts ---
    getAlerts: async (): Promise<Alert[]> => {
        const res = await fetch(`${API_URL}/alerts/`);
        if (!res.ok) return [];
        return res.json();
    },
    updateAlert: async (a: Alert): Promise<Alert> => {
        const res = await fetch(`${API_URL}/alerts/${a.id}/`, { method: 'PUT', headers, body: JSON.stringify(a) });
        return res.json();
    },

    // --- AI & Analysis ---
    getLeakageAnalysis: async (): Promise<LeakageAnalysis> => {
        const res = await fetch(`${API_URL}/leakage-analysis/`);
        if (!res.ok) return { totalPotential: 0, leaksCount: 0, period: '-', suggestions: [] };
        return res.json();
    },
    getPredictiveAnalysis: async (): Promise<PredictionBaseData> => {
        const res = await fetch(`${API_URL}/predictive-analysis/`);
        if (!res.ok) throw new Error('Failed to fetch predictive data');
        return res.json();
    },
    suggestBudgetCategory: async (description: string, amount?: number): Promise<{ category: string; budget_id?: number }> => {
        const res = await fetch(`${API_URL}/ai/suggest-category/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ description, amount })
        });
        if (!res.ok) return { category: '' };
        return res.json();
    },
    autoAllocateBudgets: async (amount: number): Promise<any> => {
        const res = await fetch(`${API_URL}/ai/auto-allocate/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount })
        });
        return res.json();
    },

    // --- Reports ---
    getReports: async (range: string, account: string): Promise<ReportData> => {
        const params = new URLSearchParams({ range, account });
        const res = await fetch(`${API_URL}/reports/?${params}`);
        if (!res.ok) throw new Error('Failed to fetch reports');
        return res.json();
    },

    // --- AI Settings ---
    getAISettings: async (): Promise<{ api_key: string; instructions: string; provider: string }> => {
        const res = await fetch(`${API_URL}/ai-settings/`);
        if (!res.ok) return { api_key: '', instructions: '', provider: 'openai' };
        return res.json();
    },
    saveAISettings: async (settings: { api_key?: string; instructions?: string; provider?: string }): Promise<any> => {
        const res = await fetch(`${API_URL}/ai-settings/`, { method: 'POST', headers, body: JSON.stringify(settings) });
        return res.json();
    },
    testAIConnection: async (): Promise<{ success: boolean; message: string }> => {
        const res = await fetch(`${API_URL}/ai-settings/test/`, { method: 'POST', headers });
        return res.json();
    },

    // --- Net Worth ---
    getNetWorth: async (): Promise<{ totalAssets: number; totalLiabilities: number; netWorth: number; assets: Asset[]; liabilities: Liability[] }> => {
        const res = await fetch(`${API_URL}/net-worth/`);
        if (!res.ok) return { totalAssets: 0, totalLiabilities: 0, netWorth: 0, assets: [], liabilities: [] };
        return res.json();
    },
    getNetWorthAIInsight: async (): Promise<string> => {
        const res = await fetch(`${API_URL}/net-worth/ai-insight/`);
        if (!res.ok) return '';
        const data = await res.json();
        return data.insight || '';
    },
    getActiveNetWorthGoal: async (): Promise<NetWorthGoal | null> => {
        const res = await fetch(`${API_URL}/net-worth/goal/`);
        if (!res.ok) return null;
        return res.json();
    },
    createAsset: async (asset: Omit<Asset, 'id'>): Promise<Asset> => {
        const res = await fetch(`${API_URL}/assets/`, { method: 'POST', headers, body: JSON.stringify(asset) });
        return res.json();
    },
    updateAsset: async (id: number, asset: Partial<Asset>): Promise<Asset> => {
        const res = await fetch(`${API_URL}/assets/${id}/`, { method: 'PUT', headers, body: JSON.stringify(asset) });
        return res.json();
    },
    deleteAsset: async (id: number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/assets/${id}/`, { method: 'DELETE' });
        return res.ok;
    },
    createLiability: async (liability: Omit<Liability, 'id'>): Promise<Liability> => {
        const res = await fetch(`${API_URL}/liabilities/`, { method: 'POST', headers, body: JSON.stringify(liability) });
        return res.json();
    },
    updateLiability: async (id: number, liability: Partial<Liability>): Promise<Liability> => {
        const res = await fetch(`${API_URL}/liabilities/${id}/`, { method: 'PUT', headers, body: JSON.stringify(liability) });
        return res.json();
    },
    deleteLiability: async (id: number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/liabilities/${id}/`, { method: 'DELETE' });
        return res.ok;
    },
    saveNetWorthGoal: async (goal: Omit<NetWorthGoal, 'id'>): Promise<NetWorthGoal> => {
        const res = await fetch(`${API_URL}/net-worth/goal/`, { method: 'POST', headers, body: JSON.stringify(goal) });
        return res.json();
    },

    // --- Profile ---
    getProfile: async (): Promise<UserProfile> => {
        const res = await fetch(`${API_URL}/profile/`);
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
    },
    updateProfile: async (profile: UserProfile): Promise<UserProfile> => {
        const res = await fetch(`${API_URL}/profile/`, { method: 'POST', headers, body: JSON.stringify(profile) });
        return res.json();
    },

    // --- Backup & Restore ---
    exportBackup: async (): Promise<any> => {
        const res = await fetch(`${API_URL}/backup/export/`);
        return res.json();
    },
    importBackup: async (data: any): Promise<{ success: boolean; message: string }> => {
        const res = await fetch(`${API_URL}/backup/import/`, { method: 'POST', headers, body: JSON.stringify(data) });
        return res.json();
    },

    // --- Settings ---
    factoryReset: async (preserveSettings: boolean): Promise<{ success: boolean; message: string }> => {
        const res = await fetch(`${API_URL}/settings/factory-reset/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ preserve_settings: preserveSettings })
        });
        return res.json();
    },
    clearTransactions: async (): Promise<{ success: boolean; message: string }> => {
        const res = await fetch(`${API_URL}/settings/clear-transactions/`, { method: 'POST', headers });
        return res.json();
    },

    // --- Investments ---
    getInvestments: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/investments/`);
        if (!res.ok) return [];
        return res.json();
    },
    createInvestment: async (data: any): Promise<any> => {
        const res = await fetch(`${API_URL}/investments/`, { method: 'POST', headers, body: JSON.stringify(data) });
        return res.json();
    },
    updateInvestment: async (id: number, data: any): Promise<any> => {
        const res = await fetch(`${API_URL}/investments/${id}/`, { method: 'PUT', headers, body: JSON.stringify(data) });
        return res.json();
    },
    deleteInvestment: async (id: number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/investments/${id}/`, { method: 'DELETE' });
        return res.ok;
    },
    getInvestmentInsight: async (): Promise<string> => {
        const res = await fetch(`${API_URL}/investments/ai-insight/`);
        if (!res.ok) return '';
        const data = await res.json();
        return data.insight || '';
    },
    recordInvestmentMovement: async (investmentId: number, movement: { type: string; amount: number; date: string }): Promise<any> => {
        const res = await fetch(`${API_URL}/investments/${investmentId}/movements/`, { method: 'POST', headers, body: JSON.stringify(movement) });
        return res.json();
    },

    // --- Life Projects ---
    getLifeProjects: async (): Promise<LifeProject[]> => {
        const res = await fetch(`${API_URL}/life-projects/`);
        if (!res.ok) return [];
        return res.json();
    },
    createLifeProject: async (p: Omit<LifeProject, 'id'>): Promise<LifeProject> => {
        const res = await fetch(`${API_URL}/life-projects/`, { method: 'POST', headers, body: JSON.stringify(p) });
        return res.json();
    },
    updateLifeProject: async (id: number, p: Partial<LifeProject>): Promise<LifeProject> => {
        const res = await fetch(`${API_URL}/life-projects/${id}/`, { method: 'PUT', headers, body: JSON.stringify(p) });
        return res.json();
    },
    deleteLifeProject: async (id: number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/life-projects/${id}/`, { method: 'DELETE' });
        return res.ok;
    },
    getProjectTasks: async (projectId: number): Promise<ProjectTask[]> => {
        const res = await fetch(`${API_URL}/life-projects/${projectId}/tasks/`);
        if (!res.ok) return [];
        return res.json();
    },
    createProjectTask: async (projectId: number, task: Omit<ProjectTask, 'id'>): Promise<ProjectTask> => {
        const res = await fetch(`${API_URL}/life-projects/${projectId}/tasks/`, { method: 'POST', headers, body: JSON.stringify(task) });
        return res.json();
    },
    updateProjectTask: async (projectId: number, taskId: number, task: Partial<ProjectTask>): Promise<ProjectTask> => {
        const res = await fetch(`${API_URL}/life-projects/${projectId}/tasks/${taskId}/`, { method: 'PUT', headers, body: JSON.stringify(task) });
        return res.json();
    },
    deleteProjectTask: async (projectId: number, taskId: number): Promise<boolean> => {
        const res = await fetch(`${API_URL}/life-projects/${projectId}/tasks/${taskId}/`, { method: 'DELETE' });
        return res.ok;
    },

    // --- Paycheck Allocation ---
    getPaycheckAllocation: async (): Promise<any> => {
        const res = await fetch(`${API_URL}/paycheck-allocation/`);
        if (!res.ok) return null;
        return res.json();
    },
    savePaycheckAllocation: async (data: any): Promise<any> => {
        const res = await fetch(`${API_URL}/paycheck-allocation/`, { method: 'POST', headers, body: JSON.stringify(data) });
        return res.json();
    },
    getAIAllocationSuggestion: async (amount: number): Promise<any> => {
        const res = await fetch(`${API_URL}/paycheck-allocation/ai-suggest/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount })
        });
        return res.json();
    },
};
