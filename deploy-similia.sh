#!/bin/bash
set -euo pipefail

# === Similia Deploy Script ===
# Build on Hetzner → Deploy to Timeweb
# Pattern: same as Academy

PROJECT_DIR="/home/artur/projects/Similia"
REMOTE_HOST="yc-user@85.239.53.148"
REMOTE_DIR="/root/projects/similia"
ARCHIVE="/tmp/similia-deploy.tar.gz"
PM2_NAME="similia"
PORT=3003

BACKUP_DIR="/root/backups/similia"
BACKUP_KEEP=3  # Хранить последние 3 бэкапа
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Similia Deploy ===${NC}"
echo "$(date '+%Y-%m-%d %H:%M:%S')"

# --- 1. Check branch ---
cd "$PROJECT_DIR"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo -e "Branch: ${YELLOW}${BRANCH}${NC}"

# --- 2. Build ---
echo -e "\n${GREEN}[1/6] Building...${NC}"
npx prisma generate 2>/dev/null
NODE_OPTIONS='--max-old-space-size=6144' npx next build
if [ ! -f ".next/BUILD_ID" ]; then
  echo -e "${RED}BUILD_ID not found! Build failed.${NC}"
  exit 1
fi
BUILD_ID=$(cat .next/BUILD_ID)
echo -e "Build ID: ${GREEN}${BUILD_ID}${NC}"

# --- 3. Pack standalone ---
echo -e "\n${GREEN}[2/6] Packing archive...${NC}"
tar czf "$ARCHIVE" \
  -C .next/standalone . \
  -C "$PROJECT_DIR/.next" static
ARCHIVE_SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo -e "Archive: ${GREEN}${ARCHIVE_SIZE}${NC}"

# --- 4. Бэкап текущей версии на Timeweb ---
echo -e "\n${GREEN}[3/8] Создаю бэкап текущей версии...${NC}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
ssh "$REMOTE_HOST" "sudo bash -c '
  mkdir -p $BACKUP_DIR
  if [ -f $REMOTE_DIR/server.js ]; then
    tar czf $BACKUP_DIR/similia-$TIMESTAMP.tar.gz \
      -C $REMOTE_DIR server.js package.json .next node_modules .env ecosystem.config.js 2>/dev/null || true
    echo \"Backup: $BACKUP_DIR/similia-$TIMESTAMP.tar.gz\"
    # Удаляем старые бэкапы, оставляем последние $BACKUP_KEEP
    cd $BACKUP_DIR && ls -t similia-*.tar.gz 2>/dev/null | tail -n +$((BACKUP_KEEP+1)) | xargs rm -f 2>/dev/null || true
  else
    echo \"Первый деплой — бэкап не нужен\"
  fi
'"

# --- 5. Stop PM2 on Timeweb ---
echo -e "\n${GREEN}[4/8] Stopping PM2 on Timeweb...${NC}"
ssh "$REMOTE_HOST" "sudo pm2 stop $PM2_NAME 2>/dev/null || true"

# --- 6. Transfer & extract ---
echo -e "\n${GREEN}[5/8] Uploading to Timeweb...${NC}"

# Backup .env
ssh "$REMOTE_HOST" "sudo cp $REMOTE_DIR/.env /tmp/.env.similia.bak 2>/dev/null || true"

# Upload
scp "$ARCHIVE" "$REMOTE_HOST:/tmp/similia-deploy.tar.gz"

# Extract
ssh "$REMOTE_HOST" "sudo bash -c '
  rm -rf $REMOTE_DIR/.next $REMOTE_DIR/node_modules $REMOTE_DIR/server.js $REMOTE_DIR/package.json
  mkdir -p $REMOTE_DIR/.next
  tar xzf /tmp/similia-deploy.tar.gz -C $REMOTE_DIR
  mv $REMOTE_DIR/static $REMOTE_DIR/.next/static
  cp /tmp/.env.similia.bak $REMOTE_DIR/.env 2>/dev/null || true
  rm /tmp/similia-deploy.tar.gz
'"

# Sync ecosystem config
scp "$PROJECT_DIR/ecosystem.config.js" "$REMOTE_HOST:/tmp/ecosystem.similia.js"
ssh "$REMOTE_HOST" "sudo cp /tmp/ecosystem.similia.js $REMOTE_DIR/ecosystem.config.js"

# Sync public dir
echo -e "\n${GREEN}[6/8] Syncing public assets...${NC}"
rsync -az --delete "$PROJECT_DIR/public/" "$REMOTE_HOST:/tmp/similia-public/"
ssh "$REMOTE_HOST" "sudo rsync -a /tmp/similia-public/ $REMOTE_DIR/public/ && rm -rf /tmp/similia-public"

# Создать директорию для приватных загрузок (если не существует)
ssh "$REMOTE_HOST" "sudo mkdir -p $REMOTE_DIR/private-uploads && sudo chmod 755 $REMOTE_DIR/private-uploads"

# --- 7. Start PM2 ---
echo -e "\n${GREEN}[7/8] Starting PM2...${NC}"
ssh "$REMOTE_HOST" "sudo bash -c '
  cd $REMOTE_DIR
  pm2 delete $PM2_NAME 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
'"

sleep 3

# --- 8. Smoke test + автооткат ---
echo -e "\n${GREEN}[8/8] Smoke Tests...${NC}"
STATUS=$(ssh "$REMOTE_HOST" "curl -sI -m 10 http://localhost:$PORT/ 2>&1 | head -1")
echo "GET / → $STATUS"

if echo "$STATUS" | grep -q "200\|308\|307"; then
  echo -e "\n${GREEN}Deploy SUCCESS!${NC}"
  echo "https://simillia.ru"
else
  echo -e "\n${RED}SMOKE TEST FAILED! Откатываю на предыдущую версию...${NC}"
  ssh "$REMOTE_HOST" "sudo pm2 logs $PM2_NAME --lines 20 --nostream 2>/dev/null"

  # Автооткат из последнего бэкапа
  LATEST_BACKUP=$(ssh "$REMOTE_HOST" "ls -t $BACKUP_DIR/similia-*.tar.gz 2>/dev/null | head -1")
  if [ -n "$LATEST_BACKUP" ]; then
    echo -e "${YELLOW}Восстанавливаю из: $LATEST_BACKUP${NC}"
    ssh "$REMOTE_HOST" "sudo bash -c '
      pm2 stop $PM2_NAME 2>/dev/null || true
      rm -rf $REMOTE_DIR/.next $REMOTE_DIR/node_modules $REMOTE_DIR/server.js $REMOTE_DIR/package.json
      tar xzf $LATEST_BACKUP -C $REMOTE_DIR
      cp /tmp/.env.similia.bak $REMOTE_DIR/.env 2>/dev/null || true
      cd $REMOTE_DIR
      pm2 delete $PM2_NAME 2>/dev/null || true
      pm2 start ecosystem.config.js
      pm2 save
    '"
    sleep 3
    ROLLBACK_STATUS=$(ssh "$REMOTE_HOST" "curl -sI -m 10 http://localhost:$PORT/ 2>&1 | head -1")
    if echo "$ROLLBACK_STATUS" | grep -q "200\|308\|307"; then
      echo -e "${GREEN}Откат УСПЕШЕН. Сайт работает на предыдущей версии.${NC}"
    else
      echo -e "${RED}ОТКАТ НЕ ПОМОГ! Требуется ручное вмешательство.${NC}"
    fi
  else
    echo -e "${RED}Бэкап не найден. Ручное восстановление необходимо.${NC}"
  fi
  exit 1
fi

rm -f "$ARCHIVE"
echo -e "\nDone at $(date '+%H:%M:%S')"
