"""Modelo de metas financeiras."""
from typing import Optional
from sqlmodel import SQLModel, Field


class Goal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    currentAmount: float
    targetAmount: float
    deadline: str
    color: str
    imageUrl: Optional[str] = None
