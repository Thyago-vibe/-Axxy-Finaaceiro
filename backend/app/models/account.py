"""Modelo de contas bancárias/carteiras."""
from typing import Optional
from sqlmodel import SQLModel, Field


class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    balance: float
    color: str
    icon: str
