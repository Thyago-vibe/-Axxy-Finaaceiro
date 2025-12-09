"""
Serviço de integração com IA (OpenRouter/Amazon Nova).
"""
import json
from typing import Optional
from sqlmodel import Session, select

from ..models import AISettings


def ask_ai_analysis(prompt: str, session: Session) -> Optional[dict]:
    """Função auxiliar para consultar a IA configurada."""
    settings = session.exec(select(AISettings)).first()
    
    if not settings or not settings.api_key or not settings.is_active:
        return None
        
    try:
        from openai import OpenAI
        
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.api_key,
        )
        
        system_prompt = (
            f"Você é um analista financeiro experiente. {settings.instructions or ''} "
            "Sua resposta deve ser estritamente um JSON válido, sem markdown, sem explicações extras."
        )
        
        response = client.chat.completions.create(
            model="amazon/nova-2-lite-v1:free",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        )
        
        content = response.choices[0].message.content
        if not content:
            return None

        # Limpeza de markdown code blocks se a IA mandar
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
            
        return json.loads(content.strip())
        
    except Exception as e:
        print(f"Erro na IA: {e}")
        return None
