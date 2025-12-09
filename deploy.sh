#!/bin/bash
# =================================
# Axxy Finance - Deploy Script
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║      🚀 Axxy Finance - Deploy          ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# =================================
# 1. Check Prerequisites
# =================================
echo -e "${YELLOW}[1/5] Verificando pré-requisitos...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado!${NC}"
    echo "Instale Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker instalado${NC}"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não encontrado!${NC}"
    echo "Instale Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose instalado${NC}"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon não está rodando!${NC}"
    echo "Inicie o Docker e tente novamente."
    exit 1
fi
echo -e "${GREEN}✓ Docker daemon rodando${NC}"

# =================================
# 2. Setup Environment
# =================================
echo -e "\n${YELLOW}[2/5] Configurando ambiente...${NC}"

# Create .env if not exists
if [ ! -f .env ]; then
    echo "Criando arquivo .env a partir do template..."
    cp .env.example .env
    echo -e "${GREEN}✓ Arquivo .env criado${NC}"
    echo -e "${YELLOW}⚠️ Edite .env para configurar suas API keys${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env já existe${NC}"
fi

# Create data directory for persistence
mkdir -p data
echo -e "${GREEN}✓ Diretório data/ criado${NC}"

# =================================
# 3. Stop Existing Containers
# =================================
echo -e "\n${YELLOW}[3/5] Parando containers existentes...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Containers anteriores removidos${NC}"

# =================================
# 4. Build and Start
# =================================
echo -e "\n${YELLOW}[4/5] Construindo e iniciando containers...${NC}"

# Build images
echo "Construindo imagens Docker (pode demorar alguns minutos)..."
docker compose build --no-cache

# Start containers
echo "Iniciando containers..."
docker compose up -d

# =================================
# 5. Health Check
# =================================
echo -e "\n${YELLOW}[5/5] Verificando saúde dos serviços...${NC}"

# Wait for services to start
echo "Aguardando serviços iniciarem..."
sleep 10

# Check backend
echo -n "Backend: "
if curl -s http://localhost:8000/api/profile/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Rodando${NC}"
else
    echo -e "${YELLOW}⏳ Iniciando...${NC}"
fi

# Check frontend
echo -n "Frontend: "
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Rodando${NC}"
else
    echo -e "${YELLOW}⏳ Iniciando...${NC}"
fi

# =================================
# Success!
# =================================
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║     ✅ Deploy concluído com sucesso!   ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "🌐 Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "🔧 Backend:  ${BLUE}http://localhost:8000${NC}"
echo -e "📚 API Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo ""
echo -e "Para ver logs:      ${YELLOW}docker compose logs -f${NC}"
echo -e "Para parar:         ${YELLOW}docker compose down${NC}"
echo -e "Para reiniciar:     ${YELLOW}docker compose restart${NC}"
echo ""
