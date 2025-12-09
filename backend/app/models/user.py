"""Modelo de perfil do usuário."""
from typing import Optional
from sqlmodel import SQLModel, Field


class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    avatar: str
