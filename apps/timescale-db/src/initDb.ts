import { pgPool } from "./config/pgClient";

const createTradesTable = async () => {
  await pgPool.query(`
CREATE TABLE IF NOT EXISTS trades (
      time TIMESTAMPTZ NOT NULL,
      market TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL
    ) WITH (
      tsdb.hypertable,
      tsdb.segmentby = 'market',
      tsdb.orderby = 'time DESC'
    );
  `);
};

await createTradesTable();
