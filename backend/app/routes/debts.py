"""
Rotas de dívidas e alertas.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Debt, Alert

router = APIRouter(prefix="/api", tags=["debts", "alerts"])


# --- Debts ---
@router.get("/debts/", response_model=List[Debt])
def read_debts(session: Session = Depends(get_session)):
    return session.exec(select(Debt)).all()


@router.post("/debts/", response_model=Debt)
def create_debt(debt: Debt, session: Session = Depends(get_session)):
    session.add(debt)
    session.commit()
    session.refresh(debt)
    return debt


# --- Alerts ---
@router.get("/alerts/", response_model=List[Alert])
def read_alerts(session: Session = Depends(get_session)):
    return session.exec(select(Alert)).all()


@router.put("/alerts/{alert_id}/", response_model=Alert)
def update_alert(alert_id: int, alert_data: Alert, session: Session = Depends(get_session)):
    alert = session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    alert.category = alert_data.category
    alert.budget = alert_data.budget
    alert.threshold = alert_data.threshold
    alert.enabled = alert_data.enabled
    
    session.add(alert)
    session.commit()
    session.refresh(alert)
    return alert


@router.put("/debts/{debt_id}/", response_model=Debt)
def update_debt(debt_id: int, debt_data: Debt, session: Session = Depends(get_session)):
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")

    debt.name = debt_data.name
    debt.remaining = debt_data.remaining
    debt.monthly = debt_data.monthly
    debt.dueDate = debt_data.dueDate
    debt.status = debt_data.status
    debt.isUrgent = debt_data.isUrgent
    debt.debtType = debt_data.debtType
    debt.totalInstallments = debt_data.totalInstallments
    debt.currentInstallment = debt_data.currentInstallment

    session.add(debt)
    session.commit()
    session.refresh(debt)
    return debt


@router.delete("/debts/{debt_id}/")
def delete_debt(debt_id: int, session: Session = Depends(get_session)):
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")

    session.delete(debt)
    session.commit()
    return {"ok": True}


from pydantic import BaseModel

class PaymentRequest(BaseModel):
    amount: float
    accountId: int
    date: str

@router.post("/debts/{debt_id}/pay/")
def pay_debt(debt_id: int, payment: PaymentRequest, session: Session = Depends(get_session)):
    from ..models import Transaction, Account  # Local import to avoid circular dependency if any

    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")

    account = session.get(Account, payment.accountId)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")

    # 1. Create Transaction
    transaction = Transaction(
        description=f"Pagamento Dívida: {debt.name}",
        amount=payment.amount,
        type="expense",
        category="Dívidas",
        date=payment.date,
        accountId=account.id,
        status="completed"
    )
    session.add(transaction)

    # 2. Update Account Balance
    account.balance -= payment.amount
    session.add(account)

    # 3. Update Debt
    # Reduce remaining amount
    if debt.remaining > 0:
        debt.remaining = max(0.0, debt.remaining - payment.amount)
    
    # Update installment count if applicable
    if debt.debtType == 'parcelado' and debt.currentInstallment and debt.totalInstallments:
         if debt.currentInstallment < debt.totalInstallments:
             debt.currentInstallment += 1

    # Check if fully paid
    if debt.remaining <= 0 and debt.debtType == 'parcelado':
         debt.status = 'Em dia' # Should probably mark as paid or finished, but 'Em dia' is safe for now or maybe delete? 
                                # User request implies "diminuir nos dasboard", so keeping it but with 0 value is fine or just reducing.
    
    # Generally if we pay, we might want to update status to 'Em dia' if it was 'Atrasado'
    if debt.status == 'Atrasado':
        debt.status = 'Em dia'

    session.add(debt)

    session.commit()
    
    return {"ok": True, "new_debt_remaining": debt.remaining, "new_account_balance": account.balance}
