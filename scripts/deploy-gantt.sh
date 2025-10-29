#!/bin/bash
set -euo pipefail
APP_DIR=/opt/gantt-demo
cd "$APP_DIR"

git fetch --all
git reset --hard origin/master
npm ci --omit=dev
npm run build
pm2 restart gantt-server || pm2 start server/server.js --name gantt-server
pm2 save

