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
    accountId: Optional[int] = Field(default=None, foreign_key="account.id")
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
    priority: str = Field(default="medio")
    goal: Optional[str] = None  # Objetivo do orçamento, ex: "Comprar sofá"

class BudgetItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    budget_id: int = Field(foreign_key="budget.id")
    name: str  # "Compra de sofá", "Reforma cozinha"
    target_amount: float
    spent: float = 0
    completed: bool = False

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

class Asset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    value: float
    iconType: str # 'home' | 'car' | 'investment' | 'other'

class Liability(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    value: float
    iconType: str # 'loan' | 'card' | 'debt' | 'other'

class AISettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    api_key: str
    instructions: str
    last_tested: Optional[str] = None
    is_active: bool = True


# ==========================================
# 3. INICIALIZAÇÃO DA API
# ==========================================

app = FastAPI(title="Axxy Finance API")

# Configuração de CORS (Permite que o React acesse este servidor)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, troque '*' pelo domínio do seu site
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Se quiser criar dados iniciais (Seed), chame uma função aqui.

# ==========================================
# 7. ROTAS DE CONFIGURAÇÃO DE IA
# ==========================================

@app.get("/api/config/ai", response_model=dict)
def get_ai_settings(session: Session = Depends(get_session)):
    """Retorna as configurações de IA (mas mascara a API Key)."""
    settings = session.exec(select(AISettings)).first()
    
    if not settings:
        return {
            "api_key": "",
            "instructions": "",
            "is_connected": False,
            "last_tested": None
        }
    
    # Mascarar a chave para exibir no frontend
    masked_key = ""
    if settings.api_key and len(settings.api_key) > 4:
        masked_key = f"sk-...{settings.api_key[-4:]}"
    elif settings.api_key:
        masked_key = "******"
        
    return {
        "api_key": masked_key,
        "instructions": settings.instructions,
        "is_connected": settings.is_active,
        "last_tested": settings.last_tested,
        "model_name": "Amazon Nova 2 Lite (Free)",
        "provider": "OpenRouter"
    }

@app.post("/api/config/ai")
def save_ai_settings(data: dict, session: Session = Depends(get_session)):
    """Salva a chave de API e instruções."""
    settings = session.exec(select(AISettings)).first()
    
    api_key = data.get("api_key")
    instructions = data.get("instructions", "")
    
    if not settings:
        settings = AISettings(
            api_key=api_key, 
            instructions=instructions,
            is_active=False
        )
        session.add(settings)
    else:
        # Só atualiza a chave se ela for fornecida e não for a mascarada
        if api_key and not api_key.startswith("sk-...") and not api_key.startswith("***"):
            settings.api_key = api_key
        
        settings.instructions = instructions
        session.add(settings)
        
    session.commit()
    session.refresh(settings)
    return {"status": "success", "message": "Configurações salvas com sucesso"}

@app.post("/api/ai/test")
def test_ai_connection(session: Session = Depends(get_session)):
    """Testa a conexão com Amazon Nova via OpenRouter."""
    settings = session.exec(select(AISettings)).first()
    
    if not settings or not settings.api_key:
        raise HTTPException(status_code=400, detail="Chave de API não configurada")
    
    try:
        # Importar client OpenAI (OpenRouter é compatível)
        from openai import OpenAI
        
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.api_key,
        )
        
        # Modelo Amazon Nova Lite (rápido e eficiente)
        model_id = "amazon/nova-2-lite-v1:free" 
        
        completion = client.chat.completions.create(
            model=model_id,
            messages=[
                {
                    "role": "user",
                    "content": "Responda apenas com a palavra 'CONECTADO'."
                }
            ]
        )
        
        response_text = completion.choices[0].message.content
        
        if response_text:
            settings.last_tested = datetime.now().isoformat()
            settings.is_active = True
            session.add(settings)
            session.commit()
            
            return {
                "status": "success", 
                "message": f"Conexão com {model_id} bem-sucedida!",
                "response_time": "120ms", # Simulado
                "ai_response": response_text
            }
        else:
            raise Exception("Resposta vazia da IA")
            
    except Exception as e:
        settings.is_active = False
        session.add(settings)
        session.commit()
        # Tratamento de erro melhorado para mostrar detalhes da API
        error_msg = str(e)
        if hasattr(e, 'response'):
             error_msg = f"{e}; Response: {e.response}"
        raise HTTPException(status_code=500, detail=f"Erro ao conectar: {error_msg}")

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
    """Cria uma nova transação financeira e atualiza o saldo da conta vinculada."""
    session.add(transaction)
    
    # Atualizar saldo da conta se houver accountId
    if transaction.accountId:
        account = session.get(Account, transaction.accountId)
        if account:
            if transaction.type == 'income':
                account.balance += transaction.amount
            elif transaction.type == 'expense':
                account.balance -= transaction.amount
            session.add(account)
            
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
    return {"ok": True}

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

@app.delete("/api/accounts/{account_id}/")
def delete_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    session.delete(account)
    session.commit()
    return {"ok": True}

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

@app.get("/api/categories/", response_model=List[Category])
def read_categories(session: Session = Depends(get_session)):
    categories = session.exec(select(Category)).all()
    return categories

@app.post("/api/categories/", response_model=Category)
def create_category(category: Category, session: Session = Depends(get_session)):
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
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget

@app.delete("/api/budgets/{budget_id}/")
def delete_budget(budget_id: int, session: Session = Depends(get_session)):
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    session.delete(budget)
    session.commit()
    return {"ok": True}

@app.put("/api/budgets/{budget_id}/", response_model=Budget)
def update_budget(budget_id: int, budget_data: dict, session: Session = Depends(get_session)):
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Atualizar campos permitidos
    if "category" in budget_data:
        budget.category = budget_data["category"]
    if "limit" in budget_data:
        budget.limit = budget_data["limit"]
    if "icon" in budget_data:
        budget.icon = budget_data["icon"]
    if "priority" in budget_data:
        budget.priority = budget_data["priority"]
    if "goal" in budget_data:
        budget.goal = budget_data["goal"]
    
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget

# --- BUDGET ITEMS (Subcategorias) ---

@app.post("/api/budgets/{budget_id}/items", response_model=BudgetItem)
def create_budget_item(budget_id: int, item: BudgetItem, session: Session = Depends(get_session)):
    # Verificar se o budget existe
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    item.budget_id = budget_id
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.get("/api/budgets/{budget_id}/items", response_model=List[BudgetItem])
def get_budget_items(budget_id: int, session: Session = Depends(get_session)):
    items = session.exec(select(BudgetItem).where(BudgetItem.budget_id == budget_id)).all()
    return items

@app.put("/api/budgets/{budget_id}/items/{item_id}", response_model=BudgetItem)
def update_budget_item(budget_id: int, item_id: int, item_data: BudgetItem, session: Session = Depends(get_session)):
    item = session.get(BudgetItem, item_id)
    if not item or item.budget_id != budget_id:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    item.name = item_data.name
    item.target_amount = item_data.target_amount
    item.spent = item_data.spent
    item.completed = item_data.completed
    
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.delete("/api/budgets/{budget_id}/items/{item_id}")
def delete_budget_item(budget_id: int, item_id: int, session: Session = Depends(get_session)):
    item = session.get(BudgetItem, item_id)
    if not item or item.budget_id != budget_id:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    session.delete(item)
    session.commit()
    return {"ok": True}

@app.post("/api/budgets/suggest")
def suggest_budget_category(data: dict, session: Session = Depends(get_session)):
    """
    Sugere uma categoria de orçamento baseado na descrição da transação.
    Usa análise de palavras-chave para matching inteligente.
    """
    description = data.get("description", "").lower()
    amount = data.get("amount", 0)
    
    # Mapeamento de palavras-chave para categorias
    category_keywords = {
        "Moradia": ["aluguel", "condomínio", "iptu", "água", "luz", "energia", "gas", "internet", "casa", "apartamento", "reforma", "móveis"],
        "Alimentação": ["mercado", "supermercado", "feira", "padaria", "restaurante", "lanche", "ifood", "rappi", "uber eats", "comida", "almoço", "jantar", "café"],
        "Transporte": ["uber", "99", "táxi", "ônibus", "metrô", "gasolina", "combustível", "estacionamento", "pedágio", "carro", "moto", "transporte"],
        "Lazer": ["cinema", "teatro", "show", "netflix", "spotify", "disney", "prime", "jogo", "game", "viagem", "passeio", "parque", "diversão"],
        "Saúde": ["médico", "hospital", "farmácia", "remédio", "consulta", "exame", "dentista", "plano de saúde", "academia", "ginástica"],
        "Salário": ["salário", "pagamento", "recebimento", "renda", "freelance", "honorários"]
    }
    
    # Calcular score para cada categoria
    scores = {}
    for category, keywords in category_keywords.items():
        score = 0
        for keyword in keywords:
            if keyword in description:
                # Score maior para matches mais longos e exatos
                score += len(keyword) * 2
        scores[category] = score
    
    # Pegar a categoria com maior score
    if scores:
        best_category = max(scores, key=scores.get)
        max_score = scores[best_category]
        
        if max_score > 0:
            # Normalizar confiança (0-100%)
            confidence = min(100, (max_score / 10) * 100)
            return {
                "suggestedCategory": best_category,
                "confidence": round(confidence, 1),
                "allScores": scores
            }
    
    # Se não encontrou nenhuma correspondência
    return {
        "suggestedCategory": "Outros",
        "confidence": 0,
        "allScores": scores
    }

@app.post("/api/budgets/calculate-limit")
def calculate_budget_limit(data: dict, session: Session = Depends(get_session)):
    """
    IA que calcula o limite ideal para um orçamento baseado em:
    - Saldo disponível nas contas
    - Histórico de receitas e despesas
    - Prioridade do orçamento
    - Objetivo/meta do usuário
    """
    category = data.get("category", "")
    priority = data.get("priority", "medio")
    goal = data.get("goal", "")
    goal_amount = data.get("goal_amount", 0)  # Valor que quer acumular
    
    # Buscar dados das contas
    accounts = session.exec(select(Account)).all()
    total_balance = sum(a.balance for a in accounts)
    
    # Buscar transações dos últimos 90 dias
    from datetime import datetime, timedelta
    cutoff_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    transactions = session.exec(select(Transaction)).all()
    
    # Filtrar transações recentes
    recent_transactions = [t for t in transactions if t.date >= cutoff_date]
    
    # Calcular receitas e despesas mensais médias
    total_income = sum(t.amount for t in recent_transactions if t.type == "income")
    total_expenses = sum(t.amount for t in recent_transactions if t.type == "expense")
    
    # Média mensal (3 meses)
    monthly_income = total_income / 3 if total_income > 0 else 0
    monthly_expenses = total_expenses / 3 if total_expenses > 0 else 0
    monthly_available = monthly_income - monthly_expenses
    
    # Gastos na categoria específica
    category_expenses = sum(t.amount for t in recent_transactions 
                           if t.type == "expense" and t.category == category)
    monthly_category_avg = category_expenses / 3 if category_expenses > 0 else 0
    
    # Buscar orçamentos existentes
    existing_budgets = session.exec(select(Budget)).all()
    total_committed = sum(b.limit for b in existing_budgets if b.category != category)
    
    # Calcular disponível para este orçamento
    available_for_budget = max(0, monthly_available - (total_committed * 0.7))
    
    # Pesos por prioridade
    priority_percentages = {
        "essencial": 0.35,  # 35% do disponível
        "alto": 0.25,       # 25% 
        "medio": 0.20,      # 20%
        "baixo": 0.10       # 10%
    }
    
    priority_multiplier = priority_percentages.get(priority, 0.20)
    suggested_limit = max(50, available_for_budget * priority_multiplier)
    
    # Se usuário tem uma meta específica, calcular timeline
    months_to_goal = 0
    if goal_amount > 0 and suggested_limit > 0:
        months_to_goal = round(goal_amount / suggested_limit, 1)
    
    # Gerar explicação
    reasons = []
    if monthly_income > 0:
        reasons.append(f"Sua renda média é de R$ {monthly_income:,.2f}/mês")
    if monthly_expenses > 0:
        reasons.append(f"Suas despesas médias são R$ {monthly_expenses:,.2f}/mês")
    if monthly_available > 0:
        reasons.append(f"Sobra em média R$ {monthly_available:,.2f}/mês")
    if monthly_category_avg > 0:
        reasons.append(f"Você gasta em média R$ {monthly_category_avg:,.2f}/mês em {category}")
    
    # Insights inteligentes
    insights = []
    if monthly_category_avg > suggested_limit:
        insights.append({
            "type": "warning",
            "message": f"Você gasta mais em {category} do que o sugerido. Considere revisar seus hábitos."
        })
    if total_balance < suggested_limit * 3:
        insights.append({
            "type": "caution",
            "message": "Seu saldo atual é baixo. Considere um limite menor."
        })
    if months_to_goal > 12:
        insights.append({
            "type": "info",
            "message": f"Para atingir R$ {goal_amount:,.2f} mais rápido, aumente a economia mensal."
        })
    
    return {
        "suggested_limit": round(suggested_limit, 2),
        "available_monthly": round(monthly_available, 2),
        "total_balance": round(total_balance, 2),
        "monthly_category_avg": round(monthly_category_avg, 2),
        "months_to_goal": months_to_goal if goal_amount > 0 else None,
        "goal_amount": goal_amount,
        "reasoning": reasons,
        "insights": insights,
        "explanation": f"Com base em sua renda de R$ {monthly_income:,.2f} e despesas de R$ {monthly_expenses:,.2f}, você tem R$ {monthly_available:,.2f} disponível por mês. Para a categoria {category} ({priority}), sugerimos R$ {suggested_limit:,.2f}/mês."
    }

@app.post("/api/budgets/allocate")
def auto_allocate_budgets(data: dict, session: Session = Depends(get_session)):
    """
    Aloca automaticamente o dinheiro disponível entre os orçamentos
    baseado em prioridades e padrões de gasto.
    """
    available_amount = data.get("availableAmount", 0)
    
    if available_amount <= 0:
        return {"error": "Nenhum valor disponível para alocar"}
    
    # Buscar todos os orçamentos
    budgets = session.exec(select(Budget)).all()
    
    if not budgets:
        return {"error": "Nenhum orçamento cadastrado"}
    
    # Pesos por prioridade
    priority_weights = {
        "essencial": 4.0,
        "alto": 2.5,
        "medio": 1.5,
        "baixo": 0.8
    }
    
    # Calcular necessidade de cada orçamento
    budget_needs = []
    for budget in budgets:
        percentage_used = (budget.spent / budget.limit * 100) if budget.limit > 0 else 0
        remaining = budget.limit - budget.spent
        
        # Peso baseado em prioridade
        priority_weight = priority_weights.get(budget.priority, 1.5)
        
        # Peso adicional se está perto do limite
        urgency_weight = 1.0
        if percentage_used > 90:
            urgency_weight = 2.0
        elif percentage_used > 70:
            urgency_weight = 1.5
        
        # Score final
        need_score = remaining * priority_weight * urgency_weight
        
        budget_needs.append({
            "budget_id": budget.id,
            "category": budget.category,
            "priority": budget.priority,
            "current_spent": budget.spent,
            "limit": budget.limit,
            "remaining": remaining,
            "percentage_used": percentage_used,
            "need_score": need_score
        })
    
    # Ordenar por score de necessidade
    budget_needs.sort(key=lambda x: x["need_score"], reverse=True)
    
    # Distribuir o dinheiro disponível
    allocations = []
    remaining_amount = available_amount
    total_score = sum(b["need_score"] for b in budget_needs if b["need_score"] > 0)
    
    if total_score > 0:
        for budget_need in budget_needs:
            # Calcular alocação proporcional ao score
            if budget_need["need_score"] > 0:
                allocation = (budget_need["need_score"] / total_score) * available_amount
                
                # Não alocar mais do que o necessário para completar o orçamento
                max_allocation = budget_need["remaining"]
                final_allocation = min(allocation, max_allocation)
                
                allocations.append({
                    "budget_id": budget_need["budget_id"],
                    "category": budget_need["category"],
                    "priority": budget_need["priority"],
                    "suggested_amount": round(final_allocation, 2),
                    "new_total": round(budget_need["current_spent"] + final_allocation, 2),
                    "new_percentage": round((budget_need["current_spent"] + final_allocation) / budget_need["limit"] * 100, 1) if budget_need["limit"] > 0 else 0
                })
    
    return {
        "total_available": available_amount,
        "allocations": allocations,
        "total_allocated": sum(a["suggested_amount"] for a in allocations)
    }


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

@app.post("/api/alerts/", response_model=Alert)
def create_alert(alert: Alert, session: Session = Depends(get_session)):
    session.add(alert)
    session.commit()
    session.refresh(alert)
    return alert

@app.delete("/api/alerts/{alert_id}/")
def delete_alert(alert_id: int, session: Session = Depends(get_session)):
    alert = session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    session.delete(alert)
    session.commit()
    return {"ok": True}

# ==========================================
# 5. ROTAS DE PATRIMÔNIO LÍQUIDO
# ==========================================

@app.get("/api/net-worth/")
def get_net_worth_dashboard(session: Session = Depends(get_session)):
    """Retorna dados agregados para o dashboard de Patrimônio."""
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    
    total_assets = sum(a.value for a in assets)
    total_liabilities = sum(l.value for l in liabilities)
    net_worth = total_assets - total_liabilities
    
    # Mock de histórico (para o gráfico) - Gera variação baseada no valor atual
    history = []
    months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
    base_val = net_worth * 0.95
    for m in months:
        val = base_val + (random.random() * (net_worth * 0.1))
        history.append({"month": m, "value": val})
    
    # Composição
    composition = []
    colors = ["#22c55e", "#3b82f6", "#a855f7", "#64748b"]
    asset_types = {}
    for a in assets:
        asset_types[a.iconType] = asset_types.get(a.iconType, 0) + a.value
    
    i = 0
    for key, val in asset_types.items():
        label = "Outros"
        if key == "home": label = "Imóveis"
        elif key == "car": label = "Veículos"
        elif key == "investment": label = "Investimentos"
        
        composition.append({"name": label, "value": val, "color": colors[i % len(colors)]})
        i += 1
        
    return {
        "totalAssets": total_assets,
        "totalLiabilities": total_liabilities,
        "netWorth": net_worth,
        "assets": assets,
        "liabilities": liabilities,
        "history": history,
        "composition": composition
    }

@app.post("/api/assets/")
def create_asset(asset: Asset, session: Session = Depends(get_session)):
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@app.delete("/api/assets/{asset_id}/")
def delete_asset(asset_id: int, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset: raise HTTPException(404)
    session.delete(asset)
    session.commit()
    return {"ok": True}

@app.post("/api/liabilities/")
def create_liability(liability: Liability, session: Session = Depends(get_session)):
    session.add(liability)
    session.commit()
    session.refresh(liability)
    return liability

@app.delete("/api/liabilities/{liability_id}/")
def delete_liability(liability_id: int, session: Session = Depends(get_session)):
    liab = session.get(Liability, liability_id)
    if not liab: raise HTTPException(404)
    session.delete(liab)
    session.commit()
    return {"ok": True}


# ==========================================
# 6. ROTAS AVANÇADAS (AGREGADORES E IA)
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
            "totalSpentChange": 0, # Sem histórico real por enquanto
            "topCategory": top_category_name,
            "topCategoryValue": top_category_value,
            "transactionCount": count,
            "transactionCountChange": 0 # Sem histórico real por enquanto
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
        "totalPotential": 0,
        "leaksCount": 0,
        "period": "Últimos 30 Dias",
        "suggestions": []
    }

@app.get("/api/interconnected-summary/")
def get_interconnected_summary(session: Session = Depends(get_session)):
    """Agrega Metas, Dívidas e Insights em uma única chamada."""
    goals = session.exec(select(Goal)).all()
    debts = session.exec(select(Debt)).all()
    
    # Mock insights based on logical rules
    # Calculos reais baseados nos dados
    insights_list = []
    
    # Exemplo de insight real simples
    if goals:
        insights_list.append(f"Você tem {len(goals)} metas ativas.")
    if debts:
        insights_list.append(f"Atenção com {len(debts)} dívidas pendentes.")
        
    insights = {
        "bestDecisions": insights_list,
        "suggestedCuts": []
    }
    
    return {
        "activeGoals": goals[:2],
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
    total_balance = sum(a.balance for a in accounts)
    
    # Calcular médias reais (simplified for now)
    transactions = session.exec(select(Transaction)).all()
    incomes = [t.amount for t in transactions if t.type == 'income']
    expenses = [t.amount for t in transactions if t.type == 'expense']
    
    monthly_income = sum(incomes) / 1 if incomes else 0 # Mock divisor 1 month
    monthly_expense = sum(expenses) / 1 if expenses else 0
    
    return {
        "currentBalance": total_balance,
        "monthlyIncome": monthly_income,
        "baseExpense": monthly_expense,
        "scenarios": []
    }
