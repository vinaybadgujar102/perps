import { Link } from "@tanstack/react-router";
import { formatUsd } from "#/lib/format";

type MarginSummaryProps = {
  isAuthenticated: boolean;
  isBalanceLoading: boolean;
  availableMarginUsd: number | null;
  estimatedCollateral: number | null;
};

export function MarginSummary({
  isAuthenticated,
  isBalanceLoading,
  availableMarginUsd,
  estimatedCollateral,
}: MarginSummaryProps) {
  if (!isAuthenticated) {
    return (
      <div className="border border-border bg-surface/30 p-3 text-center text-xs text-input-label">
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>{" "}
        to place orders.
      </div>
    );
  }

  return (
    <div className="border border-border bg-surface/30 p-3 text-xs">
      <div className="flex justify-between">
        <span className="nav-label text-[10px] text-input-label">
          Available Margin
        </span>
        <span className="font-mono tabular-nums text-foreground">
          {isBalanceLoading || availableMarginUsd === null
            ? "—"
            : `${formatUsd(availableMarginUsd)} USD`}
        </span>
      </div>
      {estimatedCollateral != null ? (
        <div className="mt-1 flex justify-between">
          <span className="nav-label text-[10px] text-input-label">
            Est. Margin Locked
          </span>
          <span className="font-mono tabular-nums text-input-label">
            {formatUsd(estimatedCollateral)} USD
          </span>
        </div>
      ) : null}
    </div>
  );
}
