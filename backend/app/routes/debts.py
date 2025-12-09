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
