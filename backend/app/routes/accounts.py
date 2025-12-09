"""
Rotas de contas bancárias.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Account

router = APIRouter(prefix="/api", tags=["accounts"])


@router.get("/accounts/", response_model=List[Account])
def read_accounts(session: Session = Depends(get_session)):
    return session.exec(select(Account)).all()


@router.post("/accounts/", response_model=Account)
def create_account(account: Account, session: Session = Depends(get_session)):
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.delete("/accounts/{account_id}/")
def delete_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    session.delete(account)
    session.commit()
    return {"ok": True}


@router.put("/accounts/{account_id}/", response_model=Account)
def update_account(account_id: int, account_data: Account, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    account.name = account_data.name
    account.type = account_data.type
    account.balance = account_data.balance
    account.color = account_data.color
    account.icon = account_data.icon
    
    session.add(account)
    session.commit()
    session.refresh(account)
    return account
