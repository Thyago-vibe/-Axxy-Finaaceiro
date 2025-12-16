
import { Transaction, Goal, UserProfile, Budget, BudgetItem, Account, Category, Debt, Alert, LeakageAnalysis, ReportData, PredictionBaseData, NetWorthDashboardData, Asset, Liability, CreateCategoryDTO } from '../types';

const API_URL = 'http://localhost:8000/api';

const headers = {
  'Content-Type': 'application/json',
};

// Classe de erro customizada para erros de API
class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// Helper centralizado para tratamento de respostas da API
async function handleApiResponse<T>(response: Response, fallback?: T): Promise<T> {
  if (!response.ok) {
    // Se tem fallback, retorna silenciosamente
    if (fallback !== undefined) {
      console.warn(`API Error ${response.status}: returning fallback`);
      return fallback;
    }
    // Senão, lança erro com detalhes
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const apiService = {
  // --- Profile ---
  getProfile: async (): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/profile/`);
    return handleApiResponse(res);
  },
  updateProfile: async (profile: UserProfile): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/profile/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
    return handleApiResponse(res);
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch(`${API_URL}/transactions/`);
    return handleApiResponse(res, []);
  },
  createTransaction: async (t: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const res = await fetch(`${API_URL}/transactions/`, { method: 'POST', headers, body: JSON.stringify(t) });
    return handleApiResponse(res);
  },
  updateTransaction: async (id: string | number, t: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const res = await fetch(`${API_URL}/transactions/${id}/`, { method: 'PUT', headers, body: JSON.stringify(t) });
    return handleApiResponse(res);
  },
  deleteTransaction: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/transactions/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Goals ---
  getGoals: async (): Promise<Goal[]> => {
    const res = await fetch(`${API_URL}/goals/`);
    return handleApiResponse(res, []);
  },
  createGoal: async (g: Goal): Promise<Goal> => {
    const res = await fetch(`${API_URL}/goals/`, { method: 'POST', headers, body: JSON.stringify(g) });
    return handleApiResponse(res);
  },
  updateGoal: async (g: Goal): Promise<Goal> => {
    const res = await fetch(`${API_URL}/goals/${g.id}/`, { method: 'PUT', headers, body: JSON.stringify(g) });
    return handleApiResponse(res);
  },
  deleteGoal: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/goals/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Accounts ---
  getAccounts: async (): Promise<Account[]> => {
    const res = await fetch(`${API_URL}/accounts/`);
    return handleApiResponse(res, []);
  },
  createAccount: async (a: Omit<Account, 'id'>): Promise<Account> => {
    const res = await fetch(`${API_URL}/accounts/`, { method: 'POST', headers, body: JSON.stringify(a) });
    return handleApiResponse(res);
  },
  updateAccount: async (id: string | number, a: Omit<Account, 'id'>): Promise<Account> => {
    const res = await fetch(`${API_URL}/accounts/${id}/`, { method: 'PUT', headers, body: JSON.stringify(a) });
    return handleApiResponse(res);
  },
  deleteAccount: async (id: string | number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/accounts/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Budgets ---
  getBudgets: async (): Promise<Budget[]> => {
    const res = await fetch(`${API_URL}/budgets/`);
    return handleApiResponse(res, []);
  },
  createBudget: async (b: Omit<Budget, 'id'>): Promise<Budget> => {
    const res = await fetch(`${API_URL}/budgets/`, { method: 'POST', headers, body: JSON.stringify(b) });
    return handleApiResponse(res);
  },
  deleteBudget: async (id: string | number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/budgets/${id}/`, { method: 'DELETE' });
    return res.ok;
  },
  updateBudget: async (id: string | number, b: Partial<Omit<Budget, 'id'>>): Promise<Budget> => {
    const res = await fetch(`${API_URL}/budgets/${id}/`, { method: 'PUT', headers, body: JSON.stringify(b) });
    return handleApiResponse(res);
  },
  suggestBudgetCategory: async (description: string, amount?: number): Promise<{ suggestedCategory: string; confidence: number }> => {
    const res = await fetch(`${API_URL}/budgets/suggest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ description, amount })
    });
    return handleApiResponse(res);
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
    return handleApiResponse(res);
  },

  // --- Budget Items (Subcategorias) ---
  getBudgetItems: async (budgetId: string | number): Promise<BudgetItem[]> => {
    const res = await fetch(`${API_URL}/budgets/${budgetId}/items`);
    return handleApiResponse(res, []);
  },
  createBudgetItem: async (budgetId: string | number, item: Omit<BudgetItem, 'id' | 'budget_id'>): Promise<BudgetItem> => {
    const res = await fetch(`${API_URL}/budgets/${budgetId}/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(item)
    });
    return handleApiResponse(res);
  },
  updateBudgetItem: async (budgetId: string | number, itemId: string | number, item: BudgetItem): Promise<BudgetItem> => {
    const res = await fetch(`${API_URL}/budgets/${budgetId}/items/${itemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(item)
    });
    return handleApiResponse(res);
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
    return handleApiResponse(res, []);
  },
  createCategory: async (c: CreateCategoryDTO): Promise<Category> => {
    const res = await fetch(`${API_URL}/categories/`, { method: 'POST', headers, body: JSON.stringify(c) });
    return handleApiResponse(res);
  },
  updateCategory: async (id: string | number, c: Category): Promise<Category> => {
    const res = await fetch(`${API_URL}/categories/${id}/`, { method: 'PUT', headers, body: JSON.stringify(c) });
    return handleApiResponse(res);
  },
  deleteCategory: async (id: string | number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/categories/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Financial Health (Debts) ---
  getDebts: async (): Promise<Debt[]> => {
    const res = await fetch(`${API_URL}/debts/`);
    return handleApiResponse(res, []);
  },
  createDebt: async (d: Omit<Debt, 'id'>): Promise<Debt> => {
    const res = await fetch(`${API_URL}/debts/`, { method: 'POST', headers, body: JSON.stringify(d) });
    return handleApiResponse(res);
  },
  updateDebt: async (id: string | number, d: Debt): Promise<Debt> => {
    const res = await fetch(`${API_URL}/debts/${id}/`, { method: 'PUT', headers, body: JSON.stringify(d) });
    return handleApiResponse(res);
  },
  deleteDebt: async (id: string | number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/debts/${id}/`, { method: 'DELETE' });
    return res.ok;
  },
  payDebt: async (debtId: number, amount: number, accountId: number, date: string): Promise<any> => {
    const res = await fetch(`${API_URL}/debts/${debtId}/pay/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount, accountId, date })
    });
    return handleApiResponse(res);
  },

  // --- Alerts ---
  getAlerts: async (): Promise<Alert[]> => {
    const res = await fetch(`${API_URL}/alerts/`);
    return handleApiResponse(res, []);
  },
  updateAlert: async (a: Alert): Promise<Alert> => {
    const res = await fetch(`${API_URL}/alerts/${a.id}/`, { method: 'PUT', headers, body: JSON.stringify(a) });
    return handleApiResponse(res);
  },

  // --- AI Leakage Analysis ---
  getLeakageAnalysis: async (): Promise<LeakageAnalysis> => {
    const res = await fetch(`${API_URL}/leakage-analysis/`);
    return handleApiResponse(res, { totalPotential: 0, leaksCount: 0, period: '-', suggestions: [] });
  },

  // --- Reports ---
  getReports: async (range: string, account: string): Promise<ReportData> => {
    const params = new URLSearchParams({ range, account });
    const res = await fetch(`${API_URL}/reports/?${params}`);
    return handleApiResponse(res);
  },

  // Cash Flow (Fluxo de Caixa)
  // Cash Flow (Fluxo de Caixa)
  getCashFlow: async (range: string, account: string = 'all'): Promise<{ month: string; income: number; expense: number; balance: number }[]> => {
    const params = new URLSearchParams({ date_range: range, account });
    const res = await fetch(`${API_URL}/reports/cash-flow/?${params}`);
    return handleApiResponse(res, []);
  },

  // Spending Trends (Tendências de Gastos)
  // Spending Trends (Tendências de Gastos)
  getSpendingTrends: async (range: string, account: string = 'all'): Promise<{ month: string; value: number; change: number }[]> => {
    const params = new URLSearchParams({ date_range: range, account });
    const res = await fetch(`${API_URL}/reports/spending-trends/?${params}`);
    return handleApiResponse(res, []);
  },

  // Income Sources (Receitas por Fonte)
  // Income Sources (Receitas por Fonte)
  getIncomeSources: async (range: string, account: string = 'all'): Promise<{ name: string; value: number; percentage: number; color: string }[]> => {
    const params = new URLSearchParams({ date_range: range, account });
    const res = await fetch(`${API_URL}/reports/income-sources/?${params}`);
    return handleApiResponse(res, []);
  },

  // --- Backup & Restauração ---
  exportBackup: async (): Promise<any> => {
    const res = await fetch(`${API_URL}/backup/export`);
    return handleApiResponse(res);
  },

  importBackup: async (backupData: any): Promise<{ success: boolean; message: string; imported?: any }> => {
    const res = await fetch(`${API_URL}/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    return handleApiResponse(res);
  },



  // --- Predictive Analysis ---
  getPredictiveAnalysis: async (): Promise<PredictionBaseData> => {
    const res = await fetch(`${API_URL}/predictive-analysis/`);
    return handleApiResponse(res);
  },

  // --- Net Worth (Patrimônio Líquido) ---
  getNetWorth: async (): Promise<NetWorthDashboardData> => {
    const res = await fetch(`${API_URL}/net-worth/`);
    return handleApiResponse(res);
  },
  createAsset: async (asset: Asset): Promise<Asset> => {
    const res = await fetch(`${API_URL}/assets/`, { method: 'POST', headers, body: JSON.stringify(asset) });
    return handleApiResponse(res);
  },
  updateAsset: async (id: string | number, asset: Asset): Promise<Asset> => {
    const res = await fetch(`${API_URL}/assets/${id}/`, { method: 'PUT', headers, body: JSON.stringify(asset) });
    return handleApiResponse(res);
  },
  deleteAsset: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/assets/${id}/`, { method: 'DELETE' });
    return res.ok;
  },
  createLiability: async (l: Liability): Promise<Liability> => {
    const res = await fetch(`${API_URL}/liabilities/`, { method: 'POST', headers, body: JSON.stringify(l) });
    return handleApiResponse(res);
  },
  updateLiability: async (id: string | number, l: Liability): Promise<Liability> => {
    const res = await fetch(`${API_URL}/liabilities/${id}/`, { method: 'PUT', headers, body: JSON.stringify(l) });
    return handleApiResponse(res);
  },
  deleteLiability: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/liabilities/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Net Worth Goals (Metas de Patrimônio) ---
  getNetWorthGoals: async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/net-worth/goals/`);
    return handleApiResponse(res, []);
  },
  getActiveNetWorthGoal: async (): Promise<{ goal: any; progress: number; remaining: number } | null> => {
    const res = await fetch(`${API_URL}/net-worth/goals/active`);
    return handleApiResponse(res, null);
  },
  createNetWorthGoal: async (goal: { name: string; target_amount: number; deadline?: string; is_active?: boolean }): Promise<any> => {
    const res = await fetch(`${API_URL}/net-worth/goals/`, { method: 'POST', headers, body: JSON.stringify(goal) });
    return handleApiResponse(res);
  },
  updateNetWorthGoal: async (id: number, goal: { name: string; target_amount: number; deadline?: string; is_active?: boolean }): Promise<any> => {
    const res = await fetch(`${API_URL}/net-worth/goals/${id}/`, { method: 'PUT', headers, body: JSON.stringify(goal) });
    return handleApiResponse(res);
  },
  deleteNetWorthGoal: async (id: number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/net-worth/goals/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Net Worth AI Insight ---
  getNetWorthAIInsight: async (): Promise<{ success: boolean; insight: { insight_title: string; insight_message: string; action_text: string; priority: string; category: string } }> => {
    const res = await fetch(`${API_URL}/net-worth/ai-insight/`);
    return handleApiResponse(res);
  },

  // --- AI Settings ---
  getAISettings: async (): Promise<{ api_key: string; instructions: string; is_connected: boolean; last_tested: string | null; model_name?: string; provider?: string }> => {
    const res = await fetch(`${API_URL}/config/ai`);
    return handleApiResponse(res);
  },
  saveAISettings: async (data: { api_key: string; instructions: string }): Promise<any> => {
    const res = await fetch(`${API_URL}/config/ai`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return handleApiResponse(res);
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
    return handleApiResponse(res);
  },

  // Calculate AI Priorities
  calculatePriorities: async (): Promise<any> => {
    const res = await fetch(`${API_URL}/budgets/calculate-priorities`, {
      method: 'POST',
      headers
    });
    return handleApiResponse(res);
  },

  // --- Paycheck Allocation ---
  getAllocationSuggestion: async (amount: number, date: string): Promise<any> => {
    const res = await fetch(`${API_URL}/allocation/suggest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paycheck_amount: amount, paycheck_date: date })
    });
    return handleApiResponse(res);
  },

  applyAllocation: async (allocationId: number): Promise<any> => {
    const res = await fetch(`${API_URL}/allocation/apply`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ allocation_id: allocationId })
    });
    return handleApiResponse(res);
  },

  getAllocationHistory: async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/allocation/history`);
    return handleApiResponse(res, []);
  },

  // --- Factory Reset ---
  factoryReset: async (): Promise<{ success: boolean; message: string; deleted?: Record<string, number> }> => {
    const res = await fetch(`${API_URL}/system/reset`, {
      method: 'POST',
      headers
    });
    return handleApiResponse(res);
  }
};
