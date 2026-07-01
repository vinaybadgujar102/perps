import type { QueryConfig } from "pg";
import { runPolicyQuery } from "./policy";

export async function addRetentionPolicy() {
  const query: QueryConfig = {
    text: `
      SELECT add_retention_policy(
        'trades',
        INTERVAL '90 days'
      );
    `,
  };

  await runPolicyQuery(query);
}
