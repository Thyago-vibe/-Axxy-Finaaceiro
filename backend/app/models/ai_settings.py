"""Modelo de configurações de IA."""
from typing import Optional
from sqlmodel import SQLModel, Field


class AISettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    api_key: str
    instructions: str
    last_tested: Optional[str] = None
    is_active: bool = True
