import {
  engineUsdToDisplay,
  scaleDisplayUsdToEngine,
  scalePaymentCentsToEngine,
  unscaleNotionalFromApi,
  unscalePnlFromApi,
} from "@repo/sharedtypes";

/** Primary trading market — used for balance scaling until multi-market balances exist. */
export const DEFAULT_MARKET = "BTC";

/** Descale engine balance/margin to display USD (API egress). */
export function toDisplayUsd(engineUnits: number): number {
  return engineUsdToDisplay(engineUnits, DEFAULT_MARKET);
}

/** Scale display USD to engine units (API ingress). */
export function fromDisplayUsd(displayUsd: number): number {
  return scaleDisplayUsdToEngine(displayUsd, DEFAULT_MARKET);
}

/** Scale Razorpay payment cents to engine units (API ingress). */
export function fromPaymentCents(paymentCents: number): number {
  return scalePaymentCentsToEngine(paymentCents, DEFAULT_MARKET);
}

export function toDisplayCollateral(collateralEngine: number, market: string) {
  return unscaleNotionalFromApi(collateralEngine, market);
}

export function toDisplayPnl(pnlEngine: number, market: string) {
  return unscalePnlFromApi(pnlEngine, market);
}
