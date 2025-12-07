#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$PROJECT_DIR/app.log"
cd "$PROJECT_DIR"

# Limpar log antigo
echo "--- Iniciando Axxy Finance: $(date) ---" > "$LOG_FILE"

# 1. Limpeza de processos antigos na porta 3000
echo "Limpando processos antigos..." >> "$LOG_FILE"
pkill -f "serve -s dist" >> "$LOG_FILE" 2>&1
# Tentar matar processos na porta 3000 especificamente
fuser -k 3000/tcp >> "$LOG_FILE" 2>&1 || true
# Limpar processos do backend também
pkill -f "uvicorn" >> "$LOG_FILE" 2>&1 || true
fuser -k 8000/tcp >> "$LOG_FILE" 2>&1 || true

# 2. Iniciar servidor (usando caminho absoluto do npm)
echo "Iniciando servidor..." >> "$LOG_FILE"
/usr/bin/npm run start >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "Frontend iniciado com PID: $SERVER_PID" >> "$LOG_FILE"

# 2.1 Iniciar Backend
echo "Iniciando backend..." >> "$LOG_FILE"
cd backend
./venv/bin/uvicorn main:app --reload --port 8000 >> "$LOG_FILE" 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado com PID: $BACKEND_PID" >> "$LOG_FILE"
cd ..
echo "Servidor iniciado com PID: $SERVER_PID" >> "$LOG_FILE"

# 3. Aguardar servidor (método simples: sleep)
echo "Aguardando servidor subir..." >> "$LOG_FILE"
sleep 3

# 4. Abrir navegador
URL="http://localhost:3000"
echo "Abrindo navegador em: $URL" >> "$LOG_FILE"

# Procurar Chrome em vários lugares
if [ -f /opt/google/chrome/chrome ]; then
    echo "Usando Google Chrome (/opt)..." >> "$LOG_FILE"
    /opt/google/chrome/chrome --app="$URL" >> "$LOG_FILE" 2>&1 &
elif command -v google-chrome > /dev/null; then
    echo "Usando Google Chrome (sistema)..." >> "$LOG_FILE"
    google-chrome --app="$URL" >> "$LOG_FILE" 2>&1 &
elif [ -f /snap/bin/chromium ]; then
    echo "Usando Chromium (snap)..." >> "$LOG_FILE"
    /snap/bin/chromium --app="$URL" >> "$LOG_FILE" 2>&1 &
elif command -v chromium > /dev/null; then
    echo "Usando Chromium..." >> "$LOG_FILE"
    chromium --app="$URL" >> "$LOG_FILE" 2>&1 &
elif command -v firefox > /dev/null; then
    echo "Usando Firefox..." >> "$LOG_FILE"
    firefox --new-window "$URL" >> "$LOG_FILE" 2>&1 &
else
    echo "Usando navegador padrão (xdg-open)..." >> "$LOG_FILE"
    xdg-open "$URL" >> "$LOG_FILE" 2>&1 &
fi

echo "Concluído." >> "$LOG_FILE"
