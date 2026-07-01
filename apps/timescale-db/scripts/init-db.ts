import { pgPool } from "../src/config/pgClient";
import { initDb } from "../src/db/init";

let failed = false;

try {
  await initDb();
  console.log("TimescaleDB initialized");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failed = true;
} finally {
  await pgPool.end();
}

if (failed) process.exit(1);
