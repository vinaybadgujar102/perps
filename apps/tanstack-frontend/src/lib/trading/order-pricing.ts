import { ORDER_TYPE, SIDE, type Side } from "@repo/sharedtypes";
import {
  scalePriceToApi,
  scaleQtyToApi,
  unscalePriceFromApi,
} from "#/lib/market";

export type MarketPrices = {
  bestBid: number | null;
  bestAsk: number | null;
  lastPrice: number | null;
};

export function getLastMidPrice(
  bestBid: number | null,
  bestAsk: number | null,
  indexPrice: number | null,
): number | null {
  if (bestBid != null && bestAsk != null) {
    return (bestBid + bestAsk) / 2;
  }
  return indexPrice;
}

export function defaultLimitPriceDisplay(
  side: Side,
  { bestBid, bestAsk, lastPrice }: MarketPrices,
  market: string,
): string {
  if (side === SIDE.LONG && bestAsk != null) {
    return String(unscalePriceFromApi(bestAsk, market));
  }
  if (side === SIDE.SHORT && bestBid != null) {
    return String(unscalePriceFromApi(bestBid, market));
  }
  if (lastPrice != null) return String(unscalePriceFromApi(lastPrice, market));
  return "";
}

export function resolveSubmitPrice(
  orderType: ORDER_TYPE,
  side: Side,
  priceInput: string,
  prices: MarketPrices,
  market: string,
): number | null {
  const { bestBid, bestAsk, lastPrice } = prices;

  if (orderType === ORDER_TYPE.LIMIT_ORDER) {
    const displayPrice = Number(priceInput);
    if (!Number.isFinite(displayPrice) || displayPrice <= 0) return null;
    return scalePriceToApi(displayPrice, market);
  }

  if (side === SIDE.LONG) {
    const price = bestAsk ?? lastPrice;
    return price != null && price > 0 ? price : null;
  }

  const price = bestBid ?? lastPrice;
  return price != null && price > 0 ? price : null;
}

export function toApiQty(displayQty: number, market: string): number | null {
  if (!Number.isFinite(displayQty) || displayQty <= 0) return null;
  return scaleQtyToApi(displayQty, market);
}

export function estimateCollateral(
  effectivePrice: number | null,
  displayQty: number,
  leverage: number,
  market: string,
): number | null {
  if (
    effectivePrice == null ||
    !Number.isFinite(displayQty) ||
    displayQty <= 0 ||
    leverage <= 0
  ) {
    return null;
  }

  return (
    (unscalePriceFromApi(effectivePrice, market) * displayQty) / leverage
  );
}

export function estimateNotional(
  effectivePrice: number | null,
  displayQty: number,
  market: string,
): number | null {
  if (
    effectivePrice == null ||
    !Number.isFinite(displayQty) ||
    displayQty <= 0
  ) {
    return null;
  }

  return unscalePriceFromApi(effectivePrice, market) * displayQty;
}

export function isMarketBookMissing(
  orderType: ORDER_TYPE,
  side: Side,
  prices: MarketPrices,
): boolean {
  if (orderType !== ORDER_TYPE.MARKET_ORDER) return false;

  const { bestBid, bestAsk, lastPrice } = prices;
  return side === SIDE.LONG
    ? bestAsk == null && lastPrice == null
    : bestBid == null && lastPrice == null;
}
