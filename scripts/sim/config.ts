import { AssetConfig } from "@repo/sharedtypes";

export const MARKET = process.env.SIM_MARKET ?? "BTC";

export const SIM_CONFIG = {
  apiUrl: process.env.SIM_API_URL ?? "http://localhost:3003/api/v1",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  intervalMs: Number(process.env.SIM_INTERVAL_MS ?? 1500),
  userCount: Number(process.env.SIM_USER_COUNT ?? 5),
  depthLevels: Number(process.env.SIM_DEPTH_LEVELS ?? 10),
  midPrice: Number(process.env.SIM_MID_PRICE ?? 6_100_000),
  spread: Number(process.env.SIM_SPREAD ?? 3_000),
  priceStep: Number(process.env.SIM_PRICE_STEP ?? 1_000),
  minQty: Number(process.env.SIM_MIN_QTY ?? 5),
  maxQty: Number(process.env.SIM_MAX_QTY ?? 40),
  tradeProb: Number(process.env.SIM_TRADE_PROB ?? 0.35),
  marketOrderProb: Number(process.env.SIM_MARKET_ORDER_PROB ?? 0.1),
  closeProb: Number(process.env.SIM_CLOSE_PROB ?? 0.15),
  scaleInProb: Number(process.env.SIM_SCALE_IN_PROB ?? 0.1),
  syncIntervalTicks: Number(process.env.SIM_SYNC_INTERVAL_TICKS ?? 5),
  markMode: (process.env.SIM_MARK_MODE ?? "live") as "live" | "static",
  depositUsd: Number(process.env.SIM_DEPOSIT_USD ?? 100_000),
  simPassword: process.env.SIM_PASSWORD ?? "sim-trader-pass",
  leverage: 20,
};

export const { priceScale, quantityScale } = AssetConfig[MARKET];

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomQty(levelIndex: number) {
  const touchWeight = Math.max(0.35, 1 - levelIndex * 0.07);
  const base =
    SIM_CONFIG.minQty +
    (SIM_CONFIG.maxQty - SIM_CONFIG.minQty) * touchWeight;
  return Math.max(
    SIM_CONFIG.minQty,
    Math.round(base * (0.75 + Math.random() * 0.5)),
  );
}

export function formatPrice(price: number) {
  return (price / 10 ** priceScale).toFixed(priceScale);
}

export function formatQty(qty: number) {
  return (qty / 10 ** quantityScale).toFixed(quantityScale);
}

export function sleep(ms: number) {
  return Bun.sleep(ms);
}

export function jitteredInterval() {
  return SIM_CONFIG.intervalMs + randomInt(-400, 400);
}
