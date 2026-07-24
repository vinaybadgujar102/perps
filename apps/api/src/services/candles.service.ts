import type { Candle, CandleInterval, GetCandlesQuery } from "@repo/sharedtypes";
import {
  getTimescalePool,
  TimescaleNotConfiguredError,
} from "../config/timescaleClient";
import { buildFakeCandles } from "./fake-candles";

const BUCKET_BY_INTERVAL: Record<CandleInterval, string> = {
  "1m": "1 minute",
  "5m": "5 minutes",
};

const VIEW_BY_INTERVAL: Record<CandleInterval, string> = {
  "1m": "one_min_candles",
  "5m": "five_min_candles",
};

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000;

type CandleRow = {
  bucket: Date;
  open: number;
  high: number;
  low: number;
  close: number;
};

function useFakeCandles(): boolean {
  return process.env.HOSTED_DEMO === "true" || !process.env.DB_URL;
}

function fakeResponse(
  market: string,
  query: GetCandlesQuery,
): {
  market: string;
  interval: CandleInterval;
  candles: Candle[];
  synthetic: true;
} {
  return {
    market,
    interval: query.interval,
    candles: buildFakeCandles(market, query),
    synthetic: true,
  };
}

export async function getCandles(
  market: string,
  query: GetCandlesQuery,
): Promise<{
  market: string;
  interval: CandleInterval;
  candles: Candle[];
  synthetic?: boolean;
}> {
  const { interval } = query;

  if (useFakeCandles()) {
    return fakeResponse(market, query);
  }

  const viewName = VIEW_BY_INTERVAL[interval];
  const bucket = BUCKET_BY_INTERVAL[interval];
  const { limit, from, to } = query;

  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - DEFAULT_RANGE_MS);

  let pool;
  try {
    pool = getTimescalePool();
  } catch (error) {
    if (error instanceof TimescaleNotConfiguredError) {
      return fakeResponse(market, query);
    }
    throw error;
  }

  try {
    // Prefer continuous aggregates; fall back to bucketing raw trades when sparse.
    const aggregateResult = await pool.query<CandleRow>(
      `
        SELECT bucket, open, high, low, close
        FROM ${viewName}
        WHERE market = $1
          AND bucket >= $2
          AND bucket <= $3
        ORDER BY bucket ASC
        LIMIT $4
      `,
      [market, fromDate, toDate, limit],
    );

    let rows = aggregateResult.rows;

    if (rows.length < Math.min(limit, 30)) {
      const tradeResult = await pool.query<CandleRow>(
        `
          SELECT
            time_bucket($4::interval, time) AS bucket,
            first(price, time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, time) AS close
          FROM trades
          WHERE market = $1
            AND time >= $2
            AND time <= $3
          GROUP BY bucket
          ORDER BY bucket ASC
          LIMIT $5
        `,
        [market, fromDate, toDate, bucket, limit],
      );

      if (tradeResult.rows.length > rows.length) {
        rows = tradeResult.rows;
      }
    }

    const candles: Candle[] = rows.map((row) => ({
      time: Math.floor(row.bucket.getTime() / 1000),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
    }));

    return { market, interval, candles, synthetic: false };
  } catch (error) {
    // Timescale down / unreachable — serve static fake candles so the chart still works.
    console.warn(
      "[candles] Timescale query failed; serving fake candles:",
      error instanceof Error ? error.message : error,
    );
    return fakeResponse(market, query);
  }
}
