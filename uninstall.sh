#!/bin/bash

# 🗑️ Script de Desinstalação - Axxy Finance

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_FILE="$HOME/.local/share/applications/axxy-finance.desktop"

echo -e "${YELLOW}🗑️  Desinstalando Axxy Finance...${NC}"

# Remover atalho desktop
if [ -f "$DESKTOP_FILE" ]; then
    rm "$DESKTOP_FILE"
    echo -e "${GREEN}✅ Atalho desktop removido${NC}"
else
    echo -e "${YELLOW}⚠️  Atalho desktop não encontrado${NC}"
fi

# Remover script de inicialização
if [ -f "$PROJECT_DIR/start-app.sh" ]; then
    rm "$PROJECT_DIR/start-app.sh"
    echo -e "${GREEN}✅ Script de inicialização removido${NC}"
fi

# Atualizar banco de dados de aplicações
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo ""
echo -e "${GREEN}✅ Desinstalação concluída!${NC}"
echo ""
echo "📝 Nota: Os arquivos do projeto ainda estão em:"
echo "   $PROJECT_DIR"
echo ""
echo "Para remover completamente:"
echo "   rm -rf $PROJECT_DIR"
echo ""
