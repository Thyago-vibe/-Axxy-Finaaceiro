
import google.generativeai as genai
import os

api_key = "AIzaSyCeYkO9cH8daTVNBtE6KfKWcU68WacnV2k"
genai.configure(api_key=api_key)

print("Listando modelos disponíveis:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Erro: {e}")
