import { pgPool } from "../src/config/pgClient";
import { dropDb } from "../src/db/drop";

await dropDb();
await pgPool.end();

console.log("TimescaleDB tables dropped");
