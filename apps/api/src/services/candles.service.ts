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

function envFlag(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * Timescale is opt-in (`USE_TIMESCALE=true` + valid `DB_URL`).
 * HOSTED_DEMO and leftover local :5433 URLs always use fake candles.
 */
function shouldUseTimescale(): boolean {
  if (envFlag("HOSTED_DEMO")) return false;
  if (!envFlag("USE_TIMESCALE")) return false;

  const dbUrl = process.env.DB_URL?.trim() ?? "";
  if (!dbUrl) return false;

  try {
    const u = new URL(dbUrl);
    const local =
      u.hostname === "127.0.0.1" ||
      u.hostname === "localhost" ||
      u.hostname === "::1";
    if (local && (u.port === "5433" || dbUrl.includes(":5433"))) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
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

  if (!shouldUseTimescale()) {
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
    console.warn(
      "[candles] Timescale query failed; serving fake candles:",
      error instanceof Error ? error.message : error,
    );
    return fakeResponse(market, query);
  }
}
