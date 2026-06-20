import { pgPool } from "./config/pgClient";

export const insertTrade = async (market: string, price: number) => {
  const query = {
    text: `
        INSERT INTO trades (time, market, price)
        VALUES (NOW(), $1, $2)
          `,
    values: [market, price],
  };
  await pgPool.query(query);
};

export const createOneMinCandle = async () => {
  const createOneMinCandlequery = {
    text: `
  CREATE MATERIALIZED VIEW IF NOT EXITS one_min_candles
  WITH (timescaledb.continous) AS
  SELECT 
    time_bucket('1 minute', time) AS bucket,
    market,
    first(price, time) AS open,
    max(price) as high,
    min(price) as low,
last(price, time) as close
FROM trades
GROUP BY bucket, market,
`,
  };

  await pgPool.query(createOneMinCandlequery);
};

export const createFiveMinCandle = async () => {
  const createFiveMinCandle = {
    text: `
  CREATE MATERIALIZED VIEW IF NOT EXISTS five_min_candles
  WITH (timescaledb.continous) AS
  SELECT
  time_bucket('5 minutes', time) AS bucket,
  first(price, time) AS open,
  max(price) AS high,
  min(price) AS low,
  last(price, time) AS close
FROM trades 
GROUP by bucket, market
`,
  };

  await pgPool.query(createFiveMinCandle);
};
