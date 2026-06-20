import type { QueryConfig } from "pg";
import { pgPool } from "../config/pgClient";

export async function addRetentionPolicy() {
  const query: QueryConfig = {
    text: `
      SELECT add_retention_policy(
        'trades',
        INTERVAL '90 days'
      );
    `,
  };

  await pgPool.query(query);
}
