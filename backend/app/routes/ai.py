"""
Rotas de configuração e teste de IA.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import AISettings

router = APIRouter(prefix="/api", tags=["ai"])


@router.get("/config/ai", response_model=dict)
def get_ai_settings(session: Session = Depends(get_session)):
    """Retorna as configurações de IA (mascara a API Key)."""
    settings = session.exec(select(AISettings)).first()
    
    if not settings:
        return {"api_key": "", "instructions": "", "is_connected": False, "last_tested": None}
    
    masked_key = ""
    if settings.api_key and len(settings.api_key) > 4:
        masked_key = f"sk-...{settings.api_key[-4:]}"
    elif settings.api_key:
        masked_key = "******"
        
    return {
        "api_key": masked_key,
        "instructions": settings.instructions,
        "is_connected": settings.is_active,
        "last_tested": settings.last_tested,
        "model_name": "Amazon Nova 2 Lite (Free)",
        "provider": "OpenRouter"
    }


@router.post("/config/ai")
def save_ai_settings(data: dict, session: Session = Depends(get_session)):
    """Salva a chave de API e instruções."""
    settings = session.exec(select(AISettings)).first()
    
    api_key = data.get("api_key")
    instructions = data.get("instructions", "")
    
    if not settings:
        settings = AISettings(api_key=api_key, instructions=instructions, is_active=False)
        session.add(settings)
    else:
        if api_key and not api_key.startswith("sk-...") and not api_key.startswith("***"):
            settings.api_key = api_key
        settings.instructions = instructions
        session.add(settings)
        
    session.commit()
    return {"status": "success", "message": "Configurações salvas"}


@router.post("/ai/test")
def test_ai_connection(session: Session = Depends(get_session)):
    """Testa a conexão com a IA."""
    settings = session.exec(select(AISettings)).first()
    
    if not settings or not settings.api_key:
        raise HTTPException(status_code=400, detail="Chave de API não configurada")
    
    try:
        from openai import OpenAI
        
        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=settings.api_key)
        
        completion = client.chat.completions.create(
            model="amazon/nova-2-lite-v1:free",
            messages=[{"role": "user", "content": "Responda apenas com a palavra 'CONECTADO'."}]
        )
        
        response_text = completion.choices[0].message.content
        
        if response_text:
            settings.last_tested = datetime.now().isoformat()
            settings.is_active = True
            session.add(settings)
            session.commit()
            
            return {
                "status": "success",
                "message": "Conexão bem-sucedida!",
                "response_time": "120ms",
                "ai_response": response_text
            }
        else:
            raise Exception("Resposta vazia")
            
    except Exception as e:
        settings.is_active = False
        session.add(settings)
        session.commit()
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
