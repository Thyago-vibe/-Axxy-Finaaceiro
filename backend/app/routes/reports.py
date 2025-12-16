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
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    filtered = [t for t in transactions if t.date >= cutoff and t.type == "expense"]
    
    # Calcular distribuição por categoria com cores diferentes
    categories = {}
    total_spent = sum(t.amount for t in filtered)
    colors = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316']
    
    for t in filtered:
        if t.category not in categories:
            categories[t.category] = 0
        categories[t.category] += t.amount
    
    distribution = []
    for i, (cat, val) in enumerate(categories.items()):
        distribution.append({
            "name": cat,
            "value": val,
            "percentage": round((val / total_spent) * 100, 1) if total_spent > 0 else 0,
            "color": colors[i % len(colors)]
        })
    
    # Calcular variação vs mês anterior
    prev_cutoff_start = (datetime.now() - timedelta(days=days * 2)).strftime("%Y-%m-%d")
    prev_cutoff_end = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    prev_filtered = [t for t in transactions if prev_cutoff_start <= t.date < prev_cutoff_end and t.type == "expense"]
    prev_total = sum(t.amount for t in prev_filtered)
    
    if prev_total > 0:
        change = round(((total_spent - prev_total) / prev_total) * 100, 1)
    else:
        change = 0
    
    return {
        "kpi": {
            "totalSpent": total_spent,
            "totalSpentChange": change,
            "topCategory": max(categories, key=categories.get) if categories else "N/A",
            "topCategoryValue": max(categories.values()) if categories else 0,
            "transactionCount": len(filtered),
            "transactionCountChange": 0
        },
        "distribution": distribution
    }


@router.get("/reports/cash-flow/")
def get_cash_flow(range: str = "this-year", session: Session = Depends(get_session)):
    """Retorna dados de fluxo de caixa (receitas vs despesas) por mês."""
    transactions = session.exec(select(Transaction)).all()
    
    # Determinar número de meses baseado no range
    range_months = {
        "this-month": 1,
        "30-days": 1,
        "this-year": 12,
        "7d": 1,
        "30d": 1,
        "90d": 3,
    }
    num_months = range_months.get(range, 6)
    
    # Gerar dados mensais
    months_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    today = datetime.now()
    result = []
    
    for i in range(num_months - 1, -1, -1):
        target_date = today - timedelta(days=30 * i)
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


@router.get("/reports/spending-trends/")
def get_spending_trends(range: str = "this-year", session: Session = Depends(get_session)):
    """Retorna tendência de gastos ao longo dos meses."""
    transactions = session.exec(select(Transaction)).all()
    
    range_months = {
        "this-month": 3,
        "30-days": 3,
        "this-year": 12,
        "7d": 3,
        "30d": 3,
        "90d": 6,
    }
    num_months = range_months.get(range, 6)
    
    months_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    today = datetime.now()
    result = []
    prev_value = None
    
    for i in range(num_months - 1, -1, -1):
        target_date = today - timedelta(days=30 * i)
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


@router.get("/reports/income-sources/")
def get_income_sources(range: str = "this-month", session: Session = Depends(get_session)):
    """Retorna receitas agrupadas por categoria/fonte."""
    transactions = session.exec(select(Transaction)).all()
    
    range_map = {
        "this-month": 30,
        "30-days": 30,
        "this-year": 365,
        "7d": 7,
        "30d": 30,
        "90d": 90,
    }
    days = range_map.get(range, 30)
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    filtered = [t for t in transactions if t.date >= cutoff and t.type == "income"]
    
    categories = {}
    total_income = sum(t.amount for t in filtered)
    colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6', '#ec4899']
    
    for t in filtered:
        cat = t.category or "Outros"
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += t.amount
    
    result = []
    for i, (cat, val) in enumerate(categories.items()):
        result.append({
            "name": cat,
            "value": val,
            "percentage": round((val / total_income) * 100, 1) if total_income > 0 else 0,
            "color": colors[i % len(colors)]
        })
    
    return result





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
