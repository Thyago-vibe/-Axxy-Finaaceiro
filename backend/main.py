from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Query
from sqlmodel import SQLModel, Field, Session, create_engine, select
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import random
import os

# ==========================================
# 1. CONFIGURAÇÃO DO BANCO DE DADOS (SQLite)
# ==========================================
sqlite_file_name = os.getenv("DATABASE_FILE", "database.db")
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
    
    # Campos para unificação com Metas
    budget_type: str = Field(default="expense")  # "expense" (orçamento) ou "goal" (meta)
    target_amount: Optional[float] = None  # Valor alvo para metas
    current_amount: float = 0  # Progresso atual (para metas)
    deadline: Optional[str] = None  # Prazo final (para metas)
    ai_priority_score: Optional[float] = None  # Score de prioridade calculado pela IA (0-100)
    ai_priority_reason: Optional[str] = None  # Explicação da IA sobre a prioridade

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
    debtType: str = "parcelado"
    totalInstallments: Optional[int] = None
    currentInstallment: Optional[int] = None

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

# Configuração de CORS - Origens permitidas
# Em desenvolvimento usa localhost, em produção adicione seu domínio
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Se quiser criar dados iniciais (Seed), chame uma função aqui.

def ask_ai_analysis(prompt: str, session: Session):
    """Função auxiliar para consultar a IA configurada."""
    settings = session.exec(select(AISettings)).first()
    
    if not settings or not settings.api_key or not settings.is_active:
        return None
        
    try:
        from openai import OpenAI
        import json
        
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.api_key,
        )
        
        system_prompt = (
            f"Você é um analista financeiro experiente. {settings.instructions or ''} "
            "Sua resposta deve ser estritamente um JSON válido, sem markdown, sem explicações extras."
        )
        
        response = client.chat.completions.create(
            model="amazon/nova-2-lite-v1:free", # Forçando o modelo gratuito que sabemos que funciona
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        )
        
        content = response.choices[0].message.content
        if not content: return None

        # Limpeza de markdown code blocks se a IA mandar
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
            
        return json.loads(content.strip())
        
    except Exception as e:
        print(f"Erro na IA: {e}")
        return None

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

@app.put("/api/transactions/{transaction_id}/", response_model=Transaction)
def update_transaction(transaction_id: int, transaction_data: Transaction, session: Session = Depends(get_session)):
    """Atualiza uma transação existente."""
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Reverter impacto da transação antiga no saldo (se houver conta vinculada)
    if transaction.accountId:
        account = session.get(Account, transaction.accountId)
        if account:
            if transaction.type == 'income':
                account.balance -= transaction.amount
            elif transaction.type == 'expense':
                account.balance += transaction.amount
            session.add(account)
    
    # Atualizar campos da transação
    transaction.accountId = transaction_data.accountId
    transaction.description = transaction_data.description
    transaction.amount = transaction_data.amount
    transaction.type = transaction_data.type
    transaction.date = transaction_data.date
    transaction.category = transaction_data.category
    transaction.status = transaction_data.status
    
    # Aplicar novo impacto no saldo
    if transaction.accountId:
        account = session.get(Account, transaction.accountId)
        if account:
            if transaction.type == 'income':
                account.balance += transaction.amount
            elif transaction.type == 'expense':
                account.balance -= transaction.amount
            session.add(account)
    
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

@app.put("/api/categories/{category_id}/", response_model=Category)
def update_category(category_id: int, category_data: Category, session: Session = Depends(get_session)):
    """Atualiza uma categoria existente."""
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    category.name = category_data.name
    category.type = category_data.type
    category.color = category_data.color
    
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
    
    # ... lógica de keywords mantida acima ...
    
    # Se encontrou algo com confiança alta (>60%), retorna logo para economizar IA
    best_category = None
    max_score = 0
    if scores:
        best_category = max(scores, key=scores.get)
        max_score = scores[best_category]
        
    keyword_confidence = min(100, (max_score / 10) * 100) if max_score > 0 else 0

    if keyword_confidence > 60:
         return {
            "suggestedCategory": best_category,
            "confidence": round(keyword_confidence, 1),
            "allScores": scores
        }

    # TENTATIVA DE IA (Se keywords falharam ou são incertas)
    prompt = f"""
    Classifique a seguinte transação financeira em uma destas categorias exatas: 
    ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Salário', 'Compras', 'Outros'].
    
    Descrição da transação: "{description}"
    Valor: {amount}
    
    Retorne JSON: {{ "category": "NomeDaCategoria", "confidence": (0-100) }}
    """
    ai_result = ask_ai_analysis(prompt, session)
    
    if ai_result:
        return {
            "suggestedCategory": ai_result.get("category", "Outros"),
            "confidence": ai_result.get("confidence", 80),
            "allScores": scores # Mantem scores originais para debug
        }

    # Fallback final se IA falhar
    return {
        "suggestedCategory": best_category if best_category and max_score > 0 else "Outros",
        "confidence": round(keyword_confidence, 1),
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
    
    # TENTATIVA DE IA (Amazon Nova)
    prompt = f"""
    Atue como o consultor financeiro do Axxy. Calcule um limite de orçamento ideal para a categoria '{category}' (Prioridade: {priority}).
    
    Dados Financeiros:
    - Renda Média Mensal: R$ {monthly_income:.2f}
    - Despesa Média Total: R$ {monthly_expenses:.2f}
    - Sobra Líquida Mensal: R$ {monthly_available:.2f}
    - Saldo Total em Conta: R$ {total_balance:.2f}
    - Gasto Médio Atual em '{category}': R$ {monthly_category_avg:.2f}
    - Meta vinculada: {goal} (Alvo: R$ {goal_amount:.2f})
    
    Retorne APENAS um JSON:
    {{
        "suggested_limit": (valor numérico sugerido float),
        "explanation": "Analise breve de por que este valor é ideal.",
        "insights": [ 
            {{ "type": "warning"|"info"|"success", "message": "Dica curta e direta" }} 
        ] 
    }}
    """
    
    ai_response = ask_ai_analysis(prompt, session)
    
    if ai_response:
        return {
            "suggested_limit": ai_response.get("suggested_limit", suggested_limit),
            "available_monthly": round(monthly_available, 2),
            "total_balance": round(total_balance, 2),
            "monthly_category_avg": round(monthly_category_avg, 2),
            "months_to_goal": round(goal_amount / ai_response.get("suggested_limit", 1), 1) if goal_amount > 0 and ai_response.get("suggested_limit", 0) > 0 else 0,
            "goal_amount": goal_amount,
            "reasoning": reasons,
            "insights": ai_response.get("insights", insights),
            "explanation": ai_response.get("explanation", "Sugestão baseada em inteligência artificial.")
        }

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
    
    # TENTATIVA DE IA (Distribuição Inteligente)
    summary_for_ai = "\n".join([
        f"- ID {b['budget_id']} | Categoria: {b['category']} | Prioridade: {b['priority']} | Limite: {b['limit']} | Gasto: {b['current_spent']} | Resta: {b['remaining']}" 
        for b in budget_needs
    ])

    prompt = f"""
    Atue como um gestor de orçamento. Tenho R$ {available_amount:.2f} extras para distribuir (alocar) nestes orçamentos para cobrir gastos ou aumentar saldo.
    
    Situação dos Orçamentos:
    {summary_for_ai}
    
    Distribua o valor total de R$ {available_amount:.2f} de forma inteligente. Priorize contas essenciais e as que estão quase estourando.
    
    Retorne APENAS JSON:
    {{
        "allocations": [
            {{ "budget_id": (int, id original), "suggested_amount": (float, valor alocado) }}
        ]
    }}
    """
    
    ai_result = ask_ai_analysis(prompt, session)
    
    allocations = []
    
    # Processar resposta da IA
    if ai_result and "allocations" in ai_result:
        ai_allocs = {a["budget_id"]: a["suggested_amount"] for a in ai_result["allocations"]}
        
        for budget_need in budget_needs:
            if budget_need["budget_id"] in ai_allocs:
                amount = float(ai_allocs[budget_need["budget_id"]])
                allocations.append({
                    "budget_id": budget_need["budget_id"],
                    "category": budget_need["category"],
                    "priority": budget_need["priority"],
                    "suggested_amount": round(amount, 2),
                    "new_total": round(budget_need["current_spent"] + amount, 2),
                    "new_percentage": round((budget_need["current_spent"] + amount) / budget_need["limit"] * 100, 1) if budget_need["limit"] > 0 else 0
                })

    # Se IA falhou ou retornou vazio, usar MATEMÁTICA (Fallback)
    if not allocations:
        # Calcular alocação proporcional ao score (Matemática Original)
        remaining_amount = available_amount
        total_score = sum(b["need_score"] for b in budget_needs if b["need_score"] > 0)
        
        if total_score > 0:
            for budget_need in budget_needs:
                if budget_need["need_score"] > 0:
                    allocation = (budget_need["need_score"] / total_score) * available_amount
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

@app.post("/api/budgets/calculate-priorities")
def calculate_priorities(session: Session = Depends(get_session)):
    """
    IA analisa todos os orçamentos/metas e define a ordem de prioridade.
    Considera: urgência, essencialidade, progresso, dívidas, etc.
    """
    budgets = session.exec(select(Budget)).all()
    debts = session.exec(select(Debt)).all()
    
    if not budgets:
        return {"priorities": [], "message": "Nenhum orçamento cadastrado"}
    
    # Preparar resumo para a IA
    budgets_summary = "\n".join([
        f"- ID {b.id}: {b.category} (Tipo: {b.budget_type}, Limite: {b.limit}, Gasto: {b.spent}, Meta: {b.target_amount or 'N/A'}, Prioridade Manual: {b.priority})"
        for b in budgets
    ])
    
    debts_summary = "\n".join([
        f"- {d.name}: R$ {d.remaining} restantes, vence {d.dueDate}, Urgente: {d.isUrgent}"
        for d in debts
    ]) if debts else "Nenhuma dívida"
    
    prompt = f"""
    Você é um consultor financeiro. Analise os objetivos financeiros do usuário e REORDENE por prioridade.
    
    Critérios de Priorização (em ordem de importância):
    1. Dívidas urgentes (primeiro lugar SEMPRE)
    2. Necessidades essenciais (moradia, alimentação, saúde)
    3. Orçamentos que estão estourando (gasto > 80% do limite)
    4. Metas com prazo próximo
    5. Demais itens por prioridade manual do usuário
    
    Orçamentos/Metas do Usuário:
    {budgets_summary}
    
    Dívidas:
    {debts_summary}
    
    Para CADA orçamento, retorne um score de 0 a 100 (100 = mais prioritário) e uma razão curta.
    
    Retorne APENAS JSON:
    {{
        "priorities": [
            {{
                "budget_id": (int),
                "score": (0-100),
                "reason": "Explicação curta de por que essa posição"
            }}
        ]
    }}
    Ordene do mais prioritário (score maior) para o menos.
    """
    
    ai_result = ask_ai_analysis(prompt, session)
    
    if ai_result and "priorities" in ai_result:
        # Atualizar os budgets no banco com as prioridades da IA
        for item in ai_result["priorities"]:
            budget = session.get(Budget, item["budget_id"])
            if budget:
                budget.ai_priority_score = item.get("score", 50)
                budget.ai_priority_reason = item.get("reason", "")
                session.add(budget)
        
        session.commit()
        
        return {
            "success": True,
            "priorities": ai_result["priorities"],
            "total_analyzed": len(budgets)
        }
    
    # Fallback se IA falhar
    fallback_priorities = []
    priority_scores = {"essencial": 90, "alto": 70, "medio": 50, "baixo": 30}
    
    for b in budgets:
        score = priority_scores.get(b.priority, 50)
        # Aumentar score se estiver estourando
        if b.limit > 0 and (b.spent / b.limit * 100) > 80:
            score += 15
        fallback_priorities.append({
            "budget_id": b.id,
            "score": score,
            "reason": f"Prioridade {b.priority} definida manualmente"
        })
    
    # Ordenar por score
    fallback_priorities.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "success": False,
        "message": "IA indisponível, usando priorização manual",
        "priorities": fallback_priorities,
        "total_analyzed": len(budgets)
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

@app.put("/api/debts/{debt_id}/", response_model=Debt)
def update_debt(debt_id: int, debt_data: Debt, session: Session = Depends(get_session)):
    """Atualiza uma dívida existente."""
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    
    debt.name = debt_data.name
    debt.remaining = debt_data.remaining
    debt.monthly = debt_data.monthly
    debt.dueDate = debt_data.dueDate
    debt.status = debt_data.status
    debt.isUrgent = debt_data.isUrgent
    debt.debtType = debt_data.debtType
    debt.totalInstallments = debt_data.totalInstallments
    debt.currentInstallment = debt_data.currentInstallment
    
    session.add(debt)
    session.commit()
    session.refresh(debt)
    return debt

@app.delete("/api/debts/{debt_id}/")
def delete_debt(debt_id: int, session: Session = Depends(get_session)):
    """Deleta uma dívida."""
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    session.delete(debt)
    session.commit()
    return {"ok": True}

@app.delete("/api/debts/{debt_id}/")
def delete_debt(debt_id: int, session: Session = Depends(get_session)):
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    session.delete(debt)
    session.commit()
    return {"ok": True}

@app.get("/api/financial-health/summary/")
def get_financial_health_summary(session: Session = Depends(get_session)):
    """Retorna dados consolidados para os gráficos de Saúde Financeira."""
    debts = session.exec(select(Debt)).all()
    
    # Totais por status
    em_dia = [d for d in debts if d.status == "Em dia"]
    pendente = [d for d in debts if d.status == "Pendente"]
    atrasado = [d for d in debts if d.status == "Atrasado"]
    
    total_debt = sum(d.remaining or 0 for d in debts)
    total_em_dia = sum(d.remaining or 0 for d in em_dia)
    total_pendente = sum(d.remaining or 0 for d in pendente)
    total_atrasado = sum(d.remaining or 0 for d in atrasado)
    
    pending_payments = sum(d.monthly or 0 for d in pendente)
    
    # Próximo vencimento
    valid_dates = [d for d in debts if d.dueDate]
    valid_dates.sort(key=lambda x: x.dueDate)
    next_due = valid_dates[0].dueDate if valid_dates else None
    
    return {
        "totalDebt": total_debt,
        "pendingPayments": pending_payments,
        "nextDueDate": next_due,
        "statusBreakdown": {
            "emDia": {"count": len(em_dia), "total": total_em_dia},
            "pendente": {"count": len(pendente), "total": total_pendente},
            "atrasado": {"count": len(atrasado), "total": total_atrasado}
        },
        "debtCount": len(debts)
    }

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

@app.get("/api/behavioral-alerts/")
def get_behavioral_alerts(session: Session = Depends(get_session)):
    """Gera alertas comportamentais automáticos baseados na análise financeira."""
    from datetime import datetime, timedelta
    
    alerts = []
    today = datetime.now().date()
    
    # 1. Análise de Dívidas Atrasadas
    debts = session.exec(select(Debt)).all()
    atrasadas = [d for d in debts if d.status == "Atrasado"]
    if atrasadas:
        total_atrasado = sum(d.remaining or 0 for d in atrasadas)
        alerts.append({
            "id": "debt_overdue",
            "type": "danger",
            "icon": "alert-triangle",
            "title": f"⚠️ {len(atrasadas)} dívida(s) atrasada(s)",
            "message": f"Você tem R$ {total_atrasado:,.2f} em dívidas vencidas. Regularize para evitar juros.",
            "priority": 1
        })
    
    # 2. Dívidas prestes a vencer (próximos 7 dias)
    pendentes = [d for d in debts if d.status == "Pendente" and d.dueDate]
    proximas = []
    for d in pendentes:
        try:
            due_date = datetime.strptime(d.dueDate.split('T')[0], "%Y-%m-%d").date()
            days_until = (due_date - today).days
            if 0 <= days_until <= 7:
                proximas.append(d)
        except (ValueError, AttributeError):
            pass
    if proximas:
        alerts.append({
            "id": "debt_due_soon",
            "type": "warning",
            "icon": "clock",
            "title": f"📅 {len(proximas)} pagamento(s) próximo(s)",
            "message": f"Você tem pagamentos vencendo nos próximos 7 dias. Prepare-se!",
            "priority": 2
        })
    
    # 3. Análise de Gastos do Mês
    transactions = session.exec(select(Transaction)).all()
    first_day = today.replace(day=1)
    first_day_str = first_day.strftime("%Y-%m-%d")
    
    # Comparar datas como strings (formato YYYY-MM-DD é comparável)
    gastos_mes = [t for t in transactions if t.type == "expense" and t.date and t.date >= first_day_str]
    receitas_mes = [t for t in transactions if t.type == "income" and t.date and t.date >= first_day_str]
    
    total_gastos = sum(t.amount for t in gastos_mes)
    total_receitas = sum(t.amount for t in receitas_mes)
    
    # 4. Gastos maiores que receitas
    if total_gastos > total_receitas and total_receitas > 0:
        excesso = total_gastos - total_receitas
        alerts.append({
            "id": "spending_exceeds_income",
            "type": "danger",
            "icon": "trending-down",
            "title": "🔴 Gastos excedem receitas",
            "message": f"Este mês você gastou R$ {excesso:,.2f} a mais do que recebeu. Revise seus gastos!",
            "priority": 1
        })
    
    # 5. Alerta de endividamento alto
    total_dividas = sum(d.remaining or 0 for d in debts)
    if total_dividas > 0 and total_receitas > 0:
        ratio = total_dividas / total_receitas
        if ratio > 3:
            alerts.append({
                "id": "high_debt_ratio",
                "type": "warning",
                "icon": "alert-circle",
                "title": "⚠️ Endividamento elevado",
                "message": f"Suas dívidas representam {ratio:.1f}x sua renda mensal. Considere renegociar.",
                "priority": 2
            })
    
    # 6. Alerta positivo - Saúde financeira OK
    if not atrasadas and total_gastos <= total_receitas:
        alerts.append({
            "id": "financial_health_ok",
            "type": "success",
            "icon": "check-circle",
            "title": "🎉 Parabéns!",
            "message": "Sua saúde financeira está em dia. Continue assim!",
            "priority": 3
        })
    
    # Ordenar por prioridade
    alerts.sort(key=lambda x: x["priority"])
    
    return {
        "alerts": alerts,
        "summary": {
            "totalDebts": len(debts),
            "overdueDebts": len(atrasadas),
            "monthlyExpenses": total_gastos,
            "monthlyIncome": total_receitas,
            "balance": total_receitas - total_gastos
        }
    }

@app.get("/api/ai/financial-health/")
def get_ai_financial_health_analysis(session: Session = Depends(get_session)):
    """Análise de saúde financeira usando IA."""
    from datetime import datetime
    
    # Coleta de dados
    debts = session.exec(select(Debt)).all()
    transactions = session.exec(select(Transaction)).all()
    
    today = datetime.now().date()
    first_day = today.replace(day=1)
    first_day_str = first_day.strftime("%Y-%m-%d")  # Converter para string para comparar
    
    # Calcular métricas
    total_dividas = sum(d.remaining or 0 for d in debts)
    atrasadas = [d for d in debts if d.status == "Atrasado"]
    total_atrasado = sum(d.remaining or 0 for d in atrasadas)
    
    # Comparar datas como strings (formato YYYY-MM-DD é comparável)
    gastos_mes = sum(t.amount for t in transactions if t.type == "expense" and t.date and t.date >= first_day_str)
    receitas_mes = sum(t.amount for t in transactions if t.type == "income" and t.date and t.date >= first_day_str)
    
    # Montar contexto para IA
    debts_info = [
        {
            "nome": d.name, 
            "restante": d.remaining, 
            "parcela": d.monthly, 
            "status": d.status,
            "tipo": getattr(d, 'debtType', 'parcelado'),
            "parcelas": f"{getattr(d, 'currentInstallment', '?')}/{getattr(d, 'totalInstallments', '?')}" if getattr(d, 'debtType', 'parcelado') == "parcelado" else "Recorrente"
        }
        for d in debts[:15]  # Aumentando limite levemente pois é importante
    ]
    
    prompt = f"""
Analise a saúde financeira do usuário com base nos dados:

DÍVIDAS TOTAIS: R$ {total_dividas:,.2f}
DÍVIDAS ATRASADAS: R$ {total_atrasado:,.2f} ({len(atrasadas)} itens)
GASTOS DO MÊS: R$ {gastos_mes:,.2f}
RECEITAS DO MÊS: R$ {receitas_mes:,.2f}
SALDO DO MÊS: R$ {receitas_mes - gastos_mes:,.2f}

LISTA DE DÍVIDAS:
{debts_info}

Retorne um JSON com:
{{
    "score": 0-100 (pontuação de saúde financeira),
    "status": "critical" | "warning" | "good" | "excellent",
    "summary": "Resumo em 1 frase da situação",
    "recommendations": ["lista de 3-5 recomendações específicas"],
    "priority_debt": "nome da dívida que deve priorizar pagar primeiro e porquê",
    "savings_tip": "dica específica para economizar baseada nos dados"
}}
"""
    
    ai_result = ask_ai_analysis(prompt, session)
    
    if ai_result:
        return {
            "success": True,
            "analysis": ai_result,
            "data": {
                "totalDebts": total_dividas,
                "overdueDebts": total_atrasado,
                "monthlyExpenses": gastos_mes,
                "monthlyIncome": receitas_mes
            }
        }
    
    # Fallback se IA não disponível
    score = 100
    if total_atrasado > 0:
        score -= 40
    if gastos_mes > receitas_mes:
        score -= 30
    if total_dividas > receitas_mes * 3:
        score -= 20
    
    status = "excellent" if score >= 80 else "good" if score >= 60 else "warning" if score >= 40 else "critical"
    
    return {
        "success": True,
        "analysis": {
            "score": max(0, score),
            "status": status,
            "summary": "Análise automática baseada nos seus dados financeiros.",
            "recommendations": [
                "Priorize o pagamento de dívidas atrasadas",
                "Mantenha seus gastos abaixo das receitas",
                "Crie uma reserva de emergência",
                "Renegocie dívidas com juros altos"
            ],
            "priority_debt": atrasadas[0].name if atrasadas else "Nenhuma dívida urgente",
            "savings_tip": "Revise gastos recorrentes como assinaturas e serviços não utilizados"
        },
        "data": {
            "totalDebts": total_dividas,
            "overdueDebts": total_atrasado,
            "monthlyExpenses": gastos_mes,
            "monthlyIncome": receitas_mes
        },
        "ai_available": False
    }

@app.get("/api/ai/debt-priority/")
def get_ai_debt_priority(session: Session = Depends(get_session)):
    """IA analisa e prioriza dívidas para pagamento."""
    
    debts = session.exec(select(Debt)).all()
    
    if not debts:
        return {
            "success": True,
            "message": "Nenhuma dívida cadastrada!",
            "priorities": []
        }
    
    # Montar dados das dívidas
    debts_data = []
    for d in debts:
        debts_data.append({
            "id": d.id,
            "nome": d.name,
            "valor_restante": d.remaining,
            "parcela_mensal": d.monthly,
            "status": d.status,
            "vencimento": str(d.dueDate) if d.dueDate else "Não definido",
            "tipo": getattr(d, 'debtType', 'parcelado'),
            "info_parcelas": f"{getattr(d, 'currentInstallment', '?')}/{getattr(d, 'totalInstallments', '?')}" if getattr(d, 'debtType', 'parcelado') == "parcelado" else "Recorrente/Fixo"
        })
    
    prompt = f"""
Analise as seguintes dívidas e crie uma ordem de prioridade para pagamento.
Considere: status (atrasado é urgente), valor da parcela, impacto financeiro.

DÍVIDAS:
{debts_data}

Retorne um JSON com:
{{
    "priorities": [
        {{
            "id": ID_DA_DIVIDA,
            "nome": "nome da dívida",
            "prioridade": 1 (mais urgente) a N (menos urgente),
            "urgencia": "alta" | "media" | "baixa",
            "motivo": "explicação clara de porquê priorizar esta",
            "acao_recomendada": "o que fazer com esta dívida específica",
            "impacto_se_ignorar": "consequência de não pagar"
        }}
    ],
    "estrategia_geral": "resumo da estratégia de pagamento recomendada",
    "economia_potencial": "quanto pode economizar seguindo as recomendações",
    "tempo_estimado": "tempo estimado para quitar todas as dívidas seguindo o plano"
}}
"""
    
    ai_result = ask_ai_analysis(prompt, session)
    
    if ai_result:
        return {
            "success": True,
            "analysis": ai_result,
            "total_debts": len(debts),
            "ai_powered": True
        }
    
    # Fallback: priorizar por status e valor
    fallback_priorities = []
    status_order = {"Atrasado": 1, "Pendente": 2, "Em dia": 3}
    sorted_debts = sorted(debts, key=lambda d: (status_order.get(d.status, 3), -(d.remaining or 0)))
    
    for i, d in enumerate(sorted_debts, 1):
        urgencia = "alta" if d.status == "Atrasado" else "media" if d.status == "Pendente" else "baixa"
        fallback_priorities.append({
            "id": d.id,
            "nome": d.name,
            "prioridade": i,
            "urgencia": urgencia,
            "valor_restante": d.remaining,
            "parcela": d.monthly,
            "status": d.status,
            "motivo": f"{'URGENTE: Dívida atrasada!' if d.status == 'Atrasado' else 'Pagamento pendente' if d.status == 'Pendente' else 'Em dia, manter controle'}",
            "acao_recomendada": "Pagar imediatamente" if d.status == "Atrasado" else "Agendar pagamento" if d.status == "Pendente" else "Continuar pagando normalmente"
        })
    
    return {
        "success": True,
        "priorities": fallback_priorities,
        "estrategia_geral": "Priorize dívidas atrasadas, depois pendentes, por ordem de maior valor.",
        "total_debts": len(debts),
        "ai_powered": False
    }

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

@app.put("/api/assets/{asset_id}/", response_model=Asset)
def update_asset(asset_id: int, asset_data: Asset, session: Session = Depends(get_session)):
    """Atualiza um ativo existente."""
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    
    asset.name = asset_data.name
    asset.type = asset_data.type
    asset.value = asset_data.value
    asset.iconType = asset_data.iconType
    
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

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

@app.put("/api/liabilities/{liability_id}/", response_model=Liability)
def update_liability(liability_id: int, liability_data: Liability, session: Session = Depends(get_session)):
    """Atualiza um passivo existente."""
    liability = session.get(Liability, liability_id)
    if not liability:
        raise HTTPException(status_code=404, detail="Passivo não encontrado")
    
    liability.name = liability_data.name
    liability.type = liability_data.type
    liability.value = liability_data.value
    liability.iconType = liability_data.iconType
    
    session.add(liability)
    session.commit()
    session.refresh(liability)
    return liability


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
def get_leakage_analysis(session: Session = Depends(get_session)):
    """
    Analisa padrões de gastos usando IA para identificar vazamentos.
    Lê transações reais e submete à Amazon Nova via OpenRouter.
    """
    # 1. Buscar transações dos últimos 30 dias
    from datetime import datetime, timedelta
    cutoff_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    transactions = session.exec(select(Transaction).where(Transaction.date >= cutoff_date)).all()
    
    # Se não houver dados suficientes, retorna vazio
    if len(transactions) < 3:
        return {
            "totalPotential": 0,
            "leaksCount": 0,
            "period": "Últimos 30 Dias",
            "suggestions": []
        }
        
    # 2. Preparar resumo para a IA (anonimizado e agragado para economizar tokens)
    expenses = [t for t in transactions if t.type == 'expense']
    tx_summary = "\n".join([f"- {t.description}: R$ {t.amount:.2f} ({t.category})" for t in expenses])
    
    prompt = f"""
    Analise estas despesas recentes e identifique "vazamentos" (gastos supérfluos, assinaturas esquecidas, taxas ou impulsos).
    
    Transações:
    {tx_summary}
    
    Retorne um JSON com este formato exato:
    {{
        "totalPotential": (soma da economia estimada),
        "leaksCount": (quantidade de itens),
        "suggestions": [
            {{
                "id": 1,
                "title": "Título curto do vazamento",
                "description": "Explicação breve de por que cortar",
                "amount": (valor estimado mensal),
                "category": "subscription" | "impulse" | "fees" | "other",
                "actionLabel": "Ação sugerida (ex: Cancelar)"
            }}
        ]
    }}
    Se não achar nada grave, retorne listas vazias.
    """
    
    # 3. Chamar a IA
    ai_result = ask_ai_analysis(prompt, session)
    
    if ai_result:
        # Adicionar o período que estava fixo no código anterior
        ai_result["period"] = "Últimos 30 Dias"
        return ai_result
        
    # Fallback se a IA falhar ou não estiver configurada
    return {
        "totalPotential": 0,
        "leaksCount": 0,
        "period": "Últimos 30 Dias (IA Indisponível)",
        "suggestions": []
    }

@app.get("/api/interconnected-summary/")
def get_interconnected_summary(session: Session = Depends(get_session)):
    """Agrega Metas, Dívidas e Insights em uma única chamada."""
    goals = session.exec(select(Goal)).all()
    debts = session.exec(select(Debt)).all()
    
    # Buscar algumas transações recentes para dar contexto de fluxo de caixa
    transactions = session.exec(select(Transaction).limit(10)).all() # Últimas 10
    
    # Preparar dados para a IA
    goals_summary = "\n".join([f"- Meta: {g.name} (Atual: {g.currentAmount}, Alvo: {g.targetAmount})" for g in goals])
    debts_summary = "\n".join([f"- Dívida: {d.name} (Valor: {d.value}, Vencimento: {d.dueDate})" for d in debts])
    
    # Lógica padrão (fallback)
    insights_list = []
    if goals: insights_list.append(f"Você tem {len(goals)} metas ativas.")
    if debts: insights_list.append(f"Atenção com {len(debts)} dívidas pendentes.")
    
    suggested_cuts = []

    # TENTATIVA DE IA
    prompt = f"""
    Analise a situação financeira global e forneça insights estratégicos "Interligados".
    
    Metas Ativas:
    {goals_summary or "Nenhuma"}
    
    Dívidas Pendentes:
    {debts_summary or "Nenhuma"}
    
    Com base nisso, sugira:
    1. Melhores decisões (ex: focar na dívida X antes da meta Y).
    2. Cortes sugeridos (especifique o valor estimado de economia).
    
    Retorne APENAS JSON:
    {{
        "bestDecisions": ["Decisão estratégica 1", "Decisão 2"],
        "suggestedCuts": [
            {{ "text": "Descrição do corte (curta)", "value": (float, valor mensal estimado) }}
        ]
    }}
    Seja breve e direto.
    """
    
    ai_result = ask_ai_analysis(prompt, session)
    
    if ai_result:
        # Garantir que suggestedCuts tenha a estrutura correta mesmo se a IA alucinar
        raw_cuts = ai_result.get("suggestedCuts", [])
        formatted_cuts = []
        for cut in raw_cuts:
            if isinstance(cut, dict) and "text" in cut and "value" in cut:
                formatted_cuts.append(cut)
            elif isinstance(cut, str):
                # Fallback se IA retornar string: tenta extrair valor ou poe default
                formatted_cuts.append({"text": cut, "value": 0})

        insights = {
            "bestDecisions": ai_result.get("bestDecisions", insights_list),
            "suggestedCuts": formatted_cuts
        }
    else:
        insights = {
            "bestDecisions": insights_list,
            "suggestedCuts": []
        }
    
    # Ordenar dívidas por urgência para exibição
    urgent_debts = sorted([d for d in debts if d.isUrgent], key=lambda x: x.value, reverse=True)

    return {
        "activeGoals": goals[:2],
        "upcomingDebts": urgent_debts[:2],
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
    
    monthly_income = sum(incomes) / 3 if incomes else 0 # Média aproximada
    monthly_expense = sum(expenses) / 3 if expenses else 0
    
    # TENTATIVA DE IA (Sugestão de Cenários de Economia Interativa)
    prompt = f"""
    Atue como analista financeiro. Com base na renda (R$ {monthly_income:.2f}) e despesa (R$ {monthly_expense:.2f}), sugira 4 cenários práticos de economia que o usuário pode ativar.
    
    Cada cenário deve ser uma ação concreta (ex: "Reduzir Delivery", "Revisar Assinaturas", "Economizar Energia").
    
    Retorne APENAS JSON com esta estrutura EXATA para compatibilidade com o frontend:
    {{
        "scenarios": [
            {{ 
                "id": 1, 
                "label": "Nome da Ação (curto)", 
                "savings": (valor numérico float da economia mensal estimada), 
                "iconName": "ShoppingBag" ou "Clapperboard" ou "Car" ou "Zap" (escolha o melhor ícone) 
            }}
        ]
    }}
    """
    
    ai_result = ask_ai_analysis(prompt, session)
    
    scenarios = []
    if ai_result and "scenarios" in ai_result:
        scenarios = ai_result["scenarios"]
    else:
        # Fallback de cenários padrão se IA falhar
        scenarios = [
            {"id": 1, "label": "Otimizar Alimentação", "savings": monthly_expense * 0.10, "iconName": "ShoppingBag"},
            {"id": 2, "label": "Revisar Assinaturas", "savings": 59.90, "iconName": "Clapperboard"},
            {"id": 3, "label": "Transporte Alternativo", "savings": 150.00, "iconName": "Car"},
            {"id": 4, "label": "Reduzir Energia", "savings": 80.00, "iconName": "Zap"}
        ]
    
    # Adicionar campo 'checked: false' (embora o frontend faça isso, é bom garantir o dado limpo)
    for s in scenarios:
        if "checked" not in s: s["checked"] = False

    return {
        "currentBalance": total_balance,
        "monthlyIncome": monthly_income,
        "baseExpense": monthly_expense,
        "scenarios": scenarios
    }
