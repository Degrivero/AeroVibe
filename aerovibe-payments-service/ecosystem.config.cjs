module.exports = {
  apps: [
    {
      name: 'aerovibe-payments-service',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 10,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        BIND_HOST: '127.0.0.1',
      },
    },
  ],
};
