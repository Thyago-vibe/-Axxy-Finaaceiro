"""
Axxy Finance API - Main Application
===================================
Ponto de entrada da aplicação FastAPI com estrutura modular.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from .config import API_TITLE, CORS_ORIGINS
from .database import engine

# Import routers
from .routes import profile, transactions, goals, accounts, categories
from .routes import budgets, debts, net_worth, ai, reports


def create_tables():
    """Cria as tabelas no banco de dados."""
    # Import all models to register them
    from . import models  # noqa
    SQLModel.metadata.create_all(engine)


# Create FastAPI app
app = FastAPI(title=API_TITLE)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Executa ao iniciar a aplicação."""
    create_tables()


# Register all routers
app.include_router(profile.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(budgets.router)
app.include_router(debts.router)
app.include_router(net_worth.router)
app.include_router(ai.router)
app.include_router(reports.router)


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "app": "Axxy Finance API", "version": "2.0"}
