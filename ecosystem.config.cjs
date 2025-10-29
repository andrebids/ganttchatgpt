module.exports = {
  apps: [
    {
      name: 'gantt-server',
      script: 'server/server.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
