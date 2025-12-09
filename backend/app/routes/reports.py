"""
Rotas de relatórios, análises e sumário.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Transaction, Goal, Debt, Account

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports/")
def get_reports(range: str = "30d", account: str = "all", session: Session = Depends(get_session)):
    """Retorna dados para relatórios."""
    transactions = session.exec(select(Transaction)).all()
    
    # Filtrar por período
    if range == "7d":
        cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    elif range == "90d":
        cutoff = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    else:
        cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    filtered = [t for t in transactions if t.date >= cutoff and t.type == "expense"]
    
    # Calcular distribuição por categoria
    categories = {}
    total_spent = sum(t.amount for t in filtered)
    
    for t in filtered:
        if t.category not in categories:
            categories[t.category] = 0
        categories[t.category] += t.amount
    
    distribution = [
        {
            "name": cat,
            "value": val,
            "percentage": round((val / total_spent) * 100, 1) if total_spent > 0 else 0,
            "color": "#22c55e"
        }
        for cat, val in categories.items()
    ]
    
    return {
        "kpi": {
            "totalSpent": total_spent,
            "totalSpentChange": 0,
            "topCategory": max(categories, key=categories.get) if categories else "-",
            "topCategoryValue": max(categories.values()) if categories else 0,
            "transactionCount": len(filtered),
            "transactionCountChange": 0
        },
        "distribution": distribution
    }


@router.get("/interconnected-summary/")
def get_interconnected_summary(session: Session = Depends(get_session)):
    """Retorna sumário com metas e dívidas."""
    goals = session.exec(select(Goal)).all()
    debts = session.exec(select(Debt)).all()
    
    return {
        "activeGoals": goals[:5],
        "upcomingDebts": [d for d in debts if d.status != "Atrasado"][:5],
        "insights": {
            "bestDecisions": ["Continue controlando seus gastos!"],
            "suggestedCuts": []
        }
    }


@router.get("/predictive-analysis/")
def get_predictive_analysis(session: Session = Depends(get_session)):
    """Retorna dados para análise preditiva."""
    accounts = session.exec(select(Account)).all()
    transactions = session.exec(select(Transaction)).all()
    
    total_balance = sum(a.balance for a in accounts)
    
    cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    recent = [t for t in transactions if t.date >= cutoff]
    
    monthly_income = sum(t.amount for t in recent if t.type == "income")
    base_expense = sum(t.amount for t in recent if t.type == "expense")
    
    return {
        "currentBalance": total_balance,
        "monthlyIncome": monthly_income,
        "baseExpense": base_expense,
        "scenarios": [
            {"id": 1, "label": "Cortar streaming", "savings": 50, "checked": False, "iconName": "Clapperboard", "color": "#8b5cf6"},
            {"id": 2, "label": "Reduzir delivery", "savings": 200, "checked": False, "iconName": "ShoppingBag", "color": "#f59e0b"},
        ]
    }


@router.get("/leakage-analysis/")
def get_leakage_analysis(session: Session = Depends(get_session)):
    """Análise de vazamentos financeiros."""
    return {
        "totalPotential": 0,
        "leaksCount": 0,
        "period": "30 dias",
        "suggestions": []
    }
