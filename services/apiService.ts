
import { Transaction, Goal, UserProfile, Budget, Account, Category, Debt, Alert, LeakageAnalysis, ReportData, InterconnectedSummaryData, PredictionBaseData } from '../types';

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
  createTransaction: async (t: Transaction): Promise<Transaction> => {
    const res = await fetch(`${API_URL}/transactions/`, { method: 'POST', headers, body: JSON.stringify(t) });
    return res.json();
  },
  deleteTransaction: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/transactions/${id}/`, { method: 'DELETE' });
    return res.ok;
  },
  updateTransaction: async (t: Transaction): Promise<Transaction> => {
    const res = await fetch(`${API_URL}/transactions/${t.id}/`, { method: 'PUT', headers, body: JSON.stringify(t) });
    return res.json();
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
  createAccount: async (a: Account): Promise<Account> => {
    const res = await fetch(`${API_URL}/accounts/`, { method: 'POST', headers, body: JSON.stringify(a) });
    return res.json();
  },
  updateAccount: async (a: Account): Promise<Account> => {
    const res = await fetch(`${API_URL}/accounts/${a.id}/`, { method: 'PUT', headers, body: JSON.stringify(a) });
    return res.json();
  },
  deleteAccount: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/accounts/${id}/`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Budgets ---
  getBudgets: async (): Promise<Budget[]> => {
    const res = await fetch(`${API_URL}/budgets/`);
    if (!res.ok) return [];
    return res.json();
  },
  createBudget: async (b: Budget): Promise<Budget> => {
    const res = await fetch(`${API_URL}/budgets/`, { method: 'POST', headers, body: JSON.stringify(b) });
    return res.json();
  },
  updateBudget: async (b: Budget): Promise<Budget> => {
    const res = await fetch(`${API_URL}/budgets/${b.id}/`, { method: 'PUT', headers, body: JSON.stringify(b) });
    return res.json();
  },
  deleteBudget: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/budgets/${id}/`, { method: 'DELETE' });
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
  updateCategory: async (c: Category): Promise<Category> => {
    const res = await fetch(`${API_URL}/categories/${c.id}/`, { method: 'PUT', headers, body: JSON.stringify(c) });
    return res.json();
  },
  deleteCategory: async (id: string | number): Promise<void> => {
    await fetch(`${API_URL}/categories/${id}/`, { method: 'DELETE' });
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
  updateDebt: async (d: Debt): Promise<Debt> => {
    const res = await fetch(`${API_URL}/debts/${d.id}/`, { method: 'PUT', headers, body: JSON.stringify(d) });
    return res.json();
  },
  deleteDebt: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/debts/${id}/`, { method: 'DELETE' });
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
  }
};
