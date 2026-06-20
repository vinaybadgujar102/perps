import type { QueryConfig } from "pg";
import { pgPool } from "../config/pgClient";

export async function createOneMinCandle() {
  const createOneMinCandleQuery: QueryConfig = {
    text: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS one_min_candles
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 minute', time) AS bucket,
        market,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close
      FROM trades
      GROUP BY bucket, market;
    `,
  };

  const continuousAggregationPolicyQuery: QueryConfig = {
    text: `
      SELECT add_continuous_aggregate_policy(
        'one_min_candles',
        start_offset => INTERVAL '1 hour',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    `,
  };

  await pgPool.query(createOneMinCandleQuery);
  await pgPool.query(continuousAggregationPolicyQuery);
}

export async function createFiveMinCandle() {
  const createFiveMinCandleQuery: QueryConfig = {
    text: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS five_min_candles
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('5 minutes', time) AS bucket,
        market,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close
      FROM trades
      GROUP BY bucket, market;
    `,
  };

  const continuousAggregationPolicyQuery: QueryConfig = {
    text: `
      SELECT add_continuous_aggregate_policy(
        'five_min_candles',
        start_offset => INTERVAL '7 days',
        end_offset => INTERVAL '5 minutes',
        schedule_interval => INTERVAL '5 minutes'
      );
    `,
  };

  await pgPool.query(createFiveMinCandleQuery);
  await pgPool.query(continuousAggregationPolicyQuery);
}
