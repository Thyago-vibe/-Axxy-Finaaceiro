
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

export type CreateCategoryDTO = Omit<Category, 'id'>;

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

  // Campos unificados com Metas
  budget_type?: 'expense' | 'goal'; // Tipo: orçamento ou meta
  target_amount?: number | null; // Valor alvo para metas
  current_amount?: number; // Progresso atual (para metas)
  deadline?: string | null; // Prazo final (para metas)
  ai_priority_score?: number | null; // Score IA (0-100)
  ai_priority_reason?: string | null; // Razão da prioridade
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
  id: number;
  name: string;
  remaining: number;
  monthly: number;
  dueDate: string;
  status: 'Em dia' | 'Pendente' | 'Atrasado';
  isUrgent?: boolean;
  debtType: 'fixo' | 'parcelado';
  totalInstallments?: number;  // Total de parcelas (para parcelado)
  currentInstallment?: number; // Parcela atual (para parcelado)
  category?: string; // Categoria da dívida
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

// --- Paycheck Allocation Types ---

export interface AllocationItem {
  name: string;
  amount: number;
  reference_id?: number | null;
  reference_type?: 'debt' | 'goal' | 'budget' | null;
}

export interface AllocationCategory {
  id: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
  items: AllocationItem[];
}

export interface AllocationSuggestion {
  id: number;
  paycheck_amount: number;
  paycheck_date: string;
  categories: AllocationCategory[];
  insights: string[];
  chart_data: { name: string; value: number; color: string }[];
}

export interface PaycheckAllocationHistory {
  id: number;
  paycheck_date: string;
  paycheck_amount: number;
  status: 'draft' | 'applied' | 'cancelled';
  created_at: string;
  categories: { id: string; items: AllocationItem[]; total: number }[];
}

