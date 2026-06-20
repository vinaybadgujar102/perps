import { pgPool } from "../src/config/pgClient";
import { initDb } from "../src/db/init";

await initDb();
await pgPool.end();

console.log("TimescaleDB initialized");
