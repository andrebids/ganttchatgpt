module.exports = {
  apps: [
    {
      name: 'gantt-server',
      script: 'server/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3025,
        HOST: '0.0.0.0',
        DATA_PATH: '/opt/gantt-demo/data/tasks.json',
        CORS_ORIGIN: 'https://gantt.dsproject.pt,http://gantt.dsproject.pt'
      },
      // Configurações adicionais do PM2
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/opt/gantt-demo/logs/error.log',
      out_file: '/opt/gantt-demo/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
