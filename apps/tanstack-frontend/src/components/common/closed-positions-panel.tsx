import { SIDE, type PersistedClosedPosition } from "@repo/sharedtypes";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { useUser } from "#/context/user-context";
import { useClosedPositions } from "#/hooks/use-closed-positions";
import { formatTradingTimestamp } from "#/lib/format-trading-timestamp";
import { formatUsd } from "#/lib/format";
import { useTradingMarket } from "#/contexts/trading-market-context";
import {
  formatApiPrice,
  formatApiQty,
} from "#/lib/market";
import { cn } from "#/lib/utils";

function formatSignedUsd(value: number) {
  const formatted = formatUsd(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function pnlClassName(value: number) {
  if (value > 0) return "text-trading-green";
  if (value < 0) return "text-accent";
  return "text-foreground";
}

type ClosedPositionRowProps = {
  position: PersistedClosedPosition;
  isActiveMarket: boolean;
};

function ClosedPositionRow({
  position,
  isActiveMarket,
}: ClosedPositionRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 last:border-b-0",
        isActiveMarket && "bg-surface/40",
      )}
    >
      <td className="px-4 py-2 font-medium">{position.market}</td>
      <td className="px-4 py-2">
        <span
          className={cn(
            "mono-label rounded px-1.5 py-0.5 text-[10px]",
            position.side === SIDE.LONG
              ? "bg-trading-green/10 text-trading-green"
              : "bg-accent/10 text-accent",
          )}
        >
          {position.side}
        </span>
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiQty(position.size, position.market)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiPrice(position.averageEntryPrice, position.market)}
      </td>
      <td
        className={cn(
          "px-4 py-2 text-right font-mono tabular-nums",
          pnlClassName(position.realizedPnl),
        )}
      >
        {formatSignedUsd(position.realizedPnl)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-input-label">
        {formatTradingTimestamp(position.openedAt)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-input-label">
        {formatTradingTimestamp(position.closedAt)}
      </td>
    </tr>
  );
}

export function ClosedPositionsPanel() {
  const { market } = useTradingMarket();
  const { isAuthenticated } = useUser();
  const closedPositionsQuery = useClosedPositions();

  const positions = closedPositionsQuery.data ?? [];
  const errorMessage =
    closedPositionsQuery.error instanceof Error
      ? closedPositionsQuery.error.message
      : closedPositionsQuery.error
        ? "Unable to load closed positions"
        : null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface/20">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-input-label hover:text-foreground"
          disabled={!isAuthenticated || closedPositionsQuery.isFetching}
          onClick={() => void closedPositionsQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              closedPositionsQuery.isFetching && "animate-spin",
            )}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {!isAuthenticated ? (
          <div className="px-4 py-6 text-center text-sm text-input-label">
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>{" "}
            to view closed positions.
          </div>
        ) : null}

        {isAuthenticated && closedPositionsQuery.isLoading ? (
          <div className="space-y-2 px-4 py-4" aria-live="polite" aria-busy="true">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-8 animate-pulse rounded bg-surface/60"
              />
            ))}
          </div>
        ) : null}

        {isAuthenticated && errorMessage ? (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <p className="text-sm text-accent">{errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void closedPositionsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isAuthenticated &&
        !closedPositionsQuery.isLoading &&
        !errorMessage &&
        positions.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-input-label">
            No closed positions
          </div>
        ) : null}

        {isAuthenticated &&
        !closedPositionsQuery.isLoading &&
        !errorMessage &&
        positions.length > 0 ? (
          <table className="w-full min-w-[900px] text-xs">
            <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm">
              <tr className="border-b border-border text-input-label">
                <th className="px-4 py-2 text-left font-normal">Market</th>
                <th className="px-4 py-2 text-left font-normal">Side</th>
                <th className="px-4 py-2 text-right font-normal">Size</th>
                <th className="px-4 py-2 text-right font-normal">Entry</th>
                <th className="px-4 py-2 text-right font-normal">Realized PnL</th>
                <th className="px-4 py-2 text-right font-normal">Opened</th>
                <th className="px-4 py-2 text-right font-normal">Closed</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <ClosedPositionRow
                  key={position.positionId}
                  position={position}
                  isActiveMarket={position.market === market}
                />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
