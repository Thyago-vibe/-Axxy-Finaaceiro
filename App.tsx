import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Accounts } from './components/Accounts';
import { Categories } from './components/Categories';
import { AssistedDecision } from './components/AssistedDecision';
import { Goals } from './components/Goals';
import { Budgets } from './components/Budgets';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { BehavioralAlerts } from './components/BehavioralAlerts';
import { FinancialHealth } from './components/FinancialHealth';
import { InterconnectedSummary } from './components/InterconnectedSummary';
import { PredictiveAnalysis } from './components/PredictiveAnalysis';
import { Transaction, UserProfile } from './types';
import { Bell, Menu } from 'lucide-react';
import { djangoService } from './services/djangoService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', email: '', avatar: '' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Load from Backend
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileData, transactionsData] = await Promise.all([
           djangoService.getProfile().catch(() => ({ name: 'Convidado', email: '', avatar: '' } as UserProfile)),
           djangoService.getTransactions().catch(() => [])
        ]);

        setUserProfile(profileData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error("Erro ao conectar com o backend:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleUpdateProfile = async (newProfile: UserProfile) => {
    try {
        const updated = await djangoService.updateProfile(newProfile);
        setUserProfile(updated);
    } catch (e) {
        console.error("Failed to update profile", e);
    }
  };

  const handleAddTransaction = async (newTransaction: Transaction) => {
    try {
        const created = await djangoService.createTransaction(newTransaction);
        if (created) {
            setTransactions(prev => [created, ...prev]);
            setCurrentView('dashboard');
        }
    } catch (e) {
        console.error("Failed to create transaction", e);
    }
  };

  const renderView = () => {
    if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
              <div className="w-12 h-12 border-4 border-axxy-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Conectando ao servidor...</p>
          </div>
      );
    }

    switch(currentView) {
      case 'dashboard':
        return <Dashboard transactions={transactions} />;
      case 'interconnected-summary':
        return <InterconnectedSummary setView={setCurrentView} />;
      case 'transactions':
        return <Transactions transactions={transactions} onAddTransaction={handleAddTransaction} />;
      case 'budgets':
        return <Budgets />;
      case 'accounts':
        return <Accounts />;
      case 'categories':
        return <Categories />;
      case 'ai-assist':
        return <AssistedDecision />;
      case 'goals':
        return <Goals />;
      case 'financial-health':
        return <FinancialHealth />;
      case 'predictive-analysis':
        return <PredictiveAnalysis />;
      case 'reports':
        return <Reports />;
      case 'alerts':
        return <BehavioralAlerts />;
      case 'settings':
        return <Settings userProfile={userProfile} onUpdateProfile={handleUpdateProfile} />;
      default:
        return <Dashboard transactions={transactions} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b120f] text-gray-200 font-sans">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content: margin-left 64 (16rem) only on large screens */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 transition-all duration-300 w-full">
        <header className="flex justify-between items-center mb-8 gap-4">
           {/* Mobile Hamburger Menu */}
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
           >
             <Menu size={24} />
           </button>

           <div className="flex-1"></div> 
           
           <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={() => setCurrentView('alerts')}
                className="relative p-2 text-gray-400 hover:text-white transition-colors bg-axxy-card rounded-full border border-white/5"
              >
                <Bell size={20} />
              </button>
              
              <div className="flex items-center gap-3 pl-2 border-l border-white/5">
                 <div className="text-right hidden md:block">
                     <p className="text-sm font-bold text-white leading-tight truncate max-w-[150px]">{userProfile.name}</p>
                     <p className="text-xs text-gray-400 truncate max-w-[150px]">{userProfile.email}</p>
                 </div>
                 <div 
                   className="w-10 h-10 rounded-full overflow-hidden border-2 border-axxy-card cursor-pointer hover:border-axxy-primary transition-colors shrink-0"
                   onClick={() => setCurrentView('settings')}
                 >
                    <img src={userProfile.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} alt="User Profile" className="w-full h-full object-cover" />
                 </div>
              </div>
           </div>
        </header>

        {renderView()}
      </main>
    </div>
  );
};

export default App;