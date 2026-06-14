import {
  unscalePriceFromApi,
  unscaleQtyFromApi,
} from "#/lib/market";

export function calculateUnrealizedPnl({
  markPrice,
  averageEntryPrice,
  size,
}: {
  markPrice: number;
  averageEntryPrice: number;
  size: number;
}): number {
  return (
    (unscalePriceFromApi(markPrice) - unscalePriceFromApi(averageEntryPrice)) *
    unscaleQtyFromApi(size)
  );
}
