import { pgPool } from "../config/pgClient";

export async function createTradesTable() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      time TIMESTAMPTZ NOT NULL,
      market TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      fill_id TEXT NOT NULL,
      UNIQUE (fill_id, time)
    ) WITH (
      tsdb.hypertable,
      tsdb.segmentby = 'market',
      tsdb.orderby = 'time DESC'
    );
  `);
}

export async function dropTradesTable() {
  await pgPool.query(`DROP MATERIALIZED VIEW IF EXISTS one_min_candles CASCADE;`);
  await pgPool.query(`DROP MATERIALIZED VIEW IF EXISTS five_min_candles CASCADE;`);
  await pgPool.query(`DROP TABLE IF EXISTS trades CASCADE;`);
}
