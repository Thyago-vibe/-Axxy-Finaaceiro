#!/bin/bash
# =================================
# Axxy Finance - Backup Script
# Backup do banco de dados SQLite
# =================================

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_FILE="$PROJECT_DIR/backend/database.db"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/axxy_backup_$DATE.db"
KEEP_DAYS=7

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Axxy Finance - Backup${NC}"
echo "================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    # Try Docker volume
    DOCKER_DB=$(docker compose exec -T backend cat /app/database.db 2>/dev/null) || true
    if [ -n "$DOCKER_DB" ]; then
        echo "Copiando banco do container Docker..."
        docker compose cp backend:/app/database.db "$BACKUP_FILE"
    else
        echo -e "${RED}❌ Banco de dados não encontrado!${NC}"
        exit 1
    fi
else
    # Copy local database
    echo "Copiando banco de dados local..."
    cp "$DB_FILE" "$BACKUP_FILE"
fi

# Compress backup
echo "Comprimindo backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Calculate size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${GREEN}✓ Backup criado: $BACKUP_FILE ($SIZE)${NC}"

# Cleanup old backups
echo -e "\n${YELLOW}Removendo backups antigos (> $KEEP_DAYS dias)...${NC}"
find "$BACKUP_DIR" -name "axxy_backup_*.db.gz" -mtime +$KEEP_DAYS -delete 2>/dev/null || true

# List remaining backups
echo -e "\nBackups disponíveis:"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null || echo "Nenhum backup encontrado"

echo -e "\n${GREEN}✓ Backup concluído!${NC}"
