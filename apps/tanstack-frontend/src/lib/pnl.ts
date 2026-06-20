import {
  unscalePriceFromApi,
  unscaleQtyFromApi,
} from "#/lib/market";

export function calculateUnrealizedPnl({
  markPrice,
  averageEntryPrice,
  size,
  market,
}: {
  markPrice: number;
  averageEntryPrice: number;
  size: number;
  market: string;
}): number {
  return (
    (unscalePriceFromApi(markPrice, market) -
      unscalePriceFromApi(averageEntryPrice, market)) *
    unscaleQtyFromApi(size, market)
  );
}
