#!/bin/bash
set -euo pipefail

APP_DIR=/opt/gantt-demo
DATA_DIR="$APP_DIR/data"
LOGS_DIR="$APP_DIR/logs"

cd "$APP_DIR"

# Criar diretórios necessários se não existirem
echo "📁 Criando diretórios necessários..."
mkdir -p "$DATA_DIR"
mkdir -p "$LOGS_DIR"

# Inicializar ou semear ficheiro de dados se estiver ausente ou muito pequeno (<100B)
if [ ! -f "$DATA_DIR/tasks.json" ] || [ $(wc -c < "$DATA_DIR/tasks.json" 2>/dev/null || echo 0) -lt 100 ]; then
  echo "📝 Semear ficheiro de dados..."
  if [ -f "src/data/tasks.json" ]; then
    cp -f "src/data/tasks.json" "$DATA_DIR/tasks.json"
  else
    echo '{"tasks":[],"links":[],"users":[]}' > "$DATA_DIR/tasks.json"
  fi
fi

echo "📥 Atualizando código..."
git fetch --all
git reset --hard origin/master

echo "📦 Instalando dependências..."
npm ci --omit=dev

echo "🔨 Building frontend..."
npm run build

echo "🚀 Reiniciando servidor com PM2..."
if [ -f ecosystem.config.cjs ]; then
  pm2 startOrReload ecosystem.config.cjs
else
  pm2 restart gantt-server || pm2 start server/server.js --name gantt-server
fi

pm2 save

echo "✅ Deploy concluído com sucesso!"

