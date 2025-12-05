#!/bin/bash

# 🚀 Script de Instalação - Axxy Finance
# Este script cria um atalho desktop e scripts para iniciar a aplicação

set -e

echo "🚀 Instalando Axxy Finance..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="Axxy Finance"
DESKTOP_FILE="$HOME/.local/share/applications/axxy-finance.desktop"
ICON_PATH="$PROJECT_DIR/icon.png"

echo -e "${BLUE}📦 Verificando dependências...${NC}"

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm primeiro."
    exit 1
fi

echo -e "${GREEN}✅ Dependências verificadas${NC}"

# Instalar dependências do projeto
echo -e "${BLUE}📥 Instalando dependências do projeto...${NC}"
cd "$PROJECT_DIR"
npm install

# Build da aplicação
echo -e "${BLUE}🔨 Criando build de produção...${NC}"
npm run build

# Instalar 'serve' localmente já foi feito via package.json
echo -e "${BLUE}✅ Servidor configurado localmente${NC}"

# Criar script de inicialização
echo -e "${BLUE}📝 Criando script de inicialização...${NC}"
cat > "$PROJECT_DIR/start-app.sh" << 'EOF'
#!/bin/bash

# Script para iniciar Axxy Finance
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Função para limpar porta 3000
cleanup_port() {
    if lsof -ti:3000 >/dev/null; then
        echo "🧹 Liberando porta 3000..."
        lsof -ti:3000 | xargs kill -9 >/dev/null 2>&1
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$PROJECT_DIR/app.log"
cd "$PROJECT_DIR"

# Limpar log antigo
echo "--- Iniciando Axxy Finance: $(date) ---" > "$LOG_FILE"

# 1. Limpeza de processos antigos
pkill -f "serve -s dist" >> "$LOG_FILE" 2>&1

# 2. Iniciar servidor (usando caminho absoluto do npm)
echo "Iniciando servidor..." >> "$LOG_FILE"
/usr/bin/npm run start >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# 3. Aguardar servidor (método simples: sleep)
echo "Aguardando servidor subir..." >> "$LOG_FILE"
sleep 3

# 4. Abrir navegador
URL="http://localhost:3000"
echo "Abrindo navegador em: $URL" >> "$LOG_FILE"

if command -v google-chrome > /dev/null; then
    google-chrome --app="$URL" >> "$LOG_FILE" 2>&1 &
elif command -v chromium > /dev/null; then
    chromium --app="$URL" >> "$LOG_FILE" 2>&1 &
elif command -v brave-browser > /dev/null; then
    brave-browser --app="$URL" >> "$LOG_FILE" 2>&1 &
else
    xdg-open "$URL" >> "$LOG_FILE" 2>&1 &
fi

echo "Concluído." >> "$LOG_FILE"
EOF

chmod +x "$PROJECT_DIR/start-app.sh"

# Criar ícone se não existir
if [ ! -f "$ICON_PATH" ]; then
    echo -e "${BLUE}🎨 Criando ícone...${NC}"
    # Criar um ícone SVG simples
    cat > "$PROJECT_DIR/icon.svg" << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="40" fill="#0b120f"/>
  <circle cx="128" cy="128" r="80" fill="#00ff87" opacity="0.2"/>
  <text x="128" y="160" font-family="Arial" font-size="120" font-weight="bold" fill="#00ff87" text-anchor="middle">A</text>
</svg>
EOF
    ICON_PATH="$PROJECT_DIR/icon.svg"
fi

# Criar diretório para aplicações se não existir
mkdir -p "$HOME/.local/share/applications"

# Criar arquivo .desktop SEM TERMINAL
echo -e "${BLUE}🖥️  Criando atalho desktop...${NC}"
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Comment=Aplicativo de Gestão Financeira Pessoal
Exec="$PROJECT_DIR/start-app.sh"
Icon=$ICON_PATH
Terminal=false
Categories=Office;Finance;
Keywords=finance;money;budget;
StartupNotify=true
EOF

chmod +x "$DESKTOP_FILE"

# Atualizar banco de dados de aplicações
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo ""
echo -e "${GREEN}✅ Instalação concluída com sucesso!${NC}"
echo ""
echo "📱 Como usar:"
echo "   1. Procure por 'Axxy Finance' no menu de aplicativos"
echo "   2. Ou execute: $PROJECT_DIR/start-app.sh"
echo "   3. Acesse: http://localhost:3000"
echo ""
echo "🔧 Para desinstalar:"
echo "   rm $DESKTOP_FILE"
echo "   rm $PROJECT_DIR/start-app.sh"
echo ""
