from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Query
from sqlmodel import SQLModel, Field, Session, create_engine, select
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import random

# ==========================================
# 1. CONFIGURAÇÃO DO BANCO DE DADOS (SQLite)
# ==========================================
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# Cria a conexão com o banco
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    """Cria o arquivo do banco de dados e as tabelas automaticamente."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Injeção de dependência para obter a sessão do banco."""
    with Session(engine) as session:
        yield session

# ==========================================
# 2. DEFINIÇÃO DOS MODELOS (Tabelas)
# ==========================================
# Nota: Usamos nomes em camelCase (ex: currentAmount) para alinhar com o Frontend React.

class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    avatar: str

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: str
    amount: float
    type: str  # 'income' | 'expense'
    date: str
    category: str
    status: str # 'completed' | 'pending'

class Goal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    currentAmount: float
    targetAmount: float
    deadline: str
    color: str
    imageUrl: Optional[str] = None

class Budget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category: str
    spent: float = 0  # Será calculado automaticamente
    limit: float
    icon: str

class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    balance: float
    color: str
    icon: str

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    color: str

class Debt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    remaining: float
    monthly: float
    dueDate: str
    status: str
    isUrgent: bool = False

class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category: str
    budget: float
    threshold: int
    enabled: bool
    iconName: str
    colorClass: str

# ==========================================
# 3. INICIALIZAÇÃO DA API
# ==========================================
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="Axxy Finance API", lifespan=lifespan)

# Configuração de CORS (Permite que o React acesse este servidor)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], # Explícito para evitar erros com credenciais
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 4. ROTAS DA API (ENDPOINTS)
# ==========================================

# --- PERFIL DO USUÁRIO ---

@app.get("/api/profile/", response_model=UserProfile)
def get_profile(session: Session = Depends(get_session)):
    """Retorna o perfil do usuário. Cria um padrão se não existir."""
    profile = session.exec(select(UserProfile)).first()
    if not profile:
        profile = UserProfile(name="Usuário Axxy", email="usuario@email.com", avatar="")
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return profile

@app.post("/api/profile/", response_model=UserProfile)
def update_profile(profile_data: UserProfile, session: Session = Depends(get_session)):
    """Atualiza ou cria o perfil do usuário."""
    # Como só temos 1 usuário, pegamos o primeiro ou criamos
    current = session.exec(select(UserProfile)).first()
    if current:
        current.name = profile_data.name
        current.email = profile_data.email
        current.avatar = profile_data.avatar
        session.add(current)
        session.commit()
        session.refresh(current)
        return current
    else:
        session.add(profile_data)
        session.commit()
        session.refresh(profile_data)
        return profile_data

# --- TRANSAÇÕES ---

@app.get("/api/transactions/", response_model=List[Transaction])
def read_transactions(session: Session = Depends(get_session)):
    """Lista todas as transações, ordenadas da mais recente para a mais antiga."""
    transactions = session.exec(select(Transaction).order_by(Transaction.id.desc())).all()
    return transactions

@app.post("/api/transactions/", response_model=Transaction)
def create_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    """Cria uma nova transação financeira."""
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction

@app.delete("/api/transactions/{transaction_id}/")
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    """Deleta uma transação pelo ID."""
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    session.delete(transaction)
    session.commit()
    session.commit()
    return {"ok": True}

@app.put("/api/transactions/{transaction_id}/", response_model=Transaction)
def update_transaction(transaction_id: int, transaction_data: Transaction, session: Session = Depends(get_session)):
    """Atualiza uma transação existente."""
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    transaction.description = transaction_data.description
    transaction.amount = transaction_data.amount
    transaction.type = transaction_data.type
    transaction.date = transaction_data.date
    transaction.category = transaction_data.category
    transaction.status = transaction_data.status
    
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction

# --- METAS (GOALS) ---

@app.get("/api/goals/", response_model=List[Goal])
def read_goals(session: Session = Depends(get_session)):
    return session.exec(select(Goal)).all()

@app.post("/api/goals/", response_model=Goal)
def create_goal(goal: Goal, session: Session = Depends(get_session)):
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal

@app.put("/api/goals/{goal_id}/", response_model=Goal)
def update_goal(goal_id: int, goal_data: Goal, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    goal.currentAmount = goal_data.currentAmount
    # Atualize outros campos se necessário
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal

@app.delete("/api/goals/{goal_id}/")
def delete_goal(goal_id: int, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    session.delete(goal)
    session.commit()
    return {"ok": True}

# --- CONTAS, ORÇAMENTOS E CATEGORIAS ---

@app.get("/api/accounts/", response_model=List[Account])
def read_accounts(session: Session = Depends(get_session)):
    accounts = session.exec(select(Account)).all()
    # Se estiver vazio, retorna um mock inicial para não ficar feio na tela
    if not accounts:
        return [
            Account(name="Banco Principal", type="Corrente", balance=8450.75, color="bg-blue-500", icon="bank"),
            Account(name="Cartão Crédito", type="Fatura Atual", balance=-1280.40, color="bg-purple-500", icon="card")
        ]
    return accounts

@app.get("/api/categories/", response_model=List[Category])
def read_categories(session: Session = Depends(get_session)):
    categories = session.exec(select(Category)).all()
    if not categories:
        return [
            Category(name="Alimentação", type="Despesa", color="#fb923c"),
            Category(name="Moradia", type="Despesa", color="#c084fc"),
            Category(name="Transporte", type="Despesa", color="#38bdf8"),
            Category(name="Salário", type="Receita", color="#22c55e")
        ]
    return categories

@app.post("/api/categories/", response_model=Category)
def create_category(category: Category, session: Session = Depends(get_session)):
    """Cria uma nova categoria."""
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

@app.get("/api/budgets/", response_model=List[Budget])
def read_budgets(session: Session = Depends(get_session)):
    budgets = session.exec(select(Budget)).all()
    if not budgets:
        # Mock inicial
        return [
            Budget(category="Alimentação", limit=800, spent=450, icon="food"),
            Budget(category="Transporte", limit=350, spent=150, icon="transport")
        ]
    
    # Lógica Real: Recalcular o 'spent' baseado nas transações
    transactions = session.exec(select(Transaction)).all()
    for b in budgets:
        total_spent = sum(t.amount for t in transactions if t.category == b.category and t.type == 'expense')
        b.spent = total_spent
        
    return budgets

# --- SAÚDE FINANCEIRA E ALERTAS ---

@app.get("/api/debts/", response_model=List[Debt])
def read_debts(session: Session = Depends(get_session)):
    debts = session.exec(select(Debt)).all()
    if not debts:
        return [
            Debt(name="Financiamento Carro", remaining=15200, monthly=850, dueDate="2024-08-10", status="Em dia"),
            Debt(name="Cartão de Crédito", remaining=1280, monthly=1280, dueDate="2024-07-05", status="Pendente", isUrgent=True)
        ]
    return debts

@app.get("/api/alerts/", response_model=List[Alert])
def read_alerts(session: Session = Depends(get_session)):
    alerts = session.exec(select(Alert)).all()
    if not alerts:
        return [
            Alert(category="Alimentação", budget=800, threshold=80, enabled=True, iconName="Utensils", colorClass="bg-red-500/20 text-red-500"),
            Alert(category="Transporte", budget=350, threshold=90, enabled=True, iconName="Car", colorClass="bg-blue-500/20 text-blue-500")
        ]
    return alerts

# ==========================================
# 5. ROTAS AVANÇADAS (AGREGADORES E IA)
# ==========================================

@app.get("/api/reports/")
def get_reports(range: str = 'this-month', account: str = 'all', session: Session = Depends(get_session)):
    """
    Gera dados agregados para os gráficos de relatório.
    Calcula KPI e distribuição de despesas com base nas transações reais.
    """
    transactions = session.exec(select(Transaction)).all()
    
    # Filtros simples (poderiam ser mais complexos com datas reais)
    expense_txs = [t for t in transactions if t.type == 'expense']
    
    total_spent = sum(t.amount for t in expense_txs)
    count = len(transactions)
    
    # Agrupar por categoria
    category_map = {}
    for t in expense_txs:
        category_map[t.category] = category_map.get(t.category, 0) + t.amount
        
    distribution = []
    colors = ['#c084fc', '#fb923c', '#38bdf8', '#facc15', '#818cf8', '#ef4444']
    i = 0
    
    top_category_name = "N/A"
    top_category_value = 0
    
    for cat, val in category_map.items():
        if val > top_category_value:
            top_category_value = val
            top_category_name = cat
            
        distribution.append({
            "name": cat,
            "value": val,
            "percentage": (val / total_spent * 100) if total_spent > 0 else 0,
            "color": colors[i % len(colors)]
        })
        i += 1
        
    return {
        "kpi": {
            "totalSpent": total_spent,
            "totalSpentChange": -1.5, # Mock: Comparação com mês anterior
            "topCategory": top_category_name,
            "topCategoryValue": top_category_value,
            "transactionCount": count,
            "transactionCountChange": 5.2 # Mock
        },
        "distribution": distribution
    }

@app.get("/api/leakage-analysis/")
def get_leakage_analysis():
    """
    Simula uma análise de IA para vazamento de dinheiro.
    Em um app real, isso analisaria padrões nas transações.
    """
    return {
        "totalPotential": 215.90,
        "leaksCount": 4,
        "period": "Últimos 30 Dias",
        "suggestions": [
            {
                "id": "1", "title": "Assinaturas Não Utilizadas", 
                "description": "Você tem 2 serviços de streaming de música ativos.", 
                "amount": 45.90, "actionLabel": "Cancelar", "category": "subscription"
            },
            {
                "id": "2", "title": "Compras Impulsivas", 
                "description": "Identificamos 3 compras de fast-food acima de R$ 50.", 
                "amount": 120.00, "actionLabel": "Ver Detalhes", "category": "impulse"
            },
             {
                "id": "3", "title": "Taxas Bancárias", 
                "description": "Taxa de manutenção de conta cobrada.", 
                "amount": 50.00, "actionLabel": "Ver Opções", "category": "fees"
            }
        ]
    }

@app.get("/api/interconnected-summary/")
def get_interconnected_summary(session: Session = Depends(get_session)):
    """Agrega Metas, Dívidas e Insights em uma única chamada."""
    goals = session.exec(select(Goal)).all()
    debts = session.exec(select(Debt)).all()
    
    # Mock insights based on logical rules
    insights = {
        "bestDecisions": [
            "Você economizou R$ 85 em restaurantes este mês.",
            "Sua meta de emergência está quase completa."
        ],
        "suggestedCuts": [
            {"text": "Considere reduzir gastos com assinaturas.", "value": 120}
        ]
    }
    
    return {
        "activeGoals": goals[:2], # Retorna apenas as 2 primeiras
        "upcomingDebts": [d for d in debts if d.isUrgent][:2],
        "insights": insights
    }

@app.get("/api/predictive-analysis/")
def get_predictive_analysis(session: Session = Depends(get_session)):
    """
    Calcula base para projeção futura.
    Pega o saldo atual das contas e receitas/despesas médias.
    """
    accounts = session.exec(select(Account)).all()
    total_balance = sum(a.balance for a in accounts) if accounts else 15230.50
    
    # Mock scenarios
    scenarios = [
        {"id": 1, "label": "Cortar fast-food", "savings": 150, "checked": True, "iconName": "ShoppingBag", "color": "text-purple-400"},
        {"id": 2, "label": "Cancelar streaming", "savings": 45, "checked": False, "iconName": "Clapperboard", "color": "text-blue-400"},
        {"id": 3, "label": "Reduzir Uber/99", "savings": 200, "checked": True, "iconName": "Car", "color": "text-yellow-400"}
    ]
    
    return {
        "currentBalance": total_balance,
        "monthlyIncome": 5800.00, # Poderia vir da média de transações 'income'
        "baseExpense": 3500.00,   # Poderia vir da média de transações 'expense'
        "scenarios": scenarios
    }
