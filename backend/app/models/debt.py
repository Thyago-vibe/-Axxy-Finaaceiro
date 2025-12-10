"""Modelo de dívidas."""
from typing import Optional
from sqlmodel import SQLModel, Field


class Debt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    remaining: float
    monthly: float
    dueDate: str
    status: str
    isUrgent: bool = False
    debtType: str = "parcelado"  # 'fixo' | 'parcelado'
    totalInstallments: Optional[int] = None  # Total de parcelas (para parcelado)
    currentInstallment: Optional[int] = None  # Parcela atual (para parcelado)
