"""Modelo de categorias."""
from typing import Optional
from sqlmodel import SQLModel, Field


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    color: str
