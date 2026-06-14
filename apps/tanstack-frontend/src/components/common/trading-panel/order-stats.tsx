import { formatUsd } from "#/lib/format";
import { marketConfig } from "#/lib/market";

type OrderStatsProps = {
  estimatedCollateral: number | null;
  notional: number | null;
};

export function OrderStats({ estimatedCollateral, notional }: OrderStatsProps) {
  return (
    <div className="flex flex-col gap-2 p-4 text-xs">
      <div className="flex justify-between">
        <span className="text-input-label">LEVERAGE</span>
        <span>{marketConfig.maxLeverage.toFixed(2)}x</span>
      </div>
      {estimatedCollateral != null && notional != null ? (
        <div className="flex justify-between">
          <span className="text-input-label">NOTIONAL</span>
          <span className="font-mono tabular-nums">{formatUsd(notional)} USD</span>
        </div>
      ) : null}
    </div>
  );
}
