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

# Inicializar ficheiro de dados se não existir
if [ ! -f "$DATA_DIR/tasks.json" ]; then
  echo "📝 Inicializando ficheiro de dados..."
  echo '{"tasks":[],"links":[],"users":[]}' > "$DATA_DIR/tasks.json"
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

