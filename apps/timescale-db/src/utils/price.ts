import { AssetConfig } from "@repo/sharedtypes";

export function unscalePrice(market: string, scaledPrice: number): number {
  const config = AssetConfig[market];
  if (!config) return scaledPrice;
  return scaledPrice / 10 ** config.priceScale;
}
