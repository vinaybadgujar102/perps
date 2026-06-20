import { pgPool } from "../src/config/pgClient";
import { dropDb } from "../src/db/drop";

let failed = false;

try {
  await dropDb();
  console.log("TimescaleDB tables dropped");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failed = true;
} finally {
  await pgPool.end();
}

if (failed) process.exit(1);
