"""Modelo de transações financeiras."""
from typing import Optional
from sqlmodel import SQLModel, Field


class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    accountId: Optional[int] = Field(default=None, foreign_key="account.id")
    description: str
    amount: float
    type: str  # 'income' | 'expense'
    date: str
    category: str
    status: str  # 'completed' | 'pending'
