
import { Transaction, Goal, UserProfile, Budget, BudgetItem, Account, Category, Debt, Alert, LeakageAnalysis, ReportData, InterconnectedSummaryData, PredictionBaseData, NetWorthDashboardData, Asset, Liability } from '../types';

const API_URL = 'http://localhost:8000/api';

const headers = {
  'Content-Type': 'application/json',
};

export const apiService = {
  // --- Profile ---
  getProfile: async (): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/profile/`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },
  updateProfile: async (profile: UserProfile): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/profile/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
    return res.json();
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch(`${API_URL}/transactions/`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },
  createTransaction: async (t: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const res = await fetch(`${API_URL}/transactions/`, { method: 'POST', headers, body: JSON.stringify(t) });
    return res.json();
  },
  deleteTransaction: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/transactions/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Goals ---
  getGoals: async (): Promise<Goal[]> => {
    const res = await fetch(`${API_URL}/goals/`);
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },
  createGoal: async (g: Goal): Promise<Goal> => {
    const res = await fetch(`${API_URL}/goals/`, { method: 'POST', headers, body: JSON.stringify(g) });
    return res.json();
  },
  updateGoal: async (g: Goal): Promise<Goal> => {
    const res = await fetch(`${API_URL}/goals/${g.id}/`, { method: 'PUT', headers, body: JSON.stringify(g) });
    return res.json();
  },
  deleteGoal: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/goals/${id}/`, { method: 'DELETE' });
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
  updateAccount: async (id: string | number, a: Omit<Account, 'id'>): Promise<Account> => {
    const res = await fetch(`${API_URL}/accounts/${id}/`, { method: 'PUT', headers, body: JSON.stringify(a) });
    return res.json();
  },
  deleteAccount: async (id: string | number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/accounts/${id}/`, { method: 'DELETE' });
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
  deleteBudget: async (id: string | number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/budgets/${id}/`, { method: 'DELETE' });
    return res.ok;
  },
  updateBudget: async (id: string | number, b: Partial<Omit<Budget, 'id'>>): Promise<Budget> => {
    const res = await fetch(`${API_URL}/budgets/${id}/`, { method: 'PUT', headers, body: JSON.stringify(b) });
    return res.json();
  },
  suggestBudgetCategory: async (description: string, amount?: number): Promise<{ suggestedCategory: string; confidence: number }> => {
    const res = await fetch(`${API_URL}/budgets/suggest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ description, amount })
    });
    return res.json();
  },
  calculateBudgetLimit: async (data: { category: string; priority: string; goal?: string; goal_amount?: number }): Promise<{
    suggested_limit: number;
    available_monthly: number;
    total_balance: number;
    monthly_category_avg: number;
    months_to_goal: number | null;
    goal_amount: number;
    reasoning: string[];
    insights: { type: string; message: string }[];
    explanation: string;
  }> => {
    const res = await fetch(`${API_URL}/budgets/calculate-limit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Budget Items (Subcategorias) ---
  getBudgetItems: async (budgetId: string | number): Promise<BudgetItem[]> => {
    const res = await fetch(`${API_URL}/budgets/${budgetId}/items`);
    if (!res.ok) return [];
    return res.json();
  },
  createBudgetItem: async (budgetId: string | number, item: Omit<BudgetItem, 'id' | 'budget_id'>): Promise<BudgetItem> => {
    const res = await fetch(`${API_URL}/budgets/${budgetId}/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(item)
    });
    return res.json();
  },
  updateBudgetItem: async (budgetId: string | number, itemId: string | number, item: BudgetItem): Promise<BudgetItem> => {
    const res = await fetch(`${API_URL}/budgets/${budgetId}/items/${itemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(item)
    });
    return res.json();
  },
  deleteBudgetItem: async (budgetId: string | number, itemId: string | number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/budgets/${budgetId}/items/${itemId}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  // --- Categories ---
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${API_URL}/categories/`);
    if (!res.ok) return [];
    return res.json();
  },
  createCategory: async (c: Category): Promise<Category> => {
    const res = await fetch(`${API_URL}/categories/`, { method: 'POST', headers, body: JSON.stringify(c) });
    return res.json();
  },

  // --- Financial Health (Debts) ---
  getDebts: async (): Promise<Debt[]> => {
    const res = await fetch(`${API_URL}/debts/`);
    if (!res.ok) return [];
    return res.json();
  },
  createDebt: async (d: Debt): Promise<Debt> => {
    const res = await fetch(`${API_URL}/debts/`, { method: 'POST', headers, body: JSON.stringify(d) });
    return res.json();
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

  // --- AI Leakage Analysis ---
  getLeakageAnalysis: async (): Promise<LeakageAnalysis> => {
    const res = await fetch(`${API_URL}/leakage-analysis/`);
    if (!res.ok) return { totalPotential: 0, leaksCount: 0, period: '-', suggestions: [] };
    return res.json();
  },

  // --- Reports ---
  getReports: async (range: string, account: string): Promise<ReportData> => {
    const params = new URLSearchParams({ range, account });
    const res = await fetch(`${API_URL}/reports/?${params}`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  // --- Interconnected Summary ---
  getInterconnectedSummary: async (): Promise<InterconnectedSummaryData> => {
    const res = await fetch(`${API_URL}/interconnected-summary/`);
    if (!res.ok) throw new Error('Failed to fetch summary');
    return res.json();
  },

  // --- Predictive Analysis ---
  getPredictiveAnalysis: async (): Promise<PredictionBaseData> => {
    const res = await fetch(`${API_URL}/predictive-analysis/`);
    if (!res.ok) throw new Error('Failed to fetch predictive data');
    return res.json();
  },

  // --- Net Worth (Patrimônio Líquido) ---
  getNetWorth: async (): Promise<NetWorthDashboardData> => {
    const res = await fetch(`${API_URL}/net-worth/`);
    if (!res.ok) throw new Error('Failed to fetch net worth data');
    return res.json();
  },
  createAsset: async (asset: Asset): Promise<Asset> => {
    const res = await fetch(`${API_URL}/assets/`, { method: 'POST', headers, body: JSON.stringify(asset) });
    return res.json();
  },
  deleteAsset: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/assets/${id}/`, { method: 'DELETE' });
    return res.ok;
  },
  createLiability: async (l: Liability): Promise<Liability> => {
    const res = await fetch(`${API_URL}/liabilities/`, { method: 'POST', headers, body: JSON.stringify(l) });
    return res.json();
  },
  deleteLiability: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/liabilities/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- AI Settings ---
  getAISettings: async (): Promise<{ api_key: string; instructions: string; is_connected: boolean; last_tested: string | null; model_name?: string; provider?: string }> => {
    const res = await fetch(`${API_URL}/config/ai`);
    if (!res.ok) throw new Error('Failed to fetch AI settings');
    return res.json();
  },
  saveAISettings: async (data: { api_key: string; instructions: string }): Promise<any> => {
    const res = await fetch(`${API_URL}/config/ai`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },
  testAIConnection: async (): Promise<{ status: string; message: string; response_time: string; ai_response: string } | null> => {
    const res = await fetch(`${API_URL}/ai/test`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Connection failed');
    }
    return res.json();
  },

  // Auto Allocate Budgets
  autoAllocateBudgets: async (availableAmount: number): Promise<any> => {
    const res = await fetch(`${API_URL}/budgets/allocate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ availableAmount })
    });
    if (!res.ok) throw new Error('Failed to allocate budgets');
    return res.json();
  },

  // Calculate AI Priorities
  calculatePriorities: async (): Promise<any> => {
    const res = await fetch(`${API_URL}/budgets/calculate-priorities`, {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error('Failed to calculate priorities');
    return res.json();
  }
};
