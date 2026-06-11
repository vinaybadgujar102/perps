import type { CandlestickData } from "lightweight-charts";

const BASE_PRICES: Record<string, number> = {
  BTC: 61_944,
};

export function buildDemoCandles(symbol = "BTC"): CandlestickData[] {
  const candles: CandlestickData[] = [];
  let base = BASE_PRICES[symbol] ?? 61_944;
  const start = new Date("2026-01-01T00:00:00Z");

  for (let i = 1; i <= 120; i += 1) {
    const pointDate = new Date(start);
    pointDate.setUTCDate(start.getUTCDate() + i);
    const time = pointDate.toISOString().slice(0, 10);
    const drift = (Math.sin(i / 8) + Math.cos(i / 13)) * 180;
    const open = base + drift;
    const close = open + (Math.random() - 0.4) * 420;
    const high = Math.max(open, close) + Math.random() * 280;
    const low = Math.min(open, close) - Math.random() * 280;
    candles.push({ time, open, high, low, close });
    base = close;
  }

  return candles;
}
