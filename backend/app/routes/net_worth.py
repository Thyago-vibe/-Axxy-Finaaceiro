"""
Rotas de patrimônio líquido (ativos e passivos).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Asset, Liability

router = APIRouter(prefix="/api", tags=["net-worth"])


@router.get("/net-worth/")
def get_net_worth(session: Session = Depends(get_session)):
    assets = session.exec(select(Asset)).all()
    liabilities = session.exec(select(Liability)).all()
    
    total_assets = sum(a.value for a in assets)
    total_liabilities = sum(l.value for l in liabilities)
    
    return {
        "totalAssets": total_assets,
        "totalLiabilities": total_liabilities,
        "netWorth": total_assets - total_liabilities,
        "assets": assets,
        "liabilities": liabilities,
        "history": [],
        "composition": []
    }


@router.post("/assets/", response_model=Asset)
def create_asset(asset: Asset, session: Session = Depends(get_session)):
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.delete("/assets/{asset_id}/")
def delete_asset(asset_id: int, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    session.delete(asset)
    session.commit()
    return {"ok": True}


@router.post("/liabilities/", response_model=Liability)
def create_liability(liability: Liability, session: Session = Depends(get_session)):
    session.add(liability)
    session.commit()
    session.refresh(liability)
    return liability


@router.delete("/liabilities/{liability_id}/")
def delete_liability(liability_id: int, session: Session = Depends(get_session)):
    liability = session.get(Liability, liability_id)
    if not liability:
        raise HTTPException(status_code=404, detail="Passivo não encontrado")
    session.delete(liability)
    session.commit()
    return {"ok": True}
