
import os
from openai import OpenAI

# Sua chave
api_key = "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"

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
)

print("🔍 Buscando modelos Amazon Nova no OpenRouter...")
try:
    models = client.models.list()
    nova_models = [m.id for m in models.data if "nova" in m.id.lower() or "amazon" in m.id.lower()]
    
    if nova_models:
        print("\n✅ Modelos encontrados:")
        for model_id in nova_models:
            print(f" - {model_id}")
            # Tentar verificar preço se disponível no ID (as vezes :free ajuda)
    else:
        print("\n❌ Nenhum modelo 'nova' ou 'amazon' encontrado na lista.")

    print("\n🔍 Buscando modelos gratuitos (:free)...")
    free_models = [m.id for m in models.data if ":free" in m.id.lower()]
    for model_id in free_models[:10]: # Listar os primeiros 10
         print(f" - {model_id}")

except Exception as e:
    print(f"\nErro ao listar modelos: {e}")
