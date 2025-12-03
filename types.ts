export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  status: 'completed' | 'pending';
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
}

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
}

export interface Budget {
  id: string;
  category: string;
  spent: number;
  limit: number;
  icon: string;
}

export interface Debt {
  id: string;
  name: string;
  remaining: number;
  monthly: number;
  dueDate: string;
  status: 'Em dia' | 'Pendente' | 'Atrasado';
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