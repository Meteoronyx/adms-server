module.exports = {
  apps: [{
    name: 'dbspot',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    },
    log_file: './logs/pm2-combined.log',
    error_file: './logs/pm2-error.log',
    out_file: '/dev/null', //if windows use 'NUL'
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '1G',
    kill_timeout: 5000,
    listen_timeout: 3000
  }]
};
