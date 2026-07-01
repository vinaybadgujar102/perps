import type { Candle } from "@repo/sharedtypes";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";

const MIN_PRICE_SPAN_RATIO = 0.005;

export function toChartCandles(candles: Candle[]): CandlestickData[] {
  return candles.map((candle) => ({
    ...candle,
    time: candle.time as UTCTimestamp,
  }));
}

export function candlePricePadding(candles: Candle[]): number {
  if (candles.length === 0) return 0;

  const minLow = Math.min(...candles.map((candle) => candle.low));
  const maxHigh = Math.max(...candles.map((candle) => candle.high));
  const mid = (minLow + maxHigh) / 2;
  const minSpan = mid * MIN_PRICE_SPAN_RATIO;
  const span = maxHigh - minLow;

  if (span >= minSpan) return 0;
  return (minSpan - span) / 2;
}
