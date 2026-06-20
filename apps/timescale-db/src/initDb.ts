import { pgPool } from "./config/pgClient";

const createTradesTable = async () => {
  await pgPool.query(`
CREATE TABLE IF NOT EXISTS trades (
      time TIMESTAMPTZ NOT NULL,
      market TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      fill_id TEXT NOT NULL UNIQUE
    ) WITH (
      tsdb.hypertable,
      tsdb.segmentby = 'market',
      tsdb.orderby = 'time DESC'
    );
  `);
};

await createTradesTable();
