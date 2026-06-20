import { SIDE, type Fill } from "@repo/sharedtypes";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { useUser } from "#/context/user-context";
import { useFills } from "#/hooks/use-fills";
import { formatTradingTimestamp } from "#/lib/format-trading-timestamp";
import { useTradingMarket } from "#/contexts/trading-market-context";
import { formatApiPrice, formatApiQty } from "#/lib/market";
import { cn } from "#/lib/utils";

type FillRowProps = {
  fill: Fill;
  userId: number;
  isActiveMarket: boolean;
};

function FillRow({ fill, userId, isActiveMarket }: FillRowProps) {
  const isMaker = fill.makerId === userId;
  const userSide = isMaker ? fill.makerSide : fill.takerSide;

  return (
    <tr
      className={cn(
        "border-b border-border/60 last:border-b-0",
        isActiveMarket && "bg-surface/40",
      )}
    >
      <td className="px-4 py-2 font-medium">{fill.market}</td>
      <td className="px-4 py-2">
        <span
          className={cn(
            "mono-label rounded px-1.5 py-0.5 text-[10px]",
            userSide === SIDE.LONG
              ? "bg-trading-green/10 text-trading-green"
              : "bg-accent/10 text-accent",
          )}
        >
          {userSide}
        </span>
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiPrice(fill.price, fill.market)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiQty(fill.filledQty, fill.market)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-input-label">
        {formatTradingTimestamp(fill.timestamp)}
      </td>
      <td className="px-4 py-2 text-right text-input-label">
        {isMaker ? "Maker" : "Taker"}
      </td>
    </tr>
  );
}

export function FillsPanel() {
  const { market } = useTradingMarket();
  const { isAuthenticated, user } = useUser();
  const fillsQuery = useFills();

  const fills = fillsQuery.data ?? [];
  const errorMessage =
    fillsQuery.error instanceof Error
      ? fillsQuery.error.message
      : fillsQuery.error
        ? "Unable to load fills"
        : null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface/20">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-input-label hover:text-foreground"
          disabled={!isAuthenticated || fillsQuery.isFetching}
          onClick={() => void fillsQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              fillsQuery.isFetching && "animate-spin",
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
            to view fills.
          </div>
        ) : null}

        {isAuthenticated && fillsQuery.isLoading ? (
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
              onClick={() => void fillsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isAuthenticated &&
        !fillsQuery.isLoading &&
        !errorMessage &&
        fills.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-input-label">
            No fills
          </div>
        ) : null}

        {isAuthenticated &&
        !fillsQuery.isLoading &&
        !errorMessage &&
        fills.length > 0 &&
        user ? (
          <table className="w-full min-w-[720px] text-xs">
            <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm">
              <tr className="border-b border-border text-input-label">
                <th className="px-4 py-2 text-left font-normal">Market</th>
                <th className="px-4 py-2 text-left font-normal">Side</th>
                <th className="px-4 py-2 text-right font-normal">Price</th>
                <th className="px-4 py-2 text-right font-normal">Qty</th>
                <th className="px-4 py-2 text-right font-normal">Time</th>
                <th className="px-4 py-2 text-right font-normal">Role</th>
              </tr>
            </thead>
            <tbody>
              {fills.map((fill) => (
                <FillRow
                  key={fill.id}
                  fill={fill}
                  userId={user.id}
                  isActiveMarket={fill.market === market}
                />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
