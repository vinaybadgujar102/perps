import { formatUsd } from "#/lib/format";
import { formatApiPrice } from "#/lib/market";

type OrderStatsProps = {
  market: string;
  estimatedCollateral: number | null;
  notional: number | null;
  estimatedLiquidationPrice: number | null;
};

export function OrderStats({
  market,
  estimatedCollateral,
  notional,
  estimatedLiquidationPrice,
}: OrderStatsProps) {
  return (
    <div className="flex flex-col gap-2 p-4 text-xs">
      {estimatedCollateral != null && notional != null ? (
        <div className="flex justify-between">
          <span className="text-input-label">NOTIONAL</span>
          <span className="font-mono tabular-nums">{formatUsd(notional)} USD</span>
        </div>
      ) : null}
      {estimatedLiquidationPrice != null ? (
        <div className="flex justify-between">
          <span className="text-input-label">EST. LIQ. PRICE</span>
          <span className="font-mono tabular-nums">
            {formatApiPrice(estimatedLiquidationPrice, market)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
