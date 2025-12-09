"""
Configurações da aplicação via variáveis de ambiente.
"""
import os

# Database
DATABASE_FILE = os.getenv("DATABASE_FILE", "database.db")
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

# CORS
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",")]

# API Settings
API_TITLE = "Axxy Finance API"
