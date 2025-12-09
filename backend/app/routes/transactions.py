"""
Rotas de transações financeiras.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Transaction, Account

router = APIRouter(prefix="/api", tags=["transactions"])


@router.get("/transactions/", response_model=List[Transaction])
def read_transactions(session: Session = Depends(get_session)):
    """Lista todas as transações, ordenadas da mais recente para a mais antiga."""
    transactions = session.exec(select(Transaction).order_by(Transaction.id.desc())).all()
    return transactions


@router.post("/transactions/", response_model=Transaction)
def create_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    """Cria uma nova transação financeira e atualiza o saldo da conta vinculada."""
    session.add(transaction)
    
    # Atualizar saldo da conta se houver accountId
    if transaction.accountId:
        account = session.get(Account, transaction.accountId)
        if account:
            if transaction.type == 'income':
                account.balance += transaction.amount
            elif transaction.type == 'expense':
                account.balance -= transaction.amount
            session.add(account)
            
    session.commit()
    session.refresh(transaction)
    return transaction


@router.delete("/transactions/{transaction_id}/")
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    """Deleta uma transação pelo ID."""
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    session.delete(transaction)
    session.commit()
    return {"ok": True}
