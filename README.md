<div align="center">
<img width="1200" height="475" alt="Axxy Finance Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 💰 Axxy Finance

**Sistema de gestão financeira pessoal com inteligência artificial**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react)](https://react.dev)

</div>

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone o repositório
git clone <seu-repo>
cd -Axxy-Finaaceiro

# 2. Execute o script de deploy
chmod +x deploy.sh
./deploy.sh

# 3. Acesse a aplicação
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## 📋 Pré-requisitos

- **Docker** 20.10+ ([Instalar](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ ([Instalar](https://docs.docker.com/compose/install/))

## ⚙️ Configuração

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite `.env` e configure suas API keys:
   ```env
   # IA (opcional, mas recomendado)
   OPENROUTER_API_KEY=sua_chave_aqui
   
   # Gemini (opcional)
   GEMINI_API_KEY=sua_chave_aqui
   ```

## 🛠️ Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `./deploy.sh` | Deploy completo |
| `docker compose up -d` | Iniciar containers |
| `docker compose down` | Parar containers |
| `docker compose logs -f` | Ver logs em tempo real |
| `docker compose restart` | Reiniciar serviços |
| `./scripts/backup.sh` | Fazer backup do banco |

## 📁 Estrutura do Projeto

```
axxy-finance/
├── backend/           # API FastAPI (Python)
│   ├── app/          # Rotas e modelos
│   └── main.py       # Aplicação principal
├── components/        # Componentes React
├── docker/           # Dockerfiles e nginx
├── scripts/          # Scripts utilitários
├── deploy.sh         # Script de deploy
└── docker-compose.yml
```

## 🌐 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/profile/` | Perfil do usuário |
| GET/POST | `/api/transactions/` | Transações |
| GET/POST | `/api/accounts/` | Contas |
| GET/POST | `/api/budgets/` | Orçamentos |
| GET/POST | `/api/goals/` | Metas |
| POST | `/api/ai/test` | Testar conexão IA |

## 🔧 Desenvolvimento Local

**Sem Docker (desenvolvimento):**

```bash
# Frontend
npm install
npm run dev

# Backend (em outro terminal)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 📦 Backup

```bash
# Criar backup
./scripts/backup.sh

# Backups são salvos em ./backups/
```

## 🐛 Troubleshooting

**Containers não iniciam:**
```bash
docker compose logs backend
docker compose logs frontend
```

**Porta em uso:**
```bash
# Verificar o que está usando a porta
lsof -i :3000
lsof -i :8000
```

**Limpar tudo e recomeçar:**
```bash
docker compose down -v
docker system prune -f
./deploy.sh
```

---

<div align="center">
Desenvolvido com ❤️ para controle financeiro inteligente
</div>
