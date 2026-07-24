import type { Candle, CandleInterval, GetCandlesQuery } from "@repo/sharedtypes";

const BASE_PRICES: Record<string, number> = {
  BTC: 61_944,
  SOL: 148,
};

const INTERVAL_SECONDS: Record<CandleInterval, number> = {
  "1m": 60,
  "5m": 300,
};

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
function hashUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Static synthetic OHLC history for hosted demo (no TimescaleDB).
 * Deterministic per market/interval so reloads look stable.
 */
export function buildFakeCandles(
  market: string,
  query: GetCandlesQuery,
): Candle[] {
  const { interval, limit, from, to } = query;
  const stepSec = INTERVAL_SECONDS[interval];
  const toSec = to
    ? Math.floor(new Date(to).getTime() / 1000)
    : Math.floor(Date.now() / 1000);
  const fromSec = from
    ? Math.floor(new Date(from).getTime() / 1000)
    : toSec - limit * stepSec;

  const alignedTo = Math.floor(toSec / stepSec) * stepSec;
  const alignedFrom = Math.floor(fromSec / stepSec) * stepSec;
  const base = BASE_PRICES[market.toUpperCase()] ?? BASE_PRICES.BTC;
  const marketSeed = market
    .toUpperCase()
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const candles: Candle[] = [];
  let price = base;

  for (
    let t = alignedFrom;
    t <= alignedTo && candles.length < limit;
    t += stepSec
  ) {
    const i = Math.floor(t / stepSec);
    const drift =
      (Math.sin((i + marketSeed) / 8) + Math.cos((i + marketSeed) / 13)) *
      base *
      0.002;
    const open = price + drift * 0.1;
    const move = (hashUnit(i * 17 + marketSeed) - 0.48) * base * 0.004;
    const close = open + move;
    const wick = hashUnit(i * 31 + marketSeed) * base * 0.002;
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;

    candles.push({ time: t, open, high, low, close });
    price = close;
  }

  return candles;
}
