const path = require('path');

module.exports = {
  apps: [{
    name: 'ddl-backend',
    script: 'server.js',
    // Use an absolute path for CWD to make the configuration more robust.
    // This ensures pm2 starts the app from the correct directory, regardless of
    // where the 'pm2 start' command is executed from.
    cwd: path.resolve(__dirname, 'backend'),
    // Pre-load the dotenv module to ensure environment variables from the .env file
    // are available before any application code runs. This is a robust way to handle configuration.
    node_args: "-r dotenv/config",
    watch: ['.'],
    ignore_watch: ['node_modules'],
    max_memory_restart: '1G',
    // The 'env' block contains environment variables for the application.
    // PM2 will load these automatically. Renamed from 'env_production' to 'env'
    // for reliability, removing the need for the --env flag during startup.
    // NOTE: SENSITIVE KEYS HAVE BEEN REMOVED.
    // Secrets like API_KEY, JWT_SECRET, and DB_PASSWORD will be loaded from the
    // .env file by the "-r dotenv/config" node argument. Ensure your backend/.env
    // file contains these values.
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DB_HOST: '127.0.0.1',
      DB_USER: 'ddl_user',
      DB_DATABASE: 'mydb'
    }
  }]
};