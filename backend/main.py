from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Session, create_engine, select
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import random
import os

# ==========================================
# 1. CONFIGURAÇÃO DO BANCO DE DADOS
# ==========================================
# Prioriza DATABASE_URL (Supabase/PostgreSQL) sobre DATABASE_FILE (SQLite)
database_url = os.getenv("DATABASE_URL")

if database_url:
    # Usando Supabase/PostgreSQL
    engine = create_engine(database_url)
else:
    # Fallback para SQLite local
    sqlite_file_name = os.getenv("DATABASE_FILE", "database/database.db")
    sqlite_url = f"sqlite:///{sqlite_file_name}"
    
    # Garante que o diretório do banco exista
    db_dir = os.path.dirname(sqlite_file_name)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
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
    status: str = "completed" # 'completed' | 'pending'

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
    category: str = Field(default="Outros")

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

class NetWorthGoal(SQLModel, table=True):
    """Meta de Patrimônio - permite ao usuário definir metas de acumulação de ativos"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str  # Ex: "Primeiro Milhão", "Aposentadoria"
    target_amount: float  # Valor alvo em R$
    current_amount: float = 0  # Será calculado automaticamente
    deadline: Optional[str] = None  # Data limite (YYYY-MM-DD)
    created_at: str = ""  # Data de criação
    is_active: bool = True  # Se é a meta ativa


class PaycheckAllocation(SQLModel, table=True):
    """Alocação de salário quinzenal - armazena o cabeçalho da alocação"""
    id: Optional[int] = Field(default=None, primary_key=True)
    paycheck_date: str  # Data do pagamento (YYYY-MM-DD)
    paycheck_amount: float  # Valor recebido
    created_at: str = ""  # Data de criação
    status: str = "draft"  # draft, applied, cancelled


class AllocationItem(SQLModel, table=True):
    """Itens individuais de uma alocação"""
    id: Optional[int] = Field(default=None, primary_key=True)
    allocation_id: int = Field(foreign_key="paycheckallocation.id")
    category: str  # "essentials", "goals", "budgets", "safety_margin"
    name: str  # Nome do item (ex: "Aluguel", "Viagem")
    amount: float
    percentage: float
    reference_id: Optional[int] = None  # ID da dívida/meta/orçamento relacionado
    reference_type: Optional[str] = None  # "debt", "goal", "budget"


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

# --- BACKUP & RESTAURAÇÃO ---

@app.get("/api/backup/export")
def export_backup(session: Session = Depends(get_session)):
    """
    Exporta todos os dados do banco em formato JSON para backup.
    Retorna um arquivo JSON com todas as tabelas.
    """
    # Buscar todos os dados de cada tabela
    profile = session.exec(select(UserProfile)).first()
    accounts = session.exec(select(Account)).all()
    transactions = session.exec(select(Transaction)).all()
    budgets = session.exec(select(Budget)).all()
    budget_items = session.exec(select(BudgetItem)).all()
    goals = session.exec(select(Goal)).all()
    debts = session.exec(select(Debt)).all()
    categories = session.exec(select(Category)).all()
    alerts = session.exec(select(Alert)).all()
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    
    # Converter para dicionários
    backup_data = {
        "version": "1.0",
        "appName": "Axxy Finance",
        "exportedAt": datetime.now().isoformat(),
        "data": {
            "profile": {
                "name": profile.name if profile else "Usuário Axxy",
                "email": profile.email if profile else "usuario@email.com",
                "avatar": profile.avatar if profile else ""
            } if profile else None,
            "accounts": [
                {"id": a.id, "name": a.name, "type": a.type, "balance": a.balance, "color": a.color, "icon": a.icon}
                for a in accounts
            ],
            "transactions": [
                {"id": t.id, "accountId": t.accountId, "description": t.description, "amount": t.amount, 
                 "type": t.type, "date": t.date, "category": t.category, "status": t.status}
                for t in transactions
            ],
            "budgets": [
                {"id": b.id, "category": b.category, "spent": b.spent, "limit": b.limit, "icon": b.icon,
                 "priority": b.priority, "goal": b.goal, "budget_type": b.budget_type,
                 "target_amount": b.target_amount, "current_amount": b.current_amount, "deadline": b.deadline,
                 "ai_priority_score": b.ai_priority_score, "ai_priority_reason": b.ai_priority_reason}
                for b in budgets
            ],
            "budget_items": [
                {"id": bi.id, "budget_id": bi.budget_id, "name": bi.name, "target_amount": bi.target_amount,
                 "spent": bi.spent, "completed": bi.completed}
                for bi in budget_items
            ],
            "goals": [
                {"id": g.id, "name": g.name, "currentAmount": g.currentAmount, "targetAmount": g.targetAmount,
                 "deadline": g.deadline, "color": g.color, "imageUrl": g.imageUrl}
                for g in goals
            ],
            "debts": [
                {"id": d.id, "name": d.name, "remaining": d.remaining, "monthly": d.monthly,
                 "dueDate": d.dueDate, "status": d.status, "isUrgent": d.isUrgent, "debtType": d.debtType,
                 "totalInstallments": d.totalInstallments, "currentInstallment": d.currentInstallment}
                for d in debts
            ],
            "categories": [
                {"id": c.id, "name": c.name, "type": c.type, "color": c.color}
                for c in categories
            ],
            "alerts": [
                {"id": a.id, "category": a.category, "budget": a.budget, "threshold": a.threshold,
                 "enabled": a.enabled, "iconName": a.iconName, "colorClass": a.colorClass}
                for a in alerts
            ],
            "assets": [
                {"id": a.id, "name": a.name, "type": a.type, "value": a.value, "iconType": a.iconType}
                for a in assets
            ],
            "liabilities": [
                {"id": l.id, "name": l.name, "type": l.type, "value": l.value, "iconType": l.iconType}
                for l in liabilities
            ]
        }
    }
    
    return backup_data


@app.post("/api/backup/import")
def import_backup(backup_data: dict, session: Session = Depends(get_session)):
    """
    Importa dados de um backup JSON.
    ATENÇÃO: Isso substitui TODOS os dados existentes!
    """
    try:
        # Validar estrutura básica
        if "data" not in backup_data:
            raise HTTPException(status_code=400, detail="Formato de backup inválido: campo 'data' não encontrado")
        
        data = backup_data["data"]
        
        # Limpar dados existentes (em ordem para respeitar foreign keys)
        session.exec(select(BudgetItem)).all()
        for item in session.exec(select(BudgetItem)).all():
            session.delete(item)
        
        for table in [Transaction, Budget, Goal, Debt, Category, Alert, Asset, Liability, Account, UserProfile]:
            for record in session.exec(select(table)).all():
                session.delete(record)
        
        session.commit()
        
        # Importar perfil
        if data.get("profile"):
            p = data["profile"]
            profile = UserProfile(name=p.get("name", "Usuário"), email=p.get("email", ""), avatar=p.get("avatar", ""))
            session.add(profile)
        
        # Importar contas
        account_id_map = {}  # Mapear IDs antigos para novos
        for acc in data.get("accounts", []):
            old_id = acc.pop("id", None)
            new_account = Account(**acc)
            session.add(new_account)
            session.flush()  # Para obter o novo ID
            if old_id:
                account_id_map[old_id] = new_account.id
        
        # Importar transações (atualizando accountId)
        for tx in data.get("transactions", []):
            tx.pop("id", None)
            old_account_id = tx.get("accountId")
            if old_account_id and old_account_id in account_id_map:
                tx["accountId"] = account_id_map[old_account_id]
            session.add(Transaction(**tx))
        
        # Importar orçamentos
        budget_id_map = {}
        for bud in data.get("budgets", []):
            old_id = bud.pop("id", None)
            new_budget = Budget(**bud)
            session.add(new_budget)
            session.flush()
            if old_id:
                budget_id_map[old_id] = new_budget.id
        
        # Importar itens de orçamento
        for bi in data.get("budget_items", []):
            bi.pop("id", None)
            old_budget_id = bi.get("budget_id")
            if old_budget_id and old_budget_id in budget_id_map:
                bi["budget_id"] = budget_id_map[old_budget_id]
            session.add(BudgetItem(**bi))
        
        # Importar metas
        for goal in data.get("goals", []):
            goal.pop("id", None)
            session.add(Goal(**goal))
        
        # Importar dívidas
        for debt in data.get("debts", []):
            debt.pop("id", None)
            session.add(Debt(**debt))
        
        # Importar categorias
        for cat in data.get("categories", []):
            cat.pop("id", None)
            session.add(Category(**cat))
        
        # Importar alertas
        for alert in data.get("alerts", []):
            alert.pop("id", None)
            session.add(Alert(**alert))
        
        # Importar ativos
        for asset in data.get("assets", []):
            asset.pop("id", None)
            session.add(Asset(**asset))
        
        # Importar passivos
        for liability in data.get("liabilities", []):
            liability.pop("id", None)
            session.add(Liability(**liability))
        
        session.commit()
        
        return {
            "success": True,
            "message": "Backup importado com sucesso!",
            "imported": {
                "accounts": len(data.get("accounts", [])),
                "transactions": len(data.get("transactions", [])),
                "budgets": len(data.get("budgets", [])),
                "goals": len(data.get("goals", [])),
                "debts": len(data.get("debts", [])),
                "categories": len(data.get("categories", []))
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao importar backup: {str(e)}")


# --- RESET DO SISTEMA (FACTORY RESET) ---

@app.post("/api/system/reset")
def factory_reset(session: Session = Depends(get_session)):
    """
    Restaura o sistema para as configurações de fábrica.
    ATENÇÃO: Esta ação é IRREVERSÍVEL e apaga TODOS os dados!
    """
    try:
        # Deletar dados de todas as tabelas (em ordem para respeitar foreign keys)
        tables_to_clear = [
            AllocationItem,
            PaycheckAllocation,
            BudgetItem,
            Transaction,
            Budget,
            Goal,
            Debt,
            Category,
            Alert,
            Asset,
            Liability,
            Account,
            NetWorthGoal,
            AISettings,
            UserProfile,
        ]
        
        deleted_counts = {}
        
        for table in tables_to_clear:
            records = session.exec(select(table)).all()
            count = len(records)
            for record in records:
                session.delete(record)
            deleted_counts[table.__name__] = count
        
        session.commit()
        
        # Criar perfil padrão
        default_profile = UserProfile(
            name="Usuário Axxy",
            email="usuario@email.com",
            avatar=""
        )
        session.add(default_profile)
        session.commit()
        
        return {
            "success": True,
            "message": "Sistema restaurado para as configurações de fábrica!",
            "deleted": deleted_counts
        }
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao resetar sistema: {str(e)}")


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
    # Garantir que defaults sejam respeitados se não enviados
    if not debt.category:
        debt.category = "Outros"
        
    session.add(debt)
    session.commit()
    session.refresh(debt)
    
    # Criar transação correspondente se for dívida nova (opcional, dependendo da lógica de negócio)
    # Por enquanto apenas cria a dívida
    
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
    if "isUrgent" in debt_data.model_fields_set: # Use model_fields_set for Pydantic v2+ partial updates
        debt.isUrgent = debt_data.isUrgent
    if "debtType" in debt_data.model_fields_set:
        debt.debtType = debt_data.debtType
    if "totalInstallments" in debt_data.model_fields_set:
        debt.totalInstallments = debt_data.totalInstallments
    if "currentInstallment" in debt_data.model_fields_set:
        debt.currentInstallment = debt_data.currentInstallment
    if "category" in debt_data.model_fields_set:
        debt.category = debt_data.category
        
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

class DebtPayment(BaseModel):
    amount: float
    accountId: int
    date: str

@app.post("/api/debts/{debt_id}/pay/")
def pay_debt(debt_id: int, payment: DebtPayment, session: Session = Depends(get_session)):
    """Registra um pagamento de dívida, criando uma transação e atualizando saldo."""
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
        
    account = session.get(Account, payment.accountId)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
        
    # 1. Criar Transação de Despesa
    transaction = Transaction(
        description=f"Pagamento: {debt.name}",
        amount=payment.amount,
        type="expense",
        category=debt.category or "Dívidas",
        date=payment.date,
        accountId=payment.accountId
    )
    session.add(transaction)
    
    # 2. Atualizar Saldo da Conta
    account.balance -= payment.amount
    session.add(account)
    
    # 3. Atualizar Dívida (Valor Restante)
    if debt.remaining > 0:
        debt.remaining = max(0, debt.remaining - payment.amount)
        
    # 4. Atualizar Parcela Atual (se for parcelado)
    if debt.debtType == 'parcelado' and debt.currentInstallment and debt.totalInstallments:
        if debt.currentInstallment < debt.totalInstallments:
             debt.currentInstallment += 1
             
    # 5. Atualizar Status se quitado
    if debt.remaining == 0 and debt.debtType != 'fixo':
        debt.status = "Em dia" # Ou finalizar? Por enquanto 'Em dia'
        
    session.commit()
    session.refresh(debt)
    
    return {"success": True, "new_remaining": debt.remaining}

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

@app.put("/api/alerts/{alert_id}/", response_model=Alert)
def update_alert(alert_id: int, alert_data: Alert, session: Session = Depends(get_session)):
    """Atualiza um alerta existente (ativar/desativar, mudar threshold, etc)."""
    alert = session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    alert.category = alert_data.category
    alert.budget = alert_data.budget
    alert.threshold = alert_data.threshold
    alert.enabled = alert_data.enabled
    alert.iconName = alert_data.iconName
    alert.colorClass = alert_data.colorClass
    
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


# --- METAS DE PATRIMÔNIO ---

@app.get("/api/net-worth/goals/")
def get_net_worth_goals(session: Session = Depends(get_session)):
    """Retorna todas as metas de patrimônio."""
    goals = session.exec(select(NetWorthGoal)).all()
    
    # Calcular o patrimônio atual para cada meta
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    current_net_worth = sum(a.value for a in assets) - sum(l.value for l in liabilities)
    
    # Atualizar current_amount de todas as metas
    for goal in goals:
        goal.current_amount = current_net_worth
    
    return goals

@app.get("/api/net-worth/goals/active")
def get_active_net_worth_goal(session: Session = Depends(get_session)):
    """Retorna a meta de patrimônio ativa."""
    goal = session.exec(select(NetWorthGoal).where(NetWorthGoal.is_active == True)).first()
    
    if not goal:
        return None
    
    # Calcular patrimônio atual
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    current_net_worth = sum(a.value for a in assets) - sum(l.value for l in liabilities)
    goal.current_amount = current_net_worth
    
    # Calcular progresso
    progress = (current_net_worth / goal.target_amount * 100) if goal.target_amount > 0 else 0
    
    return {
        "goal": goal,
        "progress": min(100, progress),
        "remaining": max(0, goal.target_amount - current_net_worth)
    }

@app.post("/api/net-worth/goals/")
def create_net_worth_goal(goal: NetWorthGoal, session: Session = Depends(get_session)):
    """Cria uma nova meta de patrimônio."""
    from datetime import datetime
    
    # Se for a primeira meta ou marcada como ativa, desativa as outras
    if goal.is_active:
        existing_goals = session.exec(select(NetWorthGoal).where(NetWorthGoal.is_active == True)).all()
        for g in existing_goals:
            g.is_active = False
            session.add(g)
    
    goal.created_at = datetime.now().strftime("%Y-%m-%d")
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal

@app.put("/api/net-worth/goals/{goal_id}/")
def update_net_worth_goal(goal_id: int, goal_data: NetWorthGoal, session: Session = Depends(get_session)):
    """Atualiza uma meta de patrimônio."""
    goal = session.get(NetWorthGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    goal.name = goal_data.name
    goal.target_amount = goal_data.target_amount
    goal.deadline = goal_data.deadline
    goal.is_active = goal_data.is_active
    
    # Se marcada como ativa, desativa as outras
    if goal.is_active:
        other_goals = session.exec(select(NetWorthGoal).where(NetWorthGoal.id != goal_id, NetWorthGoal.is_active == True)).all()
        for g in other_goals:
            g.is_active = False
            session.add(g)
    
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal

@app.delete("/api/net-worth/goals/{goal_id}/")
def delete_net_worth_goal(goal_id: int, session: Session = Depends(get_session)):
    """Deleta uma meta de patrimônio."""
    goal = session.get(NetWorthGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    session.delete(goal)
    session.commit()
    return {"ok": True}


# --- INSIGHT DE IA PARA PATRIMÔNIO ---

@app.get("/api/net-worth/ai-insight/")
def get_net_worth_ai_insight(session: Session = Depends(get_session)):
    """Gera insight de IA sobre o patrimônio do usuário."""
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    
    total_assets = sum(a.value for a in assets)
    total_liabilities = sum(l.value for l in liabilities)
    net_worth = total_assets - total_liabilities
    
    # Composição por tipo
    asset_composition = {}
    for a in assets:
        asset_composition[a.iconType] = asset_composition.get(a.iconType, 0) + a.value
    
    # Buscar meta ativa
    active_goal = session.exec(select(NetWorthGoal).where(NetWorthGoal.is_active == True)).first()
    
    prompt = f"""
    Analise o patrimônio do usuário e forneça um insight personalizado e acionável.
    
    DADOS DO PATRIMÔNIO:
    - Total de Ativos: R$ {total_assets:,.2f}
    - Total de Passivos: R$ {total_liabilities:,.2f}
    - Patrimônio Líquido: R$ {net_worth:,.2f}
    
    COMPOSIÇÃO DOS ATIVOS:
    {', '.join([f"{k}: R$ {v:,.2f}" for k, v in asset_composition.items()]) if asset_composition else "Nenhum ativo cadastrado"}
    
    ATIVOS DETALHADOS:
    {', '.join([f"{a.name} ({a.type}): R$ {a.value:,.2f}" for a in assets]) if assets else "Nenhum"}
    
    PASSIVOS DETALHADOS:
    {', '.join([f"{l.name} ({l.type}): R$ {l.value:,.2f}" for l in liabilities]) if liabilities else "Nenhum"}
    
    META ATIVA: {"R$ " + f"{active_goal.target_amount:,.2f}" if active_goal else "Nenhuma meta definida"}
    
    Retorne JSON com:
    {{
        "insight_title": "Título curto e chamativo (máx 5 palavras)",
        "insight_message": "Conselho prático e personalizado (2-3 frases)",
        "action_text": "Texto do botão de ação (ex: 'Explorar opções', 'Ver sugestões')",
        "priority": "high" ou "medium" ou "low",
        "category": "diversificacao" ou "reducao_passivos" ou "investimento" ou "meta" ou "geral"
    }}
    """
    
    ai_result = ask_ai_analysis(prompt, session)
    
    if ai_result:
        return {
            "success": True,
            "insight": ai_result
        }
    
    # Fallback sem IA - gerar insight baseado em regras
    if total_assets == 0:
        insight = {
            "insight_title": "Comece Agora!",
            "insight_message": "Você ainda não cadastrou nenhum ativo. Adicione seus bens para começar a acompanhar seu patrimônio.",
            "action_text": "Adicionar ativo",
            "priority": "high",
            "category": "geral"
        }
    elif total_liabilities > total_assets * 0.5:
        insight = {
            "insight_title": "Atenção aos Passivos",
            "insight_message": f"Seus passivos representam mais de 50% dos seus ativos. Considere criar um plano para reduzir dívidas.",
            "action_text": "Ver estratégias",
            "priority": "high",
            "category": "reducao_passivos"
        }
    elif len(asset_composition) == 1:
        insight = {
            "insight_title": "Diversifique",
            "insight_message": "Seu patrimônio está concentrado em um único tipo de ativo. Considere diversificar para reduzir riscos.",
            "action_text": "Explorar opções",
            "priority": "medium",
            "category": "diversificacao"
        }
    else:
        insight = {
            "insight_title": "Continue Assim!",
            "insight_message": f"Seu patrimônio de R$ {net_worth:,.2f} está bem estruturado. Continue poupando e investindo regularmente.",
            "action_text": "Ver detalhes",
            "priority": "low",
            "category": "geral"
        }
    
    return {
        "success": True,
        "insight": insight
    }


# ==========================================
# 6. ROTAS AVANÇADAS (AGREGADORES E IA)
# ==========================================

def get_unified_transactions(session: Session, start_date: str, end_date: str, account_filter: str = 'all') -> List[Transaction]:
    """
    Retorna uma lista unificada de transações reais e virtuais (dívidas a pagar).
    Evita contagem duplicada se a dívida já tiver sido paga (existir transação real).
    """
    # 1. Buscar transações reais
    query = select(Transaction).where(Transaction.date >= start_date).where(Transaction.date <= end_date)
    if account_filter != 'all':
        query = query.where(Transaction.accountId == int(account_filter))
    
    real_transactions = session.exec(query).all()
    
    # Se filtrando por conta específica, não incluímos dívidas virtuais (pois não sabemos de qual conta sairão)
    # A menos que o usuário queira ver projeção. Por segurança, incluímos apenas em 'all' ou se decidirmos.
    # Decisão: Incluir apenas em 'all' como acordado no plano.
    if account_filter != 'all':
        return list(real_transactions)

    # 2. Buscar dívidas que vencem no período e não estão pagas
    # Assumimos que 'Em dia' = Paga ou não vencida. Mas se gerou transação, ok.
    # Se status for 'Pendente' ou 'Atrasado', projetamos como despesa.
    debts = session.exec(select(Debt)).all()
    
    virtual_transactions = []
    
    for debt in debts:
        if not debt.dueDate:
             continue
             
        # Verificar se vence no período
        # A data de vencimento da dívida é YYYY-MM-DD
        debt_date = debt.dueDate.split('T')[0]
        
        if start_date <= debt_date <= end_date:
            # Check de Status: Se já está paga ("Em dia" e remaining == 0), não criamos virtual a menos que
            # queiramos mostrar o histórico. Mas se está paga, deveria ter uma transação real criada pelo "Pagar".
            # Se a transação real existe, o loop de deduplicação abaixo vai pegar.
            # Se não existe transação real (pagou por fora?), confiamos no status.
            
            # Valor a considerar: parcela mensal (se parcelado/fixo) ou restante
            amount = debt.monthly if debt.monthly > 0 else debt.remaining
            
            # Deduplicação: Verificar se existe transação real com mesmo valor e descrição similar
            # Isso "casa" o pagamento real com a dívida
            is_paid = False
            for t in real_transactions:
                # Logica simples de match: mesmo valor E (nome da dívida na descrição OU categoria igual)
                if t.type == 'expense' and abs(t.amount - amount) < 0.01:
                    if debt.name.lower() in t.description.lower() or t.category == debt.category:
                        is_paid = True
                        break
            
            if not is_paid and debt.status in ["Pendente", "Atrasado"]:
                # Criar transação virtual
                virtual_t = Transaction(
                    id=-debt.id, # ID negativo para indicar virtual
                    description=f"[Previsto] {debt.name}",
                    amount=amount,
                    type="expense",
                    date=debt_date,
                    category=debt.category or "Dívidas",
                    status="pending",
                    accountId=None
                )
                virtual_transactions.append(virtual_t)

    return list(real_transactions) + virtual_transactions


@app.get("/api/reports/")
def get_reports(range: str = 'this-month', account: str = 'all', session: Session = Depends(get_session)):
    """
    Gera dados agregados para os gráficos de relatório.
    Calcula KPI e distribuição de despesas com base nas transações reais.
    """
    transactions = session.exec(select(Transaction)).all()
    
    # Mapear valores do frontend para dias
    range_map = {
        "this-month": 30,
        "30-days": 30,
        "this-year": 365,
        "7d": 7,
        "30d": 30,
        "90d": 90,
    }
    days = range_map.get(range, 30)
    today = datetime.now()
    cutoff_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")

    # Obter transações unificadas (Reais + Dívidas)
    # Buscamos até hoje, mas para relatórios pode ser interessante ver o consolidado do período
    unified_transactions = get_unified_transactions(session, cutoff_date, today_str, account)
    
    # Filtrar por tipo (apenas despesas)
    filtered = [
        t for t in unified_transactions 
        if t.type == 'expense'
    ]
    
    total_spent = sum(t.amount for t in filtered)
    
    # Agrupar por categoria
    category_map = {}
    for t in filtered:
        category_map[t.category] = category_map.get(t.category, 0) + t.amount
        
    distribution = []
    colors = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316']
    
    top_category_name = "N/A"
    top_category_value = 0
    
    for i, (cat, val) in enumerate(category_map.items()):
        if val > top_category_value:
            top_category_value = val
            top_category_name = cat
            
        distribution.append({
            "name": cat,
            "value": val,
            "percentage": round((val / total_spent * 100), 1) if total_spent > 0 else 0,
            "color": colors[i % len(colors)]
        })
    
    # Calcular variação vs período anterior
    prev_cutoff_start = (datetime.now() - timedelta(days=days * 2)).strftime("%Y-%m-%d")
    prev_cutoff_end = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    prev_filtered = [t for t in transactions if prev_cutoff_start <= t.date < prev_cutoff_end and t.type == "expense"]
    prev_total = sum(t.amount for t in prev_filtered)
    
    change = round(((total_spent - prev_total) / prev_total) * 100, 1) if prev_total > 0 else 0
        
    return {
        "kpi": {
            "totalSpent": total_spent,
            "totalSpentChange": change,
            "topCategory": top_category_name,
            "topCategoryValue": top_category_value,
            "transactionCount": len(filtered),
            "transactionCountChange": 0
        },
        "distribution": distribution
    }


@app.get("/api/reports/cash-flow/")
@app.get("/api/reports/cash-flow/")
@app.get("/api/reports/cash-flow/")
def get_cash_flow(date_range: str = "this-year", account: str = 'all', session: Session = Depends(get_session)):
    """Retorna dados de fluxo de caixa (receitas vs despesas) por mês."""
    
    # Determinar range para buscar transações
    today = datetime.now()
    range_months = {"this-month": 1, "30-days": 1, "this-year": 12, "7d": 1, "30d": 1, "90d": 3}
    num_months = range_months.get(date_range, 6)
    
    start_date = (today - timedelta(days=30 * num_months)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    
    transactions = get_unified_transactions(session, start_date, end_date, account)
    
    # Determinar número de meses baseado no range
    range_months = {
        "this-month": 1,
        "30-days": 1,
        "this-year": 12,
        "7d": 1,
        "30d": 1,
        "90d": 3,
    }
    num_months = range_months.get(date_range, 6)
    
    # Gerar dados mensais
    months_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    today = datetime.now()
    result = []
    
    for idx in range(num_months - 1, -1, -1):
        target_date = today - timedelta(days=30 * idx)
        month_start = target_date.replace(day=1).strftime("%Y-%m")
        month_label = months_pt[target_date.month - 1]
        
        month_income = sum(t.amount for t in transactions 
                         if t.type == "income" and t.date.startswith(month_start))
        month_expense = sum(t.amount for t in transactions 
                          if t.type == "expense" and t.date.startswith(month_start))
        
        result.append({
            "month": month_label,
            "income": month_income,
            "expense": month_expense,
            "balance": month_income - month_expense
        })
    
    return result


@app.get("/api/reports/spending-trends/")
@app.get("/api/reports/spending-trends/")
def get_spending_trends(date_range: str = "this-year", account: str = 'all', session: Session = Depends(get_session)):
    """Retorna tendência de gastos ao longo dos meses."""
    
    # Determinar range
    today = datetime.now()
    range_months = {"this-month": 3, "30-days": 3, "this-year": 12, "7d": 3, "30d": 3, "90d": 6}
    num_months = range_months.get(date_range, 6)

    start_date = (today - timedelta(days=30 * num_months)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    
    transactions = get_unified_transactions(session, start_date, end_date, account)
    
    range_months = {
        "this-month": 3,
        "30-days": 3,
        "this-year": 12,
        "7d": 3,
        "30d": 3,
        "90d": 6,
    }
    num_months = range_months.get(date_range, 6)
    
    months_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    today = datetime.now()
    result = []
    prev_value = None
    
    for idx in range(num_months - 1, -1, -1):
        target_date = today - timedelta(days=30 * idx)
        month_start = target_date.replace(day=1).strftime("%Y-%m")
        month_label = months_pt[target_date.month - 1]
        
        month_expense = sum(t.amount for t in transactions 
                          if t.type == "expense" and t.date.startswith(month_start))
        
        # Calcular variação percentual
        if prev_value is not None and prev_value > 0:
            change = round(((month_expense - prev_value) / prev_value) * 100, 1)
        else:
            change = 0
        
        result.append({
            "month": month_label,
            "value": month_expense,
            "change": change
        })
        prev_value = month_expense
    
    return result


@app.get("/api/reports/income-sources/")
@app.get("/api/reports/income-sources/")
def get_income_sources(date_range: str = "this-month", account: str = 'all', session: Session = Depends(get_session)):
    """Retorna receitas agrupadas por categoria/fonte."""
    
    range_map = {"this-month": 30, "30-days": 30, "this-year": 365, "7d": 7, "30d": 30, "90d": 90}
    days = range_map.get(date_range, 30)
    
    today = datetime.now()
    start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    
    transactions = get_unified_transactions(session, start_date, end_date, account)
    
    # Filtrar apenas incomes (Unified normalmente retorna despesas virtuais, mas transacoes reais de income virão junto)
    filtered = [t for t in transactions if t.type == "income"]
    
    categories = {}
    total_income = sum(t.amount for t in filtered)
    colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6', '#ec4899']
    
    for t in filtered:
        cat = t.category or "Outros"
        categories[cat] = categories.get(cat, 0) + t.amount
    
    result = []
    for i, (cat, val) in enumerate(categories.items()):
        result.append({
            "name": cat,
            "value": val,
            "percentage": round((val / total_income) * 100, 1) if total_income > 0 else 0,
            "color": colors[i % len(colors)]
        })
    
    return result


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


# ==========================================
# PAYCHECK ALLOCATION (Alocação Quinzenal)
# ==========================================

class AllocationRequest(BaseModel):
    paycheck_amount: float
    paycheck_date: str


@app.post("/api/allocation/suggest")
def suggest_allocation(request: AllocationRequest, session: Session = Depends(get_session)):
    """
    Gera sugestão inteligente de alocação do salário quinzenal.
    Analisa dívidas, metas, orçamentos e sugere distribuição otimizada.
    """
    amount = request.paycheck_amount
    paycheck_date = request.paycheck_date
    
    # Buscar dados financeiros
    debts = session.exec(select(Debt)).all()
    goals = session.exec(select(Goal)).all()
    budgets = session.exec(select(Budget)).all()
    transactions = session.exec(select(Transaction)).all()
    
    # Ordenar dívidas por urgência e data de vencimento
    def debt_priority(d):
        try:
            due = datetime.strptime(d.dueDate, "%Y-%m-%d")
            days_until = (due - datetime.now()).days
            urgency_score = 1000 if d.isUrgent else 0
            return -urgency_score + days_until  # Menores vêm primeiro
        except:
            return 999
    
    sorted_debts = sorted(debts, key=debt_priority)
    
    # Ordenar metas por deadline
    def goal_priority(g):
        try:
            deadline = datetime.strptime(g.deadline, "%Y-%m-%d")
            progress = g.currentAmount / g.targetAmount if g.targetAmount > 0 else 1
            return (deadline - datetime.now()).days * (1 - progress)
        except:
            return 999
    
    sorted_goals = sorted(goals, key=goal_priority)
    
    # Calcular gastos médios por categoria nos últimos 3 meses
    budget_averages = {}
    for b in budgets:
        cat_expenses = [t.amount for t in transactions if t.category == b.category and t.type == 'expense']
        budget_averages[b.category] = sum(cat_expenses) / 3 if cat_expenses else b.limit / 2
    
    # Preparar dados para a IA
    debts_info = [
        f"- {d.name}: R$ {d.monthly:.2f}/mês, vence dia {d.dueDate}, {'URGENTE' if d.isUrgent else d.status}"
        for d in sorted_debts[:10]
    ]
    
    goals_info = [
        f"- {g.name}: {(g.currentAmount/g.targetAmount*100):.0f}% completa, faltam R$ {g.targetAmount - g.currentAmount:.2f}, prazo {g.deadline}"
        for g in sorted_goals[:5]
    ]
    
    budgets_info = [
        f"- {b.category}: limite R$ {b.limit:.2f}, gasto médio mensal R$ {budget_averages.get(b.category, 0):.2f}"
        for b in budgets[:8]
    ]
    
    prompt = f"""
Analise a situação financeira e sugira como alocar o salário quinzenal de R$ {amount:.2f}.

DÍVIDAS E CONTAS (pagar primeiro):
{chr(10).join(debts_info) if debts_info else "- Nenhuma dívida cadastrada"}

METAS DE POUPANÇA:
{chr(10).join(goals_info) if goals_info else "- Nenhuma meta cadastrada"}

ORÇAMENTOS VARIÁVEIS:
{chr(10).join(budgets_info) if budgets_info else "- Nenhum orçamento cadastrado"}

Regras de alocação:
1. Priorize dívidas urgentes e com vencimento nos próximos 15 dias
2. Reserve 5-15% para margem de segurança (imprevistos)
3. Contribua para metas atrasadas ou próximas do prazo
4. Distribua o restante proporcionalmente entre orçamentos

Retorne APENAS JSON nesta estrutura:
{{
    "categories": [
        {{
            "id": "essentials",
            "name": "Essenciais",
            "color": "#ef4444",
            "items": [
                {{"name": "Nome da despesa", "amount": 0.00, "reference_type": "debt", "reference_id": null}}
            ]
        }},
        {{
            "id": "goals",
            "name": "Metas",
            "color": "#3b82f6",
            "items": [
                {{"name": "Nome da meta", "amount": 0.00, "reference_type": "goal", "reference_id": null}}
            ]
        }},
        {{
            "id": "budgets",
            "name": "Orçamentos",
            "color": "#a855f7",
            "items": [
                {{"name": "Categoria", "amount": 0.00, "reference_type": "budget", "reference_id": null}}
            ]
        }},
        {{
            "id": "safety_margin",
            "name": "Margem de Segurança",
            "color": "#eab308",
            "items": [
                {{"name": "Reserva para imprevistos", "amount": 0.00}}
            ]
        }}
    ],
    "insights": [
        "Insight 1 sobre a alocação",
        "Insight 2 sobre metas ou dívidas",
        "Insight 3 sobre economia"
    ]
}}
"""
    
    ai_result = ask_ai_analysis(prompt, session)
    
    # Fallback se IA falhar
    if not ai_result or "categories" not in ai_result:
        # Distribuição padrão: 50% essenciais, 20% metas, 25% orçamentos, 5% margem
        essentials_amt = amount * 0.50
        goals_amt = amount * 0.20
        budgets_amt = amount * 0.25
        safety_amt = amount * 0.05
        
        # Distribuir entre dívidas proporcionalmente
        essential_items = []
        if sorted_debts:
            debt_total = sum(d.monthly for d in sorted_debts[:4])
            for d in sorted_debts[:4]:
                item_amount = (d.monthly / debt_total * essentials_amt) if debt_total > 0 else essentials_amt / len(sorted_debts[:4])
                essential_items.append({
                    "name": d.name,
                    "amount": round(item_amount, 2),
                    "reference_type": "debt",
                    "reference_id": d.id
                })
        else:
            essential_items.append({"name": "Custos fixos gerais", "amount": round(essentials_amt, 2)})
        
        # Distribuir entre metas
        goal_items = []
        if sorted_goals:
            for g in sorted_goals[:2]:
                goal_items.append({
                    "name": g.name,
                    "amount": round(goals_amt / len(sorted_goals[:2]), 2),
                    "reference_type": "goal",
                    "reference_id": g.id
                })
        else:
            goal_items.append({"name": "Reserva de emergência", "amount": round(goals_amt, 2)})
        
        # Distribuir entre orçamentos
        budget_items = []
        if budgets:
            for b in budgets[:4]:
                budget_items.append({
                    "name": b.category,
                    "amount": round(budgets_amt / len(budgets[:4]), 2),
                    "reference_type": "budget",
                    "reference_id": b.id
                })
        else:
            budget_items.append({"name": "Gastos variáveis", "amount": round(budgets_amt, 2)})
        
        ai_result = {
            "categories": [
                {"id": "essentials", "name": "Essenciais", "color": "#ef4444", "items": essential_items},
                {"id": "goals", "name": "Metas", "color": "#3b82f6", "items": goal_items},
                {"id": "budgets", "name": "Orçamentos", "color": "#a855f7", "items": budget_items},
                {"id": "safety_margin", "name": "Margem de Segurança", "color": "#eab308", "items": [
                    {"name": "Reserva para imprevistos", "amount": round(safety_amt, 2)}
                ]}
            ],
            "insights": [
                "Distribuição baseada no método 50/30/20 adaptado",
                f"Você tem {len(debts)} dívidas cadastradas no sistema",
                f"{'Configure a IA para sugestões personalizadas' if not debts else 'Alocação calculada automaticamente'}"
            ]
        }
    
    # Calcular percentuais e totais
    for cat in ai_result["categories"]:
        cat_total = sum(item.get("amount", 0) for item in cat.get("items", []))
        cat["amount"] = round(cat_total, 2)
        cat["percentage"] = round((cat_total / amount * 100) if amount > 0 else 0, 1)
    
    # Criar registro no banco
    allocation = PaycheckAllocation(
        paycheck_date=paycheck_date,
        paycheck_amount=amount,
        created_at=datetime.now().isoformat(),
        status="draft"
    )
    session.add(allocation)
    session.commit()
    session.refresh(allocation)
    
    # Salvar itens
    for cat in ai_result["categories"]:
        for item in cat.get("items", []):
            alloc_item = AllocationItem(
                allocation_id=allocation.id,
                category=cat["id"],
                name=item.get("name", ""),
                amount=item.get("amount", 0),
                percentage=round((item.get("amount", 0) / amount * 100) if amount > 0 else 0, 1),
                reference_id=item.get("reference_id"),
                reference_type=item.get("reference_type")
            )
            session.add(alloc_item)
    
    session.commit()
    
    # Preparar dados do gráfico
    chart_data = [
        {"name": cat["name"], "value": cat["amount"], "color": cat["color"]}
        for cat in ai_result["categories"]
    ]
    
    return {
        "id": allocation.id,
        "paycheck_amount": amount,
        "paycheck_date": paycheck_date,
        "categories": ai_result["categories"],
        "insights": ai_result.get("insights", []),
        "chart_data": chart_data
    }


@app.post("/api/allocation/apply")
def apply_allocation(data: dict, session: Session = Depends(get_session)):
    """
    Aplica a alocação aprovada.
    Cria transações automáticas e atualiza metas/dívidas.
    """
    allocation_id = data.get("allocation_id")
    
    allocation = session.get(PaycheckAllocation, allocation_id)
    if not allocation:
        raise HTTPException(status_code=404, detail="Alocação não encontrada")
    
    if allocation.status == "applied":
        raise HTTPException(status_code=400, detail="Alocação já foi aplicada")
    
    # Buscar itens da alocação
    items = session.exec(
        select(AllocationItem).where(AllocationItem.allocation_id == allocation_id)
    ).all()
    
    # Buscar conta padrão (primeira conta disponível)
    default_account = session.exec(select(Account)).first()
    account_id = default_account.id if default_account else None
    
    created_transactions = []
    updated_goals = []
    
    for item in items:
        # Criar transação de despesa/alocação
        if item.category != "safety_margin":  # Margem de segurança fica na conta
            transaction = Transaction(
                accountId=account_id,
                description=f"Alocação quinzenal: {item.name}",
                amount=item.amount,
                type="expense",
                date=allocation.paycheck_date,
                category=item.name,
                status="completed"
            )
            session.add(transaction)
            created_transactions.append(item.name)
        
        # Atualizar meta se for do tipo goal
        if item.reference_type == "goal" and item.reference_id:
            goal = session.get(Goal, item.reference_id)
            if goal:
                goal.currentAmount += item.amount
                session.add(goal)
                updated_goals.append(goal.name)
    
    # Atualizar status da alocação
    allocation.status = "applied"
    session.add(allocation)
    session.commit()
    
    return {
        "success": True,
        "message": "Alocação aplicada com sucesso!",
        "transactions_created": len(created_transactions),
        "goals_updated": updated_goals
    }


@app.get("/api/allocation/history")
def get_allocation_history(session: Session = Depends(get_session)):
    """
    Retorna histórico de alocações anteriores.
    """
    allocations = session.exec(
        select(PaycheckAllocation).order_by(PaycheckAllocation.id.desc())
    ).all()
    
    result = []
    for alloc in allocations:
        items = session.exec(
            select(AllocationItem).where(AllocationItem.allocation_id == alloc.id)
        ).all()
        
        # Agrupar itens por categoria
        categories = {}
        for item in items:
            if item.category not in categories:
                categories[item.category] = {
                    "id": item.category,
                    "items": [],
                    "total": 0
                }
            categories[item.category]["items"].append({
                "name": item.name,
                "amount": item.amount,
                "percentage": item.percentage
            })
            categories[item.category]["total"] += item.amount
        
        result.append({
            "id": alloc.id,
            "paycheck_date": alloc.paycheck_date,
            "paycheck_amount": alloc.paycheck_amount,
            "status": alloc.status,
            "created_at": alloc.created_at,
            "categories": list(categories.values())
        })
    
    return result


# ==========================================
# CALENDÁRIO FINANCEIRO COM IA
# ==========================================

class CalendarInsightRequest(BaseModel):
    month: int
    year: int


@app.post("/api/calendar/ai-insights")
def get_calendar_ai_insights(request: CalendarInsightRequest, session: Session = Depends(get_session)):
    """
    Gera insights inteligentes sobre o mês selecionado no calendário.
    Analisa transações, dívidas e metas para fornecer recomendações.
    """
    from datetime import date
    
    month = request.month
    year = request.year
    
    # Buscar dados do mês
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        next_month_start = f"{year + 1}-01-01"
    else:
        next_month_start = f"{year}-{month + 1:02d}-01"
    
    # Transações do mês
    transactions = session.exec(
        select(Transaction).where(
            Transaction.date >= month_start,
            Transaction.date < next_month_start
        )
    ).all()
    
    # Todas as dívidas ativas
    debts = session.exec(select(Debt)).all()
    
    # Metas com deadline neste mês
    goals = session.exec(
        select(Goal).where(
            Goal.deadline >= month_start,
            Goal.deadline < next_month_start
        )
    ).all()
    
    # Calcular totais
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    total_monthly_debts = sum(d.monthly for d in debts)
    overdue_debts = [d for d in debts if d.status == 'Atrasado']
    pending_goals = [g for g in goals if g.currentAmount < g.targetAmount]
    
    # Tentar usar IA
    ai_insights = None
    
    prompt = f"""
Analise os dados financeiros do mês {month}/{year} e forneça insights úteis:

RESUMO FINANCEIRO:
- Receitas do mês: R$ {total_income:,.2f}
- Despesas do mês: R$ {total_expense:,.2f}
- Compromissos mensais (dívidas): R$ {total_monthly_debts:,.2f}
- Dívidas atrasadas: {len(overdue_debts)}
- Metas com prazo neste mês: {len(pending_goals)}

DÍVIDAS DETALHADAS:
{chr(10).join([f"- {d.name}: R$ {d.monthly:,.2f} (status: {d.status})" for d in debts[:5]])}

METAS COM PRAZO NESTE MÊS:
{chr(10).join([f"- {g.name}: {g.currentAmount}/{g.targetAmount} (faltam R$ {g.targetAmount - g.currentAmount:,.2f})" for g in pending_goals[:3]]) if pending_goals else "Nenhuma meta com prazo neste mês"}

Retorne um JSON com lista de insights no formato:
{{
  "insights": [
    {{
      "type": "warning|success|tip|info",
      "title": "Título curto e direto",
      "description": "Descrição detalhada",
      "action": "Sugestão de ação (opcional)"
    }}
  ]
}}

Forneça entre 3 e 5 insights relevantes e acionáveis.
"""
    
    ai_response = ask_ai_analysis(prompt, session)
    
    if ai_response and "insights" in ai_response:
        return {"insights": ai_response["insights"]}
    
    # Fallback: gerar insights localmente
    insights = []
    
    # Insight 1: Balanço do mês
    balance = total_income - total_expense - total_monthly_debts
    if balance > 0:
        insights.append({
            "type": "success",
            "title": "✨ Mês com saldo positivo!",
            "description": f"Sobra estimada de R$ {balance:,.2f} após despesas e compromissos",
            "action": "Considere investir ou aumentar reserva de emergência"
        })
    elif balance < 0:
        insights.append({
            "type": "warning",
            "title": "⚠️ Atenção ao orçamento",
            "description": f"Déficit estimado de R$ {abs(balance):,.2f} no mês",
            "action": "Revise gastos não essenciais ou adie compras"
        })
    
    # Insight 2: Dívidas atrasadas
    if len(overdue_debts) > 0:
        total_overdue = sum(d.monthly for d in overdue_debts)
        insights.append({
            "type": "warning",
            "title": f"🚨 {len(overdue_debts)} dívida(s) atrasada(s)",
            "description": f"Total de R$ {total_overdue:,.2f} em atraso - pode gerar juros",
            "action": "Priorize a regularização para evitar multas"
        })
    
    # Insight 3: Próximos vencimentos
    today = date.today()
    upcoming = [d for d in debts if d.status != 'Atrasado']
    if len(upcoming) > 0:
        insights.append({
            "type": "info",
            "title": f"📅 {len(upcoming)} compromissos no mês",
            "description": f"Total de R$ {sum(d.monthly for d in upcoming):,.2f} em contas a pagar",
            "action": "Mantenha saldo disponível para os vencimentos"
        })
    
    # Insight 4: Metas próximas do prazo
    if len(pending_goals) > 0:
        closest = pending_goals[0]
        remaining = closest.targetAmount - closest.currentAmount
        insights.append({
            "type": "tip",
            "title": f"🎯 Meta \"{closest.name}\" com prazo próximo",
            "description": f"Faltam R$ {remaining:,.2f} para atingir o objetivo",
            "action": "Considere aportes extras para não perder o prazo"
        })
    
    # Insight 5: Análise de categorias
    if transactions:
        categories = {}
        for t in transactions:
            if t.type == 'expense':
                categories[t.category] = categories.get(t.category, 0) + t.amount
        
        if categories:
            top_category = max(categories.items(), key=lambda x: x[1])
            insights.append({
                "type": "info",
                "title": f"📊 Maior gasto: {top_category[0]}",
                "description": f"R$ {top_category[1]:,.2f} gastos nesta categoria no mês",
                "action": "Verifique se está dentro do planejado"
            })
    
    return {"insights": insights[:5]}


@app.get("/api/calendar/events")
def get_calendar_events(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    session: Session = Depends(get_session)
):
    """
    Retorna todos os eventos do calendário para um mês específico.
    Combina transações, dívidas e metas.
    """
    from datetime import date, timedelta
    
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        next_month_start = f"{year + 1}-01-01"
    else:
        next_month_start = f"{year}-{month + 1:02d}-01"
    
    events = []
    today = date.today()
    
    # Transações do mês
    transactions = session.exec(
        select(Transaction).where(
            Transaction.date >= month_start,
            Transaction.date < next_month_start
        )
    ).all()
    
    for tx in transactions:
        tx_date = date.fromisoformat(tx.date) if isinstance(tx.date, str) else tx.date
        events.append({
            "id": f"tx-{tx.id}",
            "date": tx.date,
            "title": tx.description,
            "amount": tx.amount,
            "type": tx.type,
            "status": tx.status if tx.status else ("paid" if tx_date <= today else "pending"),
            "category": tx.category,
            "sourceType": "transaction",
            "sourceId": tx.id
        })
    
    # Dívidas (gerar evento no dia do vencimento)
    debts = session.exec(select(Debt)).all()
    
    for debt in debts:
        # Extrair dia do vencimento
        try:
            due_day = int(debt.dueDate.split('-')[2]) if '-' in debt.dueDate else int(debt.dueDate)
        except:
            due_day = 1
        
        # Verificar se o dia existe no mês
        try:
            event_date = date(year, month, due_day)
        except ValueError:
            # Se o dia não existe (ex: 31 em mês de 30 dias), usar último dia
            from calendar import monthrange
            last_day = monthrange(year, month)[1]
            event_date = date(year, month, last_day)
        
        diff_days = (event_date - today).days
        
        if diff_days < 0:
            status = "overdue" if debt.status == 'Atrasado' else "paid"
        elif diff_days <= 3:
            status = "pending"
        else:
            status = "upcoming"
        
        events.append({
            "id": f"debt-{debt.id}",
            "date": event_date.isoformat(),
            "title": debt.name,
            "amount": debt.monthly,
            "type": "debt",
            "status": status,
            "category": debt.category,
            "sourceType": "debt",
            "sourceId": debt.id,
            "isRecurring": debt.debtType == 'fixo',
            "daysUntilDue": diff_days
        })
    
    # Metas com deadline no mês
    goals = session.exec(
        select(Goal).where(
            Goal.deadline >= month_start,
            Goal.deadline < next_month_start
        )
    ).all()
    
    for goal in goals:
        goal_date = date.fromisoformat(goal.deadline) if isinstance(goal.deadline, str) else goal.deadline
        diff_days = (goal_date - today).days
        
        events.append({
            "id": f"goal-{goal.id}",
            "date": goal.deadline,
            "title": f"Meta: {goal.name}",
            "amount": goal.targetAmount - goal.currentAmount,
            "type": "goal",
            "status": "overdue" if diff_days < 0 else ("pending" if diff_days <= 7 else "upcoming"),
            "sourceType": "goal",
            "sourceId": goal.id,
            "progress": (goal.currentAmount / goal.targetAmount) * 100 if goal.targetAmount > 0 else 0
        })
    
    return {"events": events, "count": len(events)}


# ==========================================
# INVESTIMENTOS COM IA
# ==========================================

class Investment(SQLModel, table=True):
    """Modelo para investimentos"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    ticker: str
    category: str = "stocks"  # stocks, crypto, fixed_income, fiis, funds, other
    average_price: float
    current_price: float
    quantity: float
    total_invested: float
    current_value: float
    profit_loss: float
    profit_loss_percent: float
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class InvestmentCreate(BaseModel):
    name: str
    ticker: str
    category: str = "stocks"
    average_price: float
    current_price: float
    quantity: float


class InvestmentAISuggestionRequest(BaseModel):
    available_amount: float
    current_investments: list = []


@app.get("/api/investments")
def get_investments(session: Session = Depends(get_session)):
    """Lista todos os investimentos"""
    investments = session.exec(select(Investment)).all()
    return investments


@app.post("/api/investments")
def create_investment(inv: InvestmentCreate, session: Session = Depends(get_session)):
    """Cria um novo investimento"""
    total_invested = inv.average_price * inv.quantity
    current_value = inv.current_price * inv.quantity
    profit_loss = current_value - total_invested
    profit_loss_percent = (profit_loss / total_invested * 100) if total_invested > 0 else 0
    
    investment = Investment(
        name=inv.name,
        ticker=inv.ticker,
        category=inv.category,
        average_price=inv.average_price,
        current_price=inv.current_price,
        quantity=inv.quantity,
        total_invested=total_invested,
        current_value=current_value,
        profit_loss=profit_loss,
        profit_loss_percent=profit_loss_percent,
    )
    
    session.add(investment)
    session.commit()
    session.refresh(investment)
    
    return investment


@app.put("/api/investments/{investment_id}")
def update_investment(investment_id: int, inv: InvestmentCreate, session: Session = Depends(get_session)):
    """Atualiza um investimento"""
    investment = session.get(Investment, investment_id)
    if not investment:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    
    investment.name = inv.name
    investment.ticker = inv.ticker
    investment.category = inv.category
    investment.average_price = inv.average_price
    investment.current_price = inv.current_price
    investment.quantity = inv.quantity
    investment.total_invested = inv.average_price * inv.quantity
    investment.current_value = inv.current_price * inv.quantity
    investment.profit_loss = investment.current_value - investment.total_invested
    investment.profit_loss_percent = (investment.profit_loss / investment.total_invested * 100) if investment.total_invested > 0 else 0
    investment.updated_at = datetime.now().isoformat()
    
    session.add(investment)
    session.commit()
    session.refresh(investment)
    
    return investment


@app.delete("/api/investments/{investment_id}")
def delete_investment(investment_id: int, session: Session = Depends(get_session)):
    """Remove um investimento"""
    investment = session.get(Investment, investment_id)
    if not investment:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    
    session.delete(investment)
    session.commit()
    
    return {"success": True, "message": "Investimento removido com sucesso"}


@app.post("/api/investments/ai-suggestions")
def get_investment_ai_suggestions(request: InvestmentAISuggestionRequest, session: Session = Depends(get_session)):
    """
    Gera sugestões de investimento baseadas na IA.
    Analisa dívidas, despesas e saldo disponível para recomendar onde investir.
    """
    from datetime import date
    
    # Buscar dados financeiros
    debts = session.exec(select(Debt)).all()
    goals = session.exec(select(Goal)).all()
    
    # Calcular total de dívidas mensais
    total_monthly_debts = sum(d.monthly for d in debts)
    overdue_debts = [d for d in debts if d.status == 'Atrasado']
    
    # Calcular progresso das metas
    goals_progress = []
    for g in goals:
        progress = (g.currentAmount / g.targetAmount * 100) if g.targetAmount > 0 else 0
        goals_progress.append({
            "name": g.name,
            "progress": progress,
            "remaining": g.targetAmount - g.currentAmount
        })
    
    # Analisar carteira atual
    investments = request.current_investments
    categories = {}
    total_invested = 0
    
    for inv in investments:
        cat = inv.get('category', 'other')
        value = inv.get('current_value', 0)
        categories[cat] = categories.get(cat, 0) + value
        total_invested += value
    
    # Tentar usar IA
    prompt = f"""
Analise a situação financeira e sugira investimentos:

SITUAÇÃO ATUAL:
- Valor disponível para investir: R$ {request.available_amount:,.2f}
- Total já investido: R$ {total_invested:,.2f}
- Dívidas mensais: R$ {total_monthly_debts:,.2f}
- Dívidas atrasadas: {len(overdue_debts)}

ALOCAÇÃO ATUAL:
{chr(10).join([f"- {k}: R$ {v:,.2f} ({v/total_invested*100:.1f}%)" for k, v in categories.items()]) if categories else "Nenhum investimento ainda"}

METAS FINANCEIRAS:
{chr(10).join([f"- {g['name']}: {g['progress']:.0f}% (faltam R$ {g['remaining']:,.2f})" for g in goals_progress[:3]]) if goals_progress else "Nenhuma meta definida"}

Retorne um JSON com sugestões de investimento no formato:
{{
  "suggestions": [
    {{
      "type": "opportunity|warning|tip|allocation",
      "title": "Título da sugestão",
      "description": "Descrição detalhada",
      "suggested_amount": 1000,
      "priority": "high|medium|low",
      "category": "stocks|crypto|fixed_income|fiis|funds"
    }}
  ]
}}

Considere:
1. Se há dívidas atrasadas, priorize quitá-las antes de investir
2. Se não tem reserva de emergência, sugira renda fixa com liquidez
3. Analise a diversificação da carteira
4. Considere o perfil de risco baseado nos investimentos atuais

Forneça 3-5 sugestões acionáveis.
"""
    
    ai_response = ask_ai_analysis(prompt, session)
    
    if ai_response and "suggestions" in ai_response:
        return {"suggestions": ai_response["suggestions"]}
    
    # Fallback: gerar sugestões localmente
    suggestions = []
    
    # 1. Verificar dívidas atrasadas
    if len(overdue_debts) > 0:
        total_overdue = sum(d.monthly for d in overdue_debts)
        suggestions.append({
            "type": "warning",
            "title": "⚠️ Quite suas dívidas primeiro!",
            "description": f"Você tem {len(overdue_debts)} dívida(s) atrasada(s) totalizando R$ {total_overdue:,.2f}/mês. Pagar dívidas com juros altos é o melhor 'investimento'.",
            "priority": "high",
            "suggested_amount": min(request.available_amount, total_overdue),
        })
    
    # 2. Verificar se tem valor para investir
    if request.available_amount > 0:
        # Sugestão de reserva de emergência
        has_fixed = 'fixed_income' in categories
        if not has_fixed and request.available_amount >= 500:
            suggestions.append({
                "type": "tip",
                "title": "🛡️ Monte sua reserva de emergência",
                "description": "Invista em Tesouro Selic ou CDB de liquidez diária. O ideal é ter 6 meses de despesas guardados.",
                "priority": "high",
                "suggested_amount": min(request.available_amount * 0.5, 2000),
                "category": "fixed_income",
            })
        
        # Sugestão de diversificação
        if len(categories) < 3 and request.available_amount >= 500:
            missing = []
            if 'stocks' not in categories:
                missing.append("ações brasileiras")
            if 'fiis' not in categories:
                missing.append("fundos imobiliários")
            if 'fixed_income' not in categories:
                missing.append("renda fixa")
            
            if missing:
                suggestions.append({
                    "type": "allocation",
                    "title": "📊 Diversifique sua carteira",
                    "description": f"Considere adicionar {', '.join(missing[:2])} para reduzir riscos e aumentar retornos.",
                    "priority": "medium",
                    "suggested_amount": request.available_amount * 0.3,
                })
        
        # Sugestão baseada no valor disponível
        if request.available_amount >= 1000:
            suggestions.append({
                "type": "opportunity",
                "title": f"💰 R$ {request.available_amount:,.2f} disponível!",
                "description": "Baseado em suas receitas e despesas, você tem esse valor sobrando este mês. Considere investir para fazer seu dinheiro trabalhar.",
                "priority": "high",
                "suggested_amount": request.available_amount,
            })
        elif request.available_amount >= 100:
            suggestions.append({
                "type": "tip",
                "title": "💡 Comece com pouco",
                "description": f"Mesmo R$ {request.available_amount:,.2f} já é um começo! Considere ETFs ou Tesouro Direto que permitem aportes menores.",
                "priority": "medium",
                "suggested_amount": request.available_amount,
            })
    else:
        # Sem valor disponível
        suggestions.append({
            "type": "warning",
            "title": "📊 Revise seu orçamento",
            "description": "Suas despesas e dívidas consomem toda a renda. Antes de investir, é importante ter um saldo positivo. Analise gastos que podem ser cortados.",
            "priority": "high",
        })
    
    # 3. Análise de performance (se tiver investimentos)
    if investments:
        worst = min(investments, key=lambda x: x.get('profit_loss_percent', 0))
        best = max(investments, key=lambda x: x.get('profit_loss_percent', 0))
        
        if worst.get('profit_loss_percent', 0) < -30:
            suggestions.append({
                "type": "warning",
                "title": f"📉 {worst.get('name', 'Ativo')} em queda forte",
                "description": f"Perda de {abs(worst.get('profit_loss_percent', 0)):.1f}%. Avalie se vale manter ou realizar prejuízo para realocar.",
                "priority": "medium",
            })
        
        if best.get('profit_loss_percent', 0) > 50:
            suggestions.append({
                "type": "tip",
                "title": f"🎯 Considere realizar lucros em {best.get('name', 'ativo')}",
                "description": f"Valorização de +{best.get('profit_loss_percent', 0):.1f}%. Realizar lucros parciais reduz risco e garante ganhos.",
                "priority": "medium",
            })
    
    return {"suggestions": suggestions[:5]}


@app.get("/api/investments/summary")
def get_investments_summary(session: Session = Depends(get_session)):
    """Retorna resumo da carteira de investimentos"""
    investments = session.exec(select(Investment)).all()
    
    if not investments:
        return {
            "total_invested": 0,
            "current_value": 0,
            "total_profit": 0,
            "total_profit_percent": 0,
            "best_performer": None,
            "worst_performer": None,
            "allocation": [],
        }
    
    total_invested = sum(i.total_invested for i in investments)
    current_value = sum(i.current_value for i in investments)
    total_profit = current_value - total_invested
    total_profit_percent = (total_profit / total_invested * 100) if total_invested > 0 else 0
    
    sorted_inv = sorted(investments, key=lambda x: x.profit_loss_percent, reverse=True)
    best = sorted_inv[0]
    worst = sorted_inv[-1]
    
    # Alocação por categoria
    categories = {}
    for inv in investments:
        categories[inv.category] = categories.get(inv.category, 0) + inv.current_value
    
    allocation = [
        {"category": cat, "value": val, "percent": (val / current_value * 100) if current_value > 0 else 0}
        for cat, val in categories.items()
    ]
    
    return {
        "total_invested": total_invested,
        "current_value": current_value,
        "total_profit": total_profit,
        "total_profit_percent": total_profit_percent,
        "best_performer": {"name": best.ticker, "percent": best.profit_loss_percent},
        "worst_performer": {"name": worst.ticker, "percent": worst.profit_loss_percent} if worst.profit_loss_percent < 0 else None,
        "allocation": allocation,
    }


# ==========================================
# PLANEJAMENTO INTELIGENTE (PROJETOS)
# ==========================================

class ProjectStep(BaseModel):
    name: str
    estimated_cost: float
    category: str
    priority: str  # Alta, Média, Baixa
    description: str

class ProjectPlan(BaseModel):
    title: str
    total_estimated: float
    description: str
    steps: List[ProjectStep]
    timeline_months: int

class CreatePlanRequest(BaseModel):
    goal_description: str
    monthly_budget: Optional[float] = None

@app.post("/api/planning/create-plan")
def create_smart_plan(request: CreatePlanRequest, session: Session = Depends(get_session)):
    """
    IA cria um plano detalhado baseado no objetivo do usuário.
    Ex: 'Reformar meu quarto gamer' -> Lista de equipamentos, móveis, pintura.
    """
    
    prompt = f"""
    Atue como um Especialista em Planejamento Financeiro e Gestão de Projetos Pessoais.
    
    O usuário quer realizar o seguinte projeto: "{request.goal_description}"
    Orçamento mensal disponível (opcional): {f'R$ {request.monthly_budget}' if request.monthly_budget else 'Não informado'}
    
    Crie um plano detalhado e realista para este projeto.
    
    Retorne APENAS um JSON estrito no seguinte formato:
    {{
        "title": "Título Sugerido para o Projeto",
        "description": "Breve resumo do que será feito",
        "total_estimated": 15000.00,
        "timeline_months": 6,
        "steps": [
            {{
                "name": "Nome da Etapa (ex: Comprar Pisos)",
                "estimated_cost": 2000.00,
                "category": "Material de Construção",
                "priority": "Alta",
                "description": "Porcelanato 60x60 para 20m²"
            }}
        ]
    }}
    
    Regras:
    1. Estime preços realistas do mercado brasileiro atual.
    2. Quebre o projeto em etapas lógicas.
    3. Seja específico nas descrições.
    """
    
    ai_response = ask_ai_analysis(prompt, session)
    
    # Fallback caso a IA falhe ou retorne vazio
    if not ai_response:
        return {
            "title": "Projeto Genérico",
            "description": "Não foi possível gerar detalhes automáticos.",
            "total_estimated": 0,
            "timeline_months": 0,
            "steps": []
        }
        
    return ai_response


# ==========================================
# PROJETOS DE VIDA INTEGRADO
# ==========================================

class LifeProject(SQLModel, table=True):
    """Projeto de vida (Casa, Saúde, Lazer, etc)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: str = "casa"  # casa, saude, lazer, carreira, familia, outro
    icon: str = "🏠"
    description: Optional[str] = None
    total_estimated: float = 0
    total_saved: float = 0
    deadline: Optional[str] = None
    status: str = "ativo"  # ativo, pausado, concluido
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    priority: str = "media"  # alta, media, baixa


class ProjectTask(SQLModel, table=True):
    """Tarefa/Etapa de um projeto"""
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="lifeproject.id")
    name: str
    estimated_cost: float
    actual_cost: Optional[float] = None
    priority: str = "media"  # alta, media, baixa
    status: str = "pendente"  # pendente, em_andamento, concluido
    notes: Optional[str] = None
    due_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class LifeProjectCreate(BaseModel):
    name: str
    category: str = "casa"
    icon: str = "🏠"
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: str = "media"


class ProjectTaskCreate(BaseModel):
    name: str
    estimated_cost: float
    priority: str = "media"
    notes: Optional[str] = None
    due_date: Optional[str] = None


# --- CRUD Projetos ---

@app.get("/api/life-projects")
def get_life_projects(session: Session = Depends(get_session)):
    """Lista todos os projetos de vida com suas tarefas"""
    projects = session.exec(select(LifeProject).where(LifeProject.status != "arquivado")).all()
    
    result = []
    for project in projects:
        tasks = session.exec(select(ProjectTask).where(ProjectTask.project_id == project.id)).all()
        
        # Calcular totais
        total_estimated = sum(t.estimated_cost for t in tasks)
        total_spent = sum(t.actual_cost or 0 for t in tasks if t.status == "concluido")
        completed_count = len([t for t in tasks if t.status == "concluido"])
        
        result.append({
            **project.model_dump(),
            "total_estimated": total_estimated,
            "total_spent": total_spent,
            "tasks_count": len(tasks),
            "completed_count": completed_count,
            "progress": (completed_count / len(tasks) * 100) if tasks else 0,
            "tasks": [t.model_dump() for t in tasks]
        })
    
    return result


@app.post("/api/life-projects")
def create_life_project(project: LifeProjectCreate, session: Session = Depends(get_session)):
    """Cria um novo projeto de vida"""
    db_project = LifeProject(**project.model_dump())
    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    return db_project


@app.put("/api/life-projects/{project_id}")
def update_life_project(project_id: int, project: LifeProjectCreate, session: Session = Depends(get_session)):
    """Atualiza um projeto"""
    db_project = session.get(LifeProject, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    for key, value in project.model_dump().items():
        setattr(db_project, key, value)
    
    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    return db_project


@app.delete("/api/life-projects/{project_id}")
def delete_life_project(project_id: int, session: Session = Depends(get_session)):
    """Remove um projeto e suas tarefas"""
    project = session.get(LifeProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    # Remover tarefas associadas
    tasks = session.exec(select(ProjectTask).where(ProjectTask.project_id == project_id)).all()
    for task in tasks:
        session.delete(task)
    
    session.delete(project)
    session.commit()
    return {"success": True}


# --- CRUD Tarefas ---

@app.post("/api/life-projects/{project_id}/tasks")
def create_project_task(project_id: int, task: ProjectTaskCreate, session: Session = Depends(get_session)):
    """Adiciona uma tarefa ao projeto"""
    project = session.get(LifeProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    db_task = ProjectTask(project_id=project_id, **task.model_dump())
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@app.put("/api/life-projects/tasks/{task_id}")
def update_project_task(task_id: int, task: ProjectTaskCreate, session: Session = Depends(get_session)):
    """Atualiza uma tarefa"""
    db_task = session.get(ProjectTask, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    for key, value in task.model_dump().items():
        setattr(db_task, key, value)
    
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@app.put("/api/life-projects/tasks/{task_id}/complete")
def complete_project_task(task_id: int, actual_cost: float = None, session: Session = Depends(get_session)):
    """Marca tarefa como concluída"""
    task = session.get(ProjectTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    task.status = "concluido"
    if actual_cost is not None:
        task.actual_cost = actual_cost
    else:
        task.actual_cost = task.estimated_cost
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@app.delete("/api/life-projects/tasks/{task_id}")
def delete_project_task(task_id: int, session: Session = Depends(get_session)):
    """Remove uma tarefa"""
    task = session.get(ProjectTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    session.delete(task)
    session.commit()
    return {"success": True}


# --- IA para Projetos ---

class AIProjectSuggestionRequest(BaseModel):
    project_description: str
    category: str = "casa"
    budget: Optional[float] = None


@app.post("/api/life-projects/ai-suggest-tasks")
def ai_suggest_project_tasks(request: AIProjectSuggestionRequest, session: Session = Depends(get_session)):
    """IA sugere etapas detalhadas para um projeto"""
    
    prompt = f"""
Você é um especialista em planejamento de projetos pessoais.

O usuário quer realizar: "{request.project_description}"
Categoria: {request.category}
Orçamento disponível: {f'R$ {request.budget:,.2f}' if request.budget else 'Não informado'}

Crie um plano detalhado com etapas, custos estimados (preços reais do mercado brasileiro atual) e prioridades.

Retorne APENAS um JSON válido no formato:
{{
    "project_name": "Nome sugerido para o projeto",
    "total_estimated": 15000.00,
    "timeline_months": 3,
    "tasks": [
        {{
            "name": "Nome da etapa",
            "estimated_cost": 2000.00,
            "priority": "alta",
            "notes": "Detalhes importantes"
        }}
    ],
    "tips": ["Dica 1", "Dica 2"]
}}

Regras:
1. Quebre em etapas lógicas e sequenciais
2. Use preços realistas do mercado brasileiro
3. Priorize: alta (essencial), media (importante), baixa (opcional)
4. Inclua mão de obra quando aplicável
"""
    
    ai_response = ask_ai_analysis(prompt, session)
    
    if not ai_response:
        # Fallback genérico
        return {
            "project_name": request.project_description,
            "total_estimated": 0,
            "timeline_months": 1,
            "tasks": [],
            "tips": ["Não foi possível gerar sugestões automáticas. Adicione as etapas manualmente."]
        }
    
    return ai_response


@app.post("/api/life-projects/ai-allocation-suggestion")
def ai_allocation_suggestion(session: Session = Depends(get_session)):
    """
    IA analisa todos os projetos e sugere como alocar a próxima quinzena.
    Integra com a feature de Alocação Quinzenal.
    """
    
    # Buscar projetos ativos
    projects = session.exec(select(LifeProject).where(LifeProject.status == "ativo")).all()
    
    # Buscar tarefas pendentes de alta prioridade
    high_priority_tasks = []
    for project in projects:
        tasks = session.exec(
            select(ProjectTask)
            .where(ProjectTask.project_id == project.id)
            .where(ProjectTask.status == "pendente")
            .where(ProjectTask.priority == "alta")
        ).all()
        for task in tasks:
            high_priority_tasks.append({
                "project": project.name,
                "project_category": project.category,
                "task": task.name,
                "cost": task.estimated_cost,
                "icon": project.icon
            })
    
    # Buscar dívidas
    debts = session.exec(select(Debt).where(Debt.status != "Quitado")).all()
    monthly_debts = sum(d.monthly for d in debts)
    
    # Ordenar tarefas por custo (menor primeiro para viabilidade)
    high_priority_tasks.sort(key=lambda x: x["cost"])
    
    suggestions = []
    
    # 1. Dívidas primeiro
    if monthly_debts > 0:
        suggestions.append({
            "category": "dividas",
            "icon": "💳",
            "title": "Compromissos Fixos",
            "description": f"{len(debts)} dívidas ativas",
            "suggested_amount": monthly_debts,
            "priority": "essencial",
            "items": [{"name": d.name, "value": d.monthly} for d in debts[:3]]
        })
    
    # 2. Tarefas de alta prioridade dos projetos
    for task in high_priority_tasks[:3]:
        suggestions.append({
            "category": task["project_category"],
            "icon": task["icon"],
            "title": f"{task['project']}: {task['task']}",
            "description": f"Prioridade alta",
            "suggested_amount": task["cost"],
            "priority": "alta",
        })
    
    # 3. Reserva de emergência (se não existir investimento em renda fixa)
    investments = session.exec(select(Investment).where(Investment.category == "fixed_income")).all()
    if not investments:
        suggestions.append({
            "category": "seguranca",
            "icon": "🛡️",
            "title": "Reserva de Emergência",
            "description": "Recomendado ter 6 meses de despesas",
            "suggested_amount": 500,  # Valor sugerido inicial
            "priority": "media",
        })
    
    return {
        "suggestions": suggestions,
        "total_projects": len(projects),
        "high_priority_tasks": len(high_priority_tasks),
        "message": f"Você tem {len(high_priority_tasks)} tarefas de alta prioridade em {len(projects)} projetos ativos."
    }


# Categorias de projetos disponíveis
PROJECT_CATEGORIES = [
    {"id": "casa", "name": "Casa & Reforma", "icon": "🏠"},
    {"id": "saude", "name": "Saúde & Bem-estar", "icon": "🏥"},
    {"id": "lazer", "name": "Lazer & Viagens", "icon": "🎉"},
    {"id": "carreira", "name": "Carreira & Educação", "icon": "💼"},
    {"id": "familia", "name": "Família", "icon": "👨‍👩‍👧"},
    {"id": "veiculo", "name": "Veículo", "icon": "🚗"},
    {"id": "tecnologia", "name": "Tecnologia", "icon": "💻"},
    {"id": "outro", "name": "Outros", "icon": "📦"},
]

@app.get("/api/life-projects/categories")
def get_project_categories():
    """Lista categorias disponíveis para projetos"""
    return PROJECT_CATEGORIES

