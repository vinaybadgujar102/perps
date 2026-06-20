import {
  AssetConfig,
  unscaleNotionalFromApi,
  unscalePnlFromApi,
} from "@repo/sharedtypes";

export function getMarketConfig(market: string) {
  const config = AssetConfig[market];
  if (!config) {
    throw new Error(`Unknown market: ${market}`);
  }
  return config;
}

export function scalePriceToApi(displayPrice: number, market: string) {
  const { priceScale } = getMarketConfig(market);
  return Math.round(displayPrice * 10 ** priceScale);
}

export function unscalePriceFromApi(apiPrice: number, market: string) {
  const { priceScale } = getMarketConfig(market);
  return apiPrice / 10 ** priceScale;
}

export function scaleQtyToApi(displayQty: number, market: string) {
  const { quantityScale } = getMarketConfig(market);
  return Math.round(displayQty * 10 ** quantityScale);
}

export function unscaleQtyFromApi(apiQty: number, market: string) {
  const { quantityScale } = getMarketConfig(market);
  return apiQty / 10 ** quantityScale;
}

export function formatDisplayPrice(value: number, market: string) {
  const { priceScale } = getMarketConfig(market);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: priceScale,
    maximumFractionDigits: priceScale,
  });
}

export function formatApiPrice(apiPrice: number, market: string) {
  return formatDisplayPrice(unscalePriceFromApi(apiPrice, market), market);
}

export function formatApiQty(apiQty: number, market: string) {
  const { quantityScale } = getMarketConfig(market);
  return unscaleQtyFromApi(apiQty, market).toLocaleString("en-US", {
    minimumFractionDigits: quantityScale,
    maximumFractionDigits: quantityScale,
  });
}

export function unscaleCollateralFromApi(collateralUser: number, market: string) {
  return unscaleNotionalFromApi(collateralUser, market);
}

export function unscalePnlFromApiValue(pnl: number, market: string) {
  return unscalePnlFromApi(pnl, market);
}

export function qtyInputPlaceholder(market: string) {
  const { quantityScale } = getMarketConfig(market);
  return `0.${"0".repeat(quantityScale)}`;
}

export function priceInputPlaceholder(market: string) {
  const { priceScale } = getMarketConfig(market);
  return `0.${"0".repeat(priceScale)}`;
}

/** Keeps only numeric input with at most `maxDecimals` digits after the decimal. */
export function sanitizeScaledDecimalInput(
  raw: string,
  maxDecimals: number,
): string {
  if (raw === "") return "";

  const cleaned = raw.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");

  if (dotIndex === -1) return cleaned;

  const whole = cleaned.slice(0, dotIndex);
  const fraction = cleaned.slice(dotIndex + 1).replace(/\./g, "");

  if (maxDecimals === 0) return whole;

  return `${whole}.${fraction.slice(0, maxDecimals)}`;
}
