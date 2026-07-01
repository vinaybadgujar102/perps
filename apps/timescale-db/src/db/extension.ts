import { pgPool } from "../config/pgClient";

export async function ensureTimescaleExtension() {
  await pgPool.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
}
