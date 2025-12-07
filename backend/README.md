# Axxy Finance - Backend Setup

## ✅ Ambiente Virtual Configurado

Este projeto usa um ambiente virtual Python para isolar as dependências do backend.

### 📦 Dependências Instaladas:
- **FastAPI** 0.124.0 - Framework web moderno
- **Uvicorn** 0.38.0 - Servidor ASGI
- **SQLModel** 0.0.27 - ORM para banco de dados

### 🚀 Como Rodar:

#### Opção 1: Usar o script automático (Recomendado)
```bash
./start-app.sh
```
Este script inicia automaticamente o frontend (porta 3000) e o backend (porta 8000).

#### Opção 2: Rodar manualmente o backend
```bash
cd backend
./venv/bin/uvicorn main:app --reload --port 8000
```

### 🔧 Comandos Úteis:

**Ativar ambiente virtual:**
```bash
cd backend
source venv/bin/activate
```

**Instalar novas dependências:**
```bash
./venv/bin/pip install <pacote>
```

**Verificar dependências instaladas:**
```bash
./venv/bin/pip list
```

### 📊 Endpoints Disponíveis:

- **GET** `/api/profile/` - Perfil do usuário
- **GET** `/api/transactions/` - Lista de transações
- **GET** `/api/goals/` - Metas financeiras
- **GET** `/api/budgets/` - Orçamentos
- **GET** `/api/net-worth/` - Patrimônio líquido
- **GET** `/api/reports/` - Relatórios e análises
- **GET** `/docs` - Documentação interativa (Swagger)

### 🗄️ Banco de Dados:

O banco de dados SQLite é criado automaticamente em `backend/database.db` na primeira execução.
