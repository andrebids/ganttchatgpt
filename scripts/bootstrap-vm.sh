#!/bin/bash
# Script completo de bootstrap da VM
# Execute este script na VM via SSH

set -e

echo "=== BOOTSTRAP DA VM - GANTT-DEMO ==="
echo ""

# 1. Atualizar sistema e instalar pacotes básicos
echo "=== PASSO 1: Instalando pacotes básicos ==="
sudo apt update
sudo apt install -y nginx git curl build-essential

# 2. Instalar Node.js LTS
echo ""
echo "=== PASSO 2: Instalando Node.js LTS ==="
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
echo "Node.js versão: $(node --version)"
echo "npm versão: $(npm --version)"

# 3. Instalar PM2 globalmente
echo ""
echo "=== PASSO 3: Instalando PM2 ==="
sudo npm install -g pm2

# 4. Preparar diretório do projeto
echo ""
echo "=== PASSO 4: Preparando diretório do projeto ==="
sudo mkdir -p /opt/gantt-demo
sudo chown $USER:$USER /opt/gantt-demo
cd /opt/gantt-demo

# 5. Clonar ou inicializar repositório
echo ""
echo "=== PASSO 5: Configurando repositório Git ==="
if [ -d ".git" ]; then
    echo "Repositório já existe, atualizando..."
    git fetch --all
    git reset --hard origin/main
else
    echo "Inicializando repositório..."
    git init
    git remote add origin https://github.com/andrebids/ganttchatgpt.git || true
    git fetch --all
    git checkout -B main origin/main || git branch -M main
fi

# 6. Instalar dependências
echo ""
echo "=== PASSO 6: Instalando dependências ==="
npm ci

# 7. Build do projeto
echo ""
echo "=== PASSO 7: Compilando projeto ==="
npm run build

# 8. Configurar PM2
echo ""
echo "=== PASSO 8: Configurando PM2 ==="
if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js || pm2 restart ecosystem.config.js
else
    pm2 start server/server.js --name gantt-server
fi

pm2 save
pm2 startup systemd -u $USER --hp $HOME | grep -v "sudo" | bash || {
    echo "Execute o comando que apareceu acima para configurar PM2 no boot"
}

# 9. Configurar Nginx
echo ""
echo "=== PASSO 9: Configurando Nginx ==="
sudo tee /etc/nginx/sites-available/gantt-demo > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;
    
    root /opt/gantt-demo/dist;
    index index.html;
    
    location /api/ {
        proxy_pass http://127.0.0.1:3025/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        try_files $uri /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/gantt-demo /etc/nginx/sites-enabled/gantt-demo
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Testar configuração Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# 10. Verificar serviços
echo ""
echo "=== PASSO 10: Verificando serviços ==="
echo ""
echo "Status PM2:"
pm2 status

echo ""
echo "Status Nginx:"
sudo systemctl status nginx --no-pager -l | head -5

echo ""
echo "=== BOOTSTRAP CONCLUÍDO! ==="
echo ""
echo "Aplicação disponível em: http://34.46.91.20"
echo "API disponível em: http://34.46.91.20/api"
echo ""
echo "Para verificar logs:"
echo "  pm2 logs gantt-server"
echo ""
echo "Para reiniciar:"
echo "  pm2 restart gantt-server"

