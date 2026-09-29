// PM2 process definition for the Ploi server. scripts/deploy.sh starts or reloads it.
// HOST and PORT come from the site's .env (loaded by server.mjs).
module.exports = {
  apps: [
    {
      name: 'voordeelvinder',
      script: 'server.mjs',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      kill_timeout: 5000,
      time: true,
    },
  ],
};
