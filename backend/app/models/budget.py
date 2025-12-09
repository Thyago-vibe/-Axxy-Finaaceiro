"""Modelos de orçamento e subitens."""
from typing import Optional
from sqlmodel import SQLModel, Field


class Budget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category: str
    spent: float = 0
    limit: float
    icon: str
    priority: str = Field(default="medio")
    goal: Optional[str] = None
    
    # Campos para unificação com Metas
    budget_type: str = Field(default="expense")
    target_amount: Optional[float] = None
    current_amount: float = 0
    deadline: Optional[str] = None
    ai_priority_score: Optional[float] = None
    ai_priority_reason: Optional[str] = None


class BudgetItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    budget_id: int = Field(foreign_key="budget.id")
    name: str
    target_amount: float
    spent: float = 0
    completed: bool = False
