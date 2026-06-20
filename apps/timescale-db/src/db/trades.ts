import type { QueryConfig } from "pg";
import { pgPool } from "../config/pgClient";

export async function insertTrade(
  fillId: string,
  market: string,
  price: number,
  time: Date,
) {
  const query: QueryConfig = {
    text: `
      INSERT INTO trades (time, market, price, fill_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (fill_id, time) DO NOTHING
    `,
    values: [time, market, price, fillId],
  };

  await pgPool.query(query);
}
