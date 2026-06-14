import { SIDE } from "@repo/sharedtypes";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { OpenPosition } from "#/api/position.api";
import { Button } from "#/components/ui/button";
import { useUser } from "#/context/user-context";
import type { TickerData } from "#/hooks/use-market-subscriptions";
import { usePositions } from "#/hooks/use-positions";
import { formatUsd } from "#/lib/format";
import {
  formatApiPrice,
  formatApiQty,
  TRADING_MARKET,
  unscaleCollateralFromApi,
} from "#/lib/market";
import { calculateUnrealizedPnl } from "#/lib/pnl";
import { queryKeys } from "#/lib/query-keys";
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

type PositionRowProps = {
  position: OpenPosition;
  markPrice: number | null;
  isActiveMarket: boolean;
};

function PositionRow({ position, markPrice, isActiveMarket }: PositionRowProps) {
  const unrealizedPnl =
    markPrice == null
      ? null
      : calculateUnrealizedPnl({
          markPrice,
          averageEntryPrice: position.averageEntryPrice,
          size: position.size,
        });

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
        {formatApiQty(Math.abs(position.size))}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiPrice(position.averageEntryPrice)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatUsd(unscaleCollateralFromApi(position.collateralUser))}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiPrice(position.estimatedLiquidationPrice)}
      </td>
      <td
        className={cn(
          "px-4 py-2 text-right font-mono tabular-nums",
          unrealizedPnl == null ? "text-input-label" : pnlClassName(unrealizedPnl),
        )}
      >
        {unrealizedPnl == null ? "—" : formatSignedUsd(unrealizedPnl)}
      </td>
      <td
        className={cn(
          "px-4 py-2 text-right font-mono tabular-nums",
          pnlClassName(position.realizedPnl),
        )}
      >
        {formatSignedUsd(position.realizedPnl)}
      </td>
    </tr>
  );
}

export function OpenPositionsPanel() {
  const { isAuthenticated } = useUser();
  const positionsQuery = usePositions();

  const tickerQuery = useQuery({
    queryKey: queryKeys.ticker(),
    queryFn: () => null as TickerData | null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const markPrice = tickerQuery.data?.indexPrice ?? null;
  const positions = positionsQuery.data ?? [];
  const errorMessage =
    positionsQuery.error instanceof Error
      ? positionsQuery.error.message
      : positionsQuery.error
        ? "Unable to load positions"
        : null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface/20">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="mono-label text-[10px] text-input-label">
          Open Positions
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-input-label hover:text-foreground"
          disabled={!isAuthenticated || positionsQuery.isFetching}
          onClick={() => void positionsQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              positionsQuery.isFetching && "animate-spin",
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
            to view positions.
          </div>
        ) : null}

        {isAuthenticated && positionsQuery.isLoading ? (
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
              onClick={() => void positionsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isAuthenticated &&
        !positionsQuery.isLoading &&
        !errorMessage &&
        positions.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-input-label">
            No open positions
          </div>
        ) : null}

        {isAuthenticated &&
        !positionsQuery.isLoading &&
        !errorMessage &&
        positions.length > 0 ? (
          <table className="w-full min-w-[720px] text-xs">
            <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm">
              <tr className="border-b border-border text-input-label">
                <th className="px-4 py-2 text-left font-normal">Market</th>
                <th className="px-4 py-2 text-left font-normal">Side</th>
                <th className="px-4 py-2 text-right font-normal">Size</th>
                <th className="px-4 py-2 text-right font-normal">Entry</th>
                <th className="px-4 py-2 text-right font-normal">Margin</th>
                <th className="px-4 py-2 text-right font-normal">Liq. price</th>
                <th className="px-4 py-2 text-right font-normal">Unrealized</th>
                <th className="px-4 py-2 text-right font-normal">Realized</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <PositionRow
                  key={`${position.market}-${position.side}`}
                  position={position}
                  markPrice={
                    position.market === TRADING_MARKET ? markPrice : null
                  }
                  isActiveMarket={position.market === TRADING_MARKET}
                />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
