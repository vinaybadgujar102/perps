import {
  ORDER_STATUS,
  ORDER_TYPE,
  SIDE,
  type PersistedOrder,
} from "@repo/sharedtypes";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { useUser } from "#/context/user-context";
import { useOrderHistory } from "#/hooks/use-order-history";
import { formatTradingTimestamp } from "#/lib/format-trading-timestamp";
import { useTradingMarket } from "#/contexts/trading-market-context";
import {
  formatApiPrice,
  formatApiQty,
} from "#/lib/market";
import { cn } from "#/lib/utils";

function formatOrderType(orderType: ORDER_TYPE) {
  return orderType === ORDER_TYPE.LIMIT_ORDER ? "Limit" : "Market";
}

function formatOrderStatus(status: ORDER_STATUS) {
  switch (status) {
    case ORDER_STATUS.OPEN:
      return "Open";
    case ORDER_STATUS.PARTIALLY_FILLED:
      return "Partial";
    case ORDER_STATUS.FILLED:
      return "Filled";
    case ORDER_STATUS.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
}

type OrderHistoryRowProps = {
  order: PersistedOrder;
  isActiveMarket: boolean;
};

function OrderHistoryRow({ order, isActiveMarket }: OrderHistoryRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 last:border-b-0",
        isActiveMarket && "bg-surface/40",
      )}
    >
      <td className="px-4 py-2 font-medium">{order.market}</td>
      <td className="px-4 py-2">
        <span
          className={cn(
            "mono-label rounded px-1.5 py-0.5 text-[10px]",
            order.side === SIDE.LONG
              ? "bg-trading-green/10 text-trading-green"
              : "bg-accent/10 text-accent",
          )}
        >
          {order.side}
        </span>
      </td>
      <td className="px-4 py-2 text-input-label">
        {formatOrderType(order.orderType)}
      </td>
      <td className="px-4 py-2 text-input-label">
        {formatOrderStatus(order.status)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiPrice(order.price, order.market)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiQty(order.qty, order.market)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiQty(order.filledQty, order.market)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-input-label">
        {formatTradingTimestamp(order.placedAt)}
      </td>
    </tr>
  );
}

export function OrderHistoryPanel() {
  const { market } = useTradingMarket();
  const { isAuthenticated } = useUser();
  const orderHistoryQuery = useOrderHistory();

  const orders = orderHistoryQuery.data ?? [];
  const errorMessage =
    orderHistoryQuery.error instanceof Error
      ? orderHistoryQuery.error.message
      : orderHistoryQuery.error
        ? "Unable to load order history"
        : null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface/20">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-input-label hover:text-foreground"
          disabled={!isAuthenticated || orderHistoryQuery.isFetching}
          onClick={() => void orderHistoryQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              orderHistoryQuery.isFetching && "animate-spin",
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
            to view order history.
          </div>
        ) : null}

        {isAuthenticated && orderHistoryQuery.isLoading ? (
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
              onClick={() => void orderHistoryQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isAuthenticated &&
        !orderHistoryQuery.isLoading &&
        !errorMessage &&
        orders.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-input-label">
            No order history
          </div>
        ) : null}

        {isAuthenticated &&
        !orderHistoryQuery.isLoading &&
        !errorMessage &&
        orders.length > 0 ? (
          <table className="w-full min-w-[960px] text-xs">
            <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm">
              <tr className="border-b border-border text-input-label">
                <th className="px-4 py-2 text-left font-normal">Market</th>
                <th className="px-4 py-2 text-left font-normal">Side</th>
                <th className="px-4 py-2 text-left font-normal">Type</th>
                <th className="px-4 py-2 text-left font-normal">Status</th>
                <th className="px-4 py-2 text-right font-normal">Price</th>
                <th className="px-4 py-2 text-right font-normal">Qty</th>
                <th className="px-4 py-2 text-right font-normal">Filled</th>
                <th className="px-4 py-2 text-right font-normal">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderHistoryRow
                  key={order.orderId}
                  order={order}
                  isActiveMarket={order.market === market}
                />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
