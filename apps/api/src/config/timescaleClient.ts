import { Pool } from "pg";

export class TimescaleNotConfiguredError extends Error {
  constructor() {
    super("DB_URL is not configured for TimescaleDB");
    this.name = "TimescaleNotConfiguredError";
  }
}

let pool: Pool | null = null;

export function getTimescalePool(): Pool {
  const connectionString = process.env.DB_URL;
  if (!connectionString) {
    throw new TimescaleNotConfiguredError();
  }

  pool ??= new Pool({ connectionString });
  return pool;
}
