
# Axxy Finance - Guia do Backend (FastAPI)

Este guia contém todo o código necessário para rodar o servidor do Axxy Finance.
Utilizamos **FastAPI** (framework web moderno e rápido) e **SQLModel** (interação com banco de dados simples).

---

## 🚀 1. Instalação e Preparação

Crie uma pasta chamada `backend` fora da pasta do frontend e abra um terminal nela.

### Passo 1: Instalar dependências
Execute o comando abaixo para instalar as bibliotecas necessárias:

```bash
pip install fastapi uvicorn sqlmodel
```

*   **fastapi**: O framework da API.
*   **uvicorn**: O servidor que roda o FastAPI.
*   **sqlmodel**: Gerencia o banco de dados (SQLite) e validação de dados.

---

## 💻 2. O Código do Servidor (`main.py`)

Crie um arquivo chamado `main.py` dentro da pasta `backend` e cole **todo o código abaixo**.
Este arquivo contém a definição do Banco de Dados, os Modelos de Dados e todas as Rotas da API.

```python
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
# 5. ROTAS DE PATRIMÔNIO LÍQUIDO
# ==========================================

@app.get("/api/net-worth/")
def get_net_worth_dashboard(session: Session = Depends(get_session)):
    """Retorna dados agregados para o dashboard de Patrimônio."""
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    
    # Se vazio, cria alguns mocks para o usuário ver como funciona
    if not assets:
        assets = [
            Asset(name="Imóvel Residencial", type="Casa", value=240000, iconType="home"),
            Asset(name="Veículo Principal", type="Carro", value=120000, iconType="car"),
            Asset(name="Investimentos", type="Renda Variável", value=180000, iconType="investment")
        ]
        for a in assets: session.add(a)
        session.commit()
        
    if not liabilities:
        liabilities = [
            Liability(name="Financiamento Imob", type="Empréstimo", value=100000, iconType="loan"),
            Liability(name="Financiamento Carro", type="Empréstimo", value=35000, iconType="car"),
            Liability(name="Cartão Crédito", type="Dívida", value=15000, iconType="card")
        ]
        for l in liabilities: session.add(l)
        session.commit()
    
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

```

---

## 🚀 3. Como Rodar

No terminal, dentro da pasta `backend`, execute:

```bash
uvicorn main:app --reload
```

*   O servidor iniciará em `http://127.0.0.1:8000`.
*   O banco de dados `database.db` será criado automaticamente na primeira execução.

### 📄 Documentação Automática

Com o servidor rodando, acesse `http://127.0.0.1:8000/docs` no seu navegador.
Você verá uma interface gráfica interativa (Swagger UI) onde pode ver e testar todas as rotas listadas acima sem precisar do Frontend.

---

## 📚 Documentação das Rotas

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| **GET** | `/api/profile/` | Retorna o nome, email e avatar do usuário atual. |
| **POST** | `/api/profile/` | Atualiza os dados do perfil do usuário. |
| **GET** | `/api/transactions/` | Lista todas as transações financeiras. |
| **POST** | `/api/transactions/` | Cria uma nova receita ou despesa. |
| **DELETE** | `/api/transactions/{id}` | Deleta uma transação específica. |
| **GET** | `/api/reports/` | Retorna KPIs e dados para gráficos, calculados a partir das transações. |
| **GET** | `/api/leakage-analysis/` | Retorna sugestões de economia (IA Mockada). |
| **GET** | `/api/predictive-analysis/` | Retorna dados para o gráfico de projeção futura. |

| **GET** | `/api/net-worth/` | Retorna o dashboard completo de Patrimônio Líquido. |

Este backend está 100% pronto para se comunicar com o Frontend Axxy Finance.
