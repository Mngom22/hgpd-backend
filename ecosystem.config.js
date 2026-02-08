module.exports = {
  apps: [
    {
      name: 'hgpd-backend',
      script: 'dist/main.js',
      cwd: '/var/www/hgpd/hgpd-backend',
      instances: 'max',
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        APP_PORT: 3001,
      },
      
      // Restart policies
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logs
      out_file: '/var/log/hgpd/backend-out.log',
      error_file: '/var/log/hgpd/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      shutdown_with_message: true,
      
      // Monitoring
      monitor_delay: 5000,
    }
  ],
  
  // Deploy config
  deploy: {
    production: {
      user: 'hgpd',
      host: 'votredomaine.fr',
      ref: 'origin/main',
      repo: 'git@github.com:votrecompte/hgpd.git',
      path: '/var/www/hgpd',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    }
  }
};
