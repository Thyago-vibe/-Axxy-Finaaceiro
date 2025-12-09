"""
Configuração do banco de dados SQLite com SQLModel.
"""
from sqlmodel import create_engine, Session
from .config import DATABASE_URL

# Cria a conexão com o banco
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def get_session():
    """Injeção de dependência para obter a sessão do banco."""
    with Session(engine) as session:
        yield session
