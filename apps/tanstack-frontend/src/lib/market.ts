import { AssetConfig } from "@repo/sharedtypes";

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
  return (
    collateralUser /
    10 ** (marketConfig.priceScale + marketConfig.quantityScale)
  );
}

export function qtyInputPlaceholder() {
  return `0.${"0".repeat(marketConfig.quantityScale)}`;
}
