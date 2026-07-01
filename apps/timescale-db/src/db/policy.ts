import type { QueryConfig } from "pg";
import { pgPool } from "../config/pgClient";

export async function runPolicyQuery(query: QueryConfig) {
  try {
    await pgPool.query(query);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) return;
    throw error;
  }
}
