import type { CandleInterval } from "@repo/sharedtypes";
import type { Candle } from "@repo/sharedtypes";

export type OhlcBar = Candle;

export function getBucketStartMs(
  timestampMs: number,
  interval: CandleInterval,
): number {
  const date = new Date(timestampMs);
  date.setUTCMilliseconds(0);
  date.setUTCSeconds(0);

  if (interval === "5m") {
    const minutes = date.getUTCMinutes();
    date.setUTCMinutes(minutes - (minutes % 5));
  }

  return date.getTime();
}

export function bucketToChartTime(bucketMs: number): number {
  return Math.floor(bucketMs / 1000);
}

export function unscaleTradePrice(rawPrice: number, priceScale: number): number {
  return rawPrice / 10 ** priceScale;
}

export function applyTradeToBar(
  currentBar: OhlcBar | null,
  tradePrice: number,
  tradeTimeMs: number,
  interval: CandleInterval,
): OhlcBar {
  const bucketMs = getBucketStartMs(tradeTimeMs, interval);
  const time = bucketToChartTime(bucketMs);

  if (currentBar && currentBar.time === time) {
    return {
      time,
      open: currentBar.open,
      high: Math.max(currentBar.high, tradePrice),
      low: Math.min(currentBar.low, tradePrice),
      close: tradePrice,
    };
  }

  const open = currentBar?.close ?? tradePrice;
  return {
    time,
    open,
    high: Math.max(open, tradePrice),
    low: Math.min(open, tradePrice),
    close: tradePrice,
  };
}
