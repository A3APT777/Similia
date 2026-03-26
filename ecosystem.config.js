module.exports = {
  apps: [
    {
      name: 'similia',
      script: 'server.js',
      cwd: '/root/projects/similia',
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      max_memory_restart: '500M',
      treekill: true,
      kill_timeout: 5000,
      error_file: '/root/.pm2/logs/similia-error.log',
      out_file: '/root/.pm2/logs/similia-out.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
}
