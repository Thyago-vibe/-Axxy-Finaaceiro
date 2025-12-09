"""
Rotas de categorias.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Category

router = APIRouter(prefix="/api", tags=["categories"])


@router.get("/categories/", response_model=List[Category])
def read_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()


@router.post("/categories/", response_model=Category)
def create_category(category: Category, session: Session = Depends(get_session)):
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/categories/{category_id}/")
def delete_category(category_id: int, session: Session = Depends(get_session)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    session.delete(category)
    session.commit()
    return {"ok": True}
