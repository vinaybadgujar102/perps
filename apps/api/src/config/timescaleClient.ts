import { Pool } from "pg";

let pool: Pool | null = null;

export class TimescaleNotConfiguredError extends Error {
  constructor(message = "Timescale db not set up properly") {
    super(message);
    this.name = "TimescaleNotConfiguredError";
  }
}

export function getTimescalePool(): Pool {
  const connectionString = process.env.DB_URL;
  if (!connectionString) {
    throw new TimescaleNotConfiguredError();
  }

  pool ??= new Pool({ connectionString });
  return pool;
}
