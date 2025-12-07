
export interface Transaction {
  id: string | number;
  accountId?: string | number; // Optional for compatibility with old data
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  status: 'completed' | 'pending';
}

export type CreateTransactionDTO = Omit<Transaction, 'id'>;


export interface Account {
  id: string | number;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
}

export type CreateAccountDTO = Omit<Account, 'id'>;

export interface Category {
  id: string;
  name: string;
  type: 'Receita' | 'Despesa';
  color: string;
}

export interface Goal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  deadline: string;
  color: string;
  imageUrl?: string; // Added for Summary view
}

export interface Budget {
  id: string;
  category: string;
  spent: number;
  limit: number;
  icon: string;
  priority?: string; // 'essencial' | 'alto' | 'medio' | 'baixo'
  goal?: string | null; // Objetivo do orçamento
}

export interface BudgetItem {
  id: string | number;
  budget_id: string | number;
  name: string;
  target_amount: number;
  spent: number;
  completed: boolean;
}


export interface Debt {
  id: string;
  name: string;
  remaining: number;
  monthly: number;
  dueDate: string;
  status: 'Em dia' | 'Pendente' | 'Atrasado';
  isUrgent?: boolean; // Added for Summary view logic
}

export interface Alert {
  id: string;
  category: string;
  budget: number;
  threshold: number;
  enabled: boolean;
  iconName: string;
  colorClass: string;
}

export interface AISuggestion {
  item: string;
  category: string;
  savingPotential: number;
  action: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export interface LeakageSuggestion {
  id: string;
  title: string;
  description: string;
  amount: number;
  actionLabel: string;
  category: 'subscription' | 'impulse' | 'fees' | 'general';
}

export interface LeakageAnalysis {
  totalPotential: number;
  leaksCount: number;
  period: string;
  suggestions: LeakageSuggestion[];
}

// --- New Types for Reports & Summary ---

export interface ReportCategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

export interface ReportKPI {
  totalSpent: number;
  totalSpentChange: number; // percentage
  topCategory: string;
  topCategoryValue: number;
  transactionCount: number;
  transactionCountChange: number; // percentage
}

export interface ReportData {
  kpi: ReportKPI;
  distribution: ReportCategoryData[];
}

export interface InterconnectedSummaryData {
  activeGoals: Goal[];
  upcomingDebts: Debt[];
  insights: {
    bestDecisions: string[];
    suggestedCuts: {
      text: string;
      value: number;
    }[];
  };
}

export interface PredictionScenario {
  id: number;
  label: string;
  savings: number;
  checked: boolean;
  iconName: string; // 'ShoppingBag', 'Clapperboard', 'Car'
  color: string;
}

export interface PredictionBaseData {
  currentBalance: number;
  monthlyIncome: number;
  baseExpense: number;
  scenarios: PredictionScenario[];
}

// --- New Types for Net Worth ---

export interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  iconType: 'home' | 'car' | 'investment' | 'other';
}

export interface Liability {
  id: string;
  name: string;
  type: string;
  value: number;
  iconType: 'loan' | 'card' | 'debt' | 'other';
}

export interface NetWorthDashboardData {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assets: Asset[];
  liabilities: Liability[];
  history: { month: string; value: number }[]; // For evolution chart
  composition: { name: string; value: number; color: string }[]; // For pie chart
}
