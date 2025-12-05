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
    accountId: Optional[int] = Field(default=None, foreign_key="account.id")

class Goal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    currentAmount: float
    targetAmount: float
    deadline: str
    color: str
    priority: str = "Média"
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
    icon: str = "Tag"

class Debt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    remaining: float
    monthly: float
    dueDate: str
    status: str
    category: str = "Outros"
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
    transaction.accountId = transaction_data.accountId
    
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
    return accounts

@app.post("/api/accounts/", response_model=Account)
def create_account(account: Account, session: Session = Depends(get_session)):
    session.add(account)
    session.commit()
    session.refresh(account)
    return account

@app.put("/api/accounts/{account_id}/", response_model=Account)
def update_account(account_id: int, account_data: Account, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    account.name = account_data.name
    account.type = account_data.type
    account.balance = account_data.balance
    account.color = account_data.color
    account.icon = account_data.icon
    
    session.add(account)
    session.commit()
    session.refresh(account)
    return account

@app.delete("/api/accounts/{account_id}/")
def delete_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    session.delete(account)
    session.commit()
    return {"ok": True}

@app.get("/api/categories/", response_model=List[Category])
def read_categories(session: Session = Depends(get_session)):
    categories = session.exec(select(Category)).all()
    if not categories:
        defaults = [
            Category(name="Alimentação", type="Despesa", color="#fb923c", icon="Utensils"),
            Category(name="Moradia", type="Despesa", color="#c084fc", icon="Home"),
            Category(name="Transporte", type="Despesa", color="#38bdf8", icon="Car"),
            Category(name="Salário", type="Receita", color="#22c55e", icon="DollarSign")
        ]
        for cat in defaults:
            session.add(cat)
        session.commit()
        for cat in defaults:
            session.refresh(cat)
        return defaults
    return categories

@app.post("/api/categories/", response_model=Category)
def create_category(category: Category, session: Session = Depends(get_session)):
    """Cria uma nova categoria."""
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

@app.put("/api/categories/{category_id}/", response_model=Category)
def update_category(category_id: int, category_data: Category, session: Session = Depends(get_session)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    category.name = category_data.name
    category.type = category_data.type
    category.color = category_data.color
    category.icon = category_data.icon
    
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

@app.delete("/api/categories/{category_id}/")
def delete_category(category_id: int, session: Session = Depends(get_session)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    session.delete(category)
    session.commit()
    return {"ok": True}

@app.get("/api/budgets/", response_model=List[Budget])
def read_budgets(session: Session = Depends(get_session)):
    budgets = session.exec(select(Budget)).all()
    # Lógica Real: Recalcular o 'spent' baseado nas transações
    transactions = session.exec(select(Transaction)).all()
    for b in budgets:
        total_spent = sum(t.amount for t in transactions if t.category == b.category and t.type == 'expense')
        b.spent = total_spent
        
    return budgets

@app.post("/api/budgets/", response_model=Budget)
def create_budget(budget: Budget, session: Session = Depends(get_session)):
    """Cria um novo orçamento."""
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget

@app.put("/api/budgets/{budget_id}/", response_model=Budget)
def update_budget(budget_id: int, budget_data: Budget, session: Session = Depends(get_session)):
    """Atualiza um orçamento existente."""
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    budget.category = budget_data.category
    budget.limit = budget_data.limit
    budget.icon = budget_data.icon
    # spent é calculado, não atualizado diretamente aqui geralmente, mas se quiser permitir ajuste manual:
    # budget.spent = budget_data.spent 
    
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget

@app.delete("/api/budgets/{budget_id}/")
def delete_budget(budget_id: int, session: Session = Depends(get_session)):
    """Deleta um orçamento."""
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    session.delete(budget)
    session.commit()
    return {"ok": True}

# --- SAÚDE FINANCEIRA E ALERTAS ---

@app.get("/api/debts/", response_model=List[Debt])
def read_debts(session: Session = Depends(get_session)):
    debts = session.exec(select(Debt)).all()
    return debts

@app.post("/api/debts/", response_model=Debt)
def create_debt(debt: Debt, session: Session = Depends(get_session)):
    session.add(debt)
    session.commit()
    session.refresh(debt)
    return debt

@app.put("/api/debts/{debt_id}/", response_model=Debt)
def update_debt(debt_id: int, debt_data: Debt, session: Session = Depends(get_session)):
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    
    debt.name = debt_data.name
    debt.remaining = debt_data.remaining
    debt.monthly = debt_data.monthly
    debt.dueDate = debt_data.dueDate
    debt.status = debt_data.status
    debt.category = debt_data.category
    debt.isUrgent = debt_data.isUrgent
    
    session.add(debt)
    session.commit()
    session.refresh(debt)
    return debt

@app.delete("/api/debts/{debt_id}/")
def delete_debt(debt_id: int, session: Session = Depends(get_session)):
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    session.delete(debt)
    session.commit()
    return {"ok": True}

@app.get("/api/alerts/", response_model=List[Alert])
def read_alerts(session: Session = Depends(get_session)):
    alerts = session.exec(select(Alert)).all()
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
def get_leakage_analysis(session: Session = Depends(get_session)):
    """
    Análise de vazamento baseada em transações reais dos últimos 30 dias.
    Melhorada para detectar padrões por palavras-chave na descrição e categorias.
    """
    # Data de 30 dias atrás
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Buscar transações recentes (apenas despesas)
    transactions = session.exec(select(Transaction).where(Transaction.date >= thirty_days_ago, Transaction.type == 'expense')).all()
    
    suggestions = []
    total_potential = 0.0
    
    # 1. Identificar Taxas Bancárias
    fee_keywords = ["taxa", "tarifa", "iof", "anuidade", "manutencao", "manutenção", "cesta"]
    fees = [
        t for t in transactions 
        if any(k in t.description.lower() for k in fee_keywords) 
        or t.category.lower() in ["taxas", "banco", "tarifas"]
    ]
    
    if fees:
        fees_total = sum(t.amount for t in fees)
        suggestions.append({
            "id": "fees-1",
            "title": "Taxas Bancárias",
            "description": f"Identificamos {len(fees)} cobranças de taxas (ex: manutenção, IOF).",
            "amount": fees_total,
            "actionLabel": "Ver Extrato",
            "category": "fees"
        })
        total_potential += fees_total

    # 2. Identificar Gastos com Delivery/Fast Food (Impulso)
    food_categories = ["alimentação", "alimentacao", "restaurante", "fast food", "lazer"]
    delivery_keywords = ["ifood", "uber eats", "rappi", "delivery", "mc donalds", "burger king", "subway", "zè delivery"]
    
    impulse_food = [
        t for t in transactions 
        if (t.category.lower() in food_categories and t.amount > 70.0) # Gastos altos em restaurante
        or any(k in t.description.lower() for k in delivery_keywords) # Qualquer valor em delivery
    ]
    
    if impulse_food:
        impulse_total = sum(t.amount for t in impulse_food)
        suggestions.append({
            "id": "impulse-1",
            "title": "Delivery e Restaurantes",
            "description": f"Identificamos {len(impulse_food)} gastos com delivery ou restaurantes caros.",
            "amount": impulse_total,
            "actionLabel": "Ver Detalhes",
            "category": "impulse"
        })
        total_potential += impulse_total

    # 3. Identificar Assinaturas e Serviços Recorrentes
    sub_categories = ["assinatura", "streaming", "serviços digitais", "lazer"]
    sub_keywords = ["netflix", "spotify", "prime video", "amazon prime", "disney", "hbo", "apple", "google", "youtube", "globo", "chatgpt", "claude"]
    
    subscriptions = [
        t for t in transactions 
        if (t.category.lower() in sub_categories)
        or (t.amount < 200 and any(k in t.description.lower() for k in sub_keywords))
    ]
    
    # Remover duplicatas se uma transação cair em mais de uma regra (pouco provável com a lógica atual, mas boa prática)
    # Aqui estamos apenas somando, então ok.
    
    if subscriptions:
        sub_total = sum(t.amount for t in subscriptions)
        suggestions.append({
            "id": "sub-1",
            "title": "Assinaturas Digitais",
            "description": f"Você gastou com {len(subscriptions)} serviços de assinatura recentemente.",
            "amount": sub_total,
            "actionLabel": "Revisar",
            "category": "subscription"
        })
        total_potential += sub_total

    return {
        "totalPotential": total_potential,
        "leaksCount": len(suggestions),
        "period": "Últimos 30 Dias",
        "suggestions": suggestions
    }

@app.get("/api/interconnected-summary/")
def get_interconnected_summary(session: Session = Depends(get_session)):
    """Agrega Metas, Dívidas e Insights em uma única chamada."""
    goals = session.exec(select(Goal)).all()
    debts = session.exec(select(Debt)).all()
    
    # Dynamic Insights Logic
    transactions = session.exec(select(Transaction)).all()
    
    best_decisions = []
    suggested_cuts = []

    # 1. Goal Progress Insight
    for goal in goals:
        if goal.current_amount >= goal.target_amount * 0.8:
            best_decisions.append(f"Sua meta '{goal.title}' está quase completa!")
            break # Only one goal insight
    
    # 2. Financial Health Insight
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    
    if total_income > total_expense:
        best_decisions.append("Você está gastando menos do que ganha este mês.")
    elif total_expense > 0:
        best_decisions.append("Atenção aos gastos excessivos.")

    if not best_decisions:
        best_decisions.append("Continue registrando suas transações para obter insights.")

    # 3. Suggested Cuts (Highest Expense Category)
    expense_by_category = {}
    for t in transactions:
        if t.type == 'expense':
            expense_by_category[t.category] = expense_by_category.get(t.category, 0) + t.amount
    
    if expense_by_category:
        highest_category = max(expense_by_category, key=expense_by_category.get)
        amount = expense_by_category[highest_category]
        suggested_cuts.append({
            "text": f"Considere reduzir gastos em {highest_category}.",
            "value": amount
        })

    insights = {
        "bestDecisions": best_decisions,
        "suggestedCuts": suggested_cuts
    }
    
    return {
        "activeGoals": goals[:2], # Retorna apenas as 2 primeiras
        "upcomingDebts": [d for d in debts if d.isUrgent][:2],
        "insights": insights
    }

@app.get("/api/predictive-analysis/")
def get_predictive_analysis(session: Session = Depends(get_session)):
    """
    Calcula base para projeção futura usando dados reais.
    Gera cenários baseados em categorias de gastos frequentes.
    """
    accounts = session.exec(select(Account)).all()
    total_balance = sum(a.balance for a in accounts) if accounts else 0.0
    
    # Calcular médias mensais baseadas nos últimos 90 dias
    ninety_days_ago = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    transactions = session.exec(select(Transaction).where(Transaction.date >= ninety_days_ago)).all()
    
    if not transactions:
        # Se não houver transações recentes, retornar zerado mas com estrutura válida
        return {
            "currentBalance": total_balance,
            "monthlyIncome": 0.0,
            "baseExpense": 0.0,
            "scenarios": []
        }

    # Calcular o período real de dados (em meses) para não distorcer a média de novos usuários
    dates = [datetime.strptime(t.date, "%Y-%m-%d") for t in transactions]
    if dates:
        oldest_date = min(dates)
        days_diff = (datetime.now() - oldest_date).days
        # Mínimo de 1 mês para evitar divisão por zero ou números gigantes
        # Se tiver menos de 30 dias de dados, consideramos como "1 mês" de atividade para a média
        months_active = max(1, days_diff / 30)
    else:
        months_active = 1

    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    
    avg_monthly_income = total_income / months_active
    avg_monthly_expense = total_expense / months_active
    
    # Gerar cenários dinâmicos baseados em gastos reais
    scenarios = []
    
    # 1. Cenário: Reduzir Alimentação/Delivery
    food_expenses = [t for t in transactions if t.type == 'expense' and t.category.lower() in ["alimentação", "restaurante", "fast food"]]
    if food_expenses:
        avg_food = sum(t.amount for t in food_expenses) / months_active
        if avg_food > 150: # Threshold reduzido
            scenarios.append({
                "id": 1, 
                "label": "Reduzir Alimentação em 20%", 
                "savings": round(avg_food * 0.2, 2), 
                "checked": False, 
                "iconName": "ShoppingBag", 
                "color": "text-purple-400"
            })

    # 2. Cenário: Otimizar Assinaturas
    sub_keywords = ["netflix", "spotify", "prime", "disney", "hbo", "apple", "google", "youtube"]
    sub_expenses = [t for t in transactions if t.type == 'expense' and (t.category.lower() in ["assinatura", "streaming"] or any(k in t.description.lower() for k in sub_keywords))]
    if sub_expenses:
        avg_sub = sum(t.amount for t in sub_expenses) / months_active
        if avg_sub > 30: # Threshold reduzido
             scenarios.append({
                "id": 2, 
                "label": "Otimizar Assinaturas", 
                "savings": round(avg_sub * 0.5, 2),
                "checked": False, 
                "iconName": "Clapperboard", 
                "color": "text-blue-400"
            })

    # 3. Cenário: Economia em Transporte
    transport_expenses = [t for t in transactions if t.type == 'expense' and t.category.lower() in ["transporte", "uber", "combustível", "99"]]
    if transport_expenses:
        avg_transport = sum(t.amount for t in transport_expenses) / months_active
        if avg_transport > 80: # Threshold reduzido
            scenarios.append({
                "id": 3, 
                "label": "Economizar no Transporte", 
                "savings": round(avg_transport * 0.15, 2), 
                "checked": False, 
                "iconName": "Car", 
                "color": "text-yellow-400"
            })
            
    # Fallback
    if not scenarios and avg_monthly_expense > 0:
        scenarios.append({
            "id": 99,
            "label": "Economizar 5% dos Gastos",
            "savings": round(avg_monthly_expense * 0.05, 2),
            "checked": False,
            "iconName": "TrendingUp",
            "color": "text-green-400"
        })
    
    return {
        "currentBalance": total_balance,
        "monthlyIncome": avg_monthly_income,
        "baseExpense": avg_monthly_expense,
        "scenarios": scenarios
    }
