"""Modelos de ativos e passivos para patrimônio líquido."""
from typing import Optional
from sqlmodel import SQLModel, Field


class Asset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    value: float
    iconType: str  # 'home' | 'car' | 'investment' | 'other'


class Liability(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    value: float
    iconType: str  # 'loan' | 'card' | 'debt' | 'other'
