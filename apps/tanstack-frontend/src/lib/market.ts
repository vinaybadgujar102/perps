import {
  AssetConfig,
  unscaleNotionalFromApi,
  unscalePnlFromApi,
} from "@repo/sharedtypes";

export const TRADING_MARKET = "BTC";

export const marketConfig = AssetConfig[TRADING_MARKET];

export function scalePriceToApi(displayPrice: number) {
  return Math.round(displayPrice * 10 ** marketConfig.priceScale);
}

export function unscalePriceFromApi(apiPrice: number) {
  return apiPrice / 10 ** marketConfig.priceScale;
}

export function scaleQtyToApi(displayQty: number) {
  return Math.round(displayQty * 10 ** marketConfig.quantityScale);
}

export function unscaleQtyFromApi(apiQty: number) {
  return apiQty / 10 ** marketConfig.quantityScale;
}

export function formatDisplayPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: marketConfig.priceScale,
    maximumFractionDigits: marketConfig.priceScale,
  });
}

export function formatApiPrice(apiPrice: number) {
  return formatDisplayPrice(unscalePriceFromApi(apiPrice));
}

export function formatApiQty(apiQty: number) {
  return unscaleQtyFromApi(apiQty).toLocaleString("en-US", {
    minimumFractionDigits: marketConfig.quantityScale,
    maximumFractionDigits: marketConfig.quantityScale,
  });
}

export function unscaleCollateralFromApi(collateralUser: number) {
  return unscaleNotionalFromApi(collateralUser, TRADING_MARKET);
}

export function unscalePnlFromApiValue(pnl: number) {
  return unscalePnlFromApi(pnl, TRADING_MARKET);
}

export function qtyInputPlaceholder() {
  return `0.${"0".repeat(marketConfig.quantityScale)}`;
}

export function priceInputPlaceholder() {
  return `0.${"0".repeat(marketConfig.priceScale)}`;
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
