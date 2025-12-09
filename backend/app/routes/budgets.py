"""
Rotas de orçamentos (budgets).
"""
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Budget, BudgetItem, Transaction, Account
from ..services.ai_service import ask_ai_analysis

router = APIRouter(prefix="/api", tags=["budgets"])


@router.get("/budgets/", response_model=List[Budget])
def read_budgets(session: Session = Depends(get_session)):
    budgets = session.exec(select(Budget)).all()
    transactions = session.exec(select(Transaction)).all()
    for b in budgets:
        total_spent = sum(t.amount for t in transactions if t.category == b.category and t.type == 'expense')
        b.spent = total_spent
    return budgets


@router.post("/budgets/", response_model=Budget)
def create_budget(budget: Budget, session: Session = Depends(get_session)):
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}/")
def delete_budget(budget_id: int, session: Session = Depends(get_session)):
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    session.delete(budget)
    session.commit()
    return {"ok": True}


@router.put("/budgets/{budget_id}/", response_model=Budget)
def update_budget(budget_id: int, budget_data: dict, session: Session = Depends(get_session)):
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
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


# --- Budget Items ---
@router.post("/budgets/{budget_id}/items", response_model=BudgetItem)
def create_budget_item(budget_id: int, item: BudgetItem, session: Session = Depends(get_session)):
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    item.budget_id = budget_id
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.get("/budgets/{budget_id}/items", response_model=List[BudgetItem])
def get_budget_items(budget_id: int, session: Session = Depends(get_session)):
    return session.exec(select(BudgetItem).where(BudgetItem.budget_id == budget_id)).all()


@router.put("/budgets/{budget_id}/items/{item_id}", response_model=BudgetItem)
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


@router.delete("/budgets/{budget_id}/items/{item_id}")
def delete_budget_item(budget_id: int, item_id: int, session: Session = Depends(get_session)):
    item = session.get(BudgetItem, item_id)
    if not item or item.budget_id != budget_id:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    session.delete(item)
    session.commit()
    return {"ok": True}


@router.post("/budgets/suggest")
def suggest_budget_category(data: dict, session: Session = Depends(get_session)):
    """Sugere categoria para transação."""
    description = data.get("description", "").lower()
    amount = data.get("amount", 0)
    
    category_keywords = {
        "Moradia": ["aluguel", "condomínio", "iptu", "água", "luz", "energia", "gas", "internet"],
        "Alimentação": ["mercado", "supermercado", "feira", "padaria", "restaurante", "ifood", "rappi"],
        "Transporte": ["uber", "99", "táxi", "ônibus", "metrô", "gasolina", "combustível"],
        "Lazer": ["cinema", "teatro", "show", "netflix", "spotify", "disney"],
        "Saúde": ["médico", "hospital", "farmácia", "remédio", "consulta", "exame"],
    }
    
    scores = {}
    for category, keywords in category_keywords.items():
        score = sum(len(kw) * 2 for kw in keywords if kw in description)
        scores[category] = score
    
    best_category = max(scores, key=scores.get) if scores else "Outros"
    max_score = scores.get(best_category, 0)
    confidence = min(100, (max_score / 10) * 100) if max_score > 0 else 0
    
    return {"suggestedCategory": best_category, "confidence": round(confidence, 1)}


@router.post("/budgets/calculate-limit")
def calculate_budget_limit(data: dict, session: Session = Depends(get_session)):
    """Calcula limite ideal baseado em IA."""
    category = data.get("category", "")
    priority = data.get("priority", "medio")
    goal_amount = data.get("goal_amount", 0)
    
    accounts = session.exec(select(Account)).all()
    total_balance = sum(a.balance for a in accounts)
    
    cutoff_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    transactions = session.exec(select(Transaction)).all()
    recent = [t for t in transactions if t.date >= cutoff_date]
    
    monthly_income = sum(t.amount for t in recent if t.type == "income") / 3
    monthly_expenses = sum(t.amount for t in recent if t.type == "expense") / 3
    monthly_available = monthly_income - monthly_expenses
    
    priority_mult = {"essencial": 0.35, "alto": 0.25, "medio": 0.20, "baixo": 0.10}.get(priority, 0.20)
    suggested_limit = max(50, monthly_available * priority_mult)
    
    return {
        "suggested_limit": round(suggested_limit, 2),
        "available_monthly": round(monthly_available, 2),
        "total_balance": round(total_balance, 2),
        "goal_amount": goal_amount,
        "explanation": f"Baseado em renda de R$ {monthly_income:,.2f}/mês"
    }


@router.post("/budgets/allocate")
def auto_allocate_budgets(data: dict, session: Session = Depends(get_session)):
    """Aloca dinheiro entre orçamentos."""
    available = data.get("availableAmount", 0)
    budgets = session.exec(select(Budget)).all()
    
    priority_weights = {"essencial": 4, "alto": 3, "medio": 2, "baixo": 1}
    total_weight = sum(priority_weights.get(b.priority, 2) for b in budgets)
    
    allocations = []
    for b in budgets:
        weight = priority_weights.get(b.priority, 2)
        allocation = (weight / total_weight) * available if total_weight > 0 else 0
        allocations.append({"id": b.id, "category": b.category, "allocation": round(allocation, 2)})
    
    return {"allocations": allocations}


@router.post("/budgets/calculate-priorities")
def calculate_priorities(session: Session = Depends(get_session)):
    """Calcula prioridades via IA."""
    budgets = session.exec(select(Budget)).all()
    
    for i, b in enumerate(budgets):
        base_score = {"essencial": 80, "alto": 60, "medio": 40, "baixo": 20}.get(b.priority, 40)
        b.ai_priority_score = min(100, base_score + (len(budgets) - i) * 2)
        b.ai_priority_reason = f"Prioridade {b.priority} definida pelo usuário"
        session.add(b)
    
    session.commit()
    return {"status": "success", "updated": len(budgets)}
