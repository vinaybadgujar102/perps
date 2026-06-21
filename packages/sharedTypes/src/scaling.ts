import { AssetConfig } from "./assetConfig";

/** Razorpay / fiat minor units: 100 cents = 1 USD. */
export const BASE_CURRENCY_SCALE_FACTOR = 100;

/** Display USD credited to every newly registered user. */
export const DEFAULT_NEW_USER_BALANCE_DISPLAY_USD = 100_000;

/** Primary market for balance scaling until multi-market balances exist. */
export const DEFAULT_BALANCE_MARKET = "BTC";

/**
 * Canonical engine monetary scale (price × qty composite).
 * All engine balance, margin, collateral, and PnL integers use this unit.
 */
export function getNotionalScaleFactor(market: string): number {
  const config = AssetConfig[market];
  if (!config) {
    throw new Error(`Unknown market: ${market}`);
  }
  return 10 ** (config.priceScale + config.quantityScale);
}

/** Scale display USD → engine monetary units (ingress). */
export function scaleDisplayUsdToEngine(
  displayUsd: number,
  market: string,
): number {
  return Math.round(displayUsd * getNotionalScaleFactor(market));
}

/** Scale Razorpay minor units (USD cents) → engine monetary units (ingress). */
export function scalePaymentCentsToEngine(
  paymentCents: number,
  market: string,
): number {
  const notionalScale = getNotionalScaleFactor(market);
  return Math.round(
    (paymentCents * notionalScale) / BASE_CURRENCY_SCALE_FACTOR,
  );
}

/** Descale engine monetary units → display USD (egress / API layer). */
export function engineUsdToDisplay(
  engineUnits: number,
  market: string,
): number {
  return (
    Math.round((engineUnits / getNotionalScaleFactor(market)) * 100) / 100
  );
}

/** Descale notional integer to human USD (collateral, notional value). */
export function unscaleNotionalFromApi(
  notionalInt: number,
  market: string,
): number {
  return notionalInt / getNotionalScaleFactor(market);
}

/** Descale realized PnL integer to human USD. */
export function unscalePnlFromApi(pnlInt: number, market: string): number {
  return unscaleNotionalFromApi(pnlInt, market);
}
