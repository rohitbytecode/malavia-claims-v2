module.exports = {
  apps: [
    {
      name: "malavia-backend",
      script: "./apps/backend/dist/server.js",
      instances: "max", // Scale to all available CPU cores in cluster mode
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/pm2-backend-error.log",
      out_file: "./logs/pm2-backend-out.log",
      merge_logs: true,
      time: true,
    }
  ]
};
