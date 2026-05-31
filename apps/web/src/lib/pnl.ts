export function calculateUnrealizedPnl({
  markPrice,
  averageEntryPrice,
  size,
}: {
  markPrice: number;
  averageEntryPrice: number;
  size: number;
}): number {
  return (markPrice - averageEntryPrice) * size;
}
