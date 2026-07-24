/**
 * PM2 ecosystem for hosted demo (/opt/perps).
 *
 * On the server:
 *   1. Put DATABASE_URL, REDIS_URL, JWT_SECRET, HOSTED_DEMO=true in /opt/perps/.env
 *   2. Do NOT set DB_URL or USE_TIMESCALE
 *   3. pm2 delete all   # optional clean slate
 *   4. pm2 start ecosystem.config.cjs
 *   5. pm2 save
 */
const ROOT = "/opt/perps";
const envFile = `${ROOT}/.env`;

module.exports = {
  apps: [
    {
      name: "api",
      cwd: `${ROOT}/apps/api`,
      script: "bun",
      args: `--env-file=${envFile} run src/index.ts`,
    },
    {
      name: "trade-engine",
      cwd: `${ROOT}/apps/trade-engine`,
      script: "bun",
      args: `--env-file=${envFile} run src/index.ts`,
    },
    {
      name: "wsserver",
      cwd: `${ROOT}/apps/wsServer`,
      script: "bun",
      args: `--env-file=${envFile} run src/index.ts`,
    },
    {
      name: "db-poller",
      cwd: `${ROOT}/apps/db-poller`,
      script: "bun",
      args: `--env-file=${envFile} run src/index.ts`,
    },
    {
      name: "simulate-orderbook",
      cwd: ROOT,
      script: "bun",
      args: `--env-file=${envFile} run scripts/simulate-orderbook.ts`,
    },
  ],
};
