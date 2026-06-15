import { ORDER_TYPE, SIDE } from "@repo/sharedtypes";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import type { OpenOrder } from "#/api/order.api";
import { Button } from "#/components/ui/button";
import { useUser } from "#/context/user-context";
import { useCancelOrder } from "#/hooks/use-cancel-order";
import { useOpenOrders } from "#/hooks/use-open-orders";
import { formatApiPrice, formatApiQty, TRADING_MARKET } from "#/lib/market";
import { cn } from "#/lib/utils";

function formatOrderType(orderType: ORDER_TYPE) {
  return orderType === ORDER_TYPE.LIMIT_ORDER ? "Limit" : "Market";
}

type OrderRowProps = {
  order: OpenOrder;
  isActiveMarket: boolean;
  isCancelling: boolean;
  onCancel: (orderId: string) => void;
};

function OrderRow({
  order,
  isActiveMarket,
  isCancelling,
  onCancel,
}: OrderRowProps) {
  const remainingQty = order.qty - order.filledQty;

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
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiPrice(order.price)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiQty(order.qty)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiQty(order.filledQty)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatApiQty(remainingQty)}
      </td>
      <td className="px-4 py-2 text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs text-accent hover:text-accent"
          disabled={isCancelling || remainingQty <= 0}
          onClick={() => onCancel(order.id)}
        >
          {isCancelling ? "Cancelling…" : "Cancel"}
        </Button>
      </td>
    </tr>
  );
}

export function OpenOrdersPanel() {
  const { isAuthenticated } = useUser();
  const openOrdersQuery = useOpenOrders();
  const cancelOrder = useCancelOrder();

  const orders = openOrdersQuery.data ?? [];
  const errorMessage =
    openOrdersQuery.error instanceof Error
      ? openOrdersQuery.error.message
      : openOrdersQuery.error
        ? "Unable to load open orders"
        : null;

  const handleCancel = (orderId: string) => {
    cancelOrder.mutate(orderId);
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface/20">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-input-label hover:text-foreground"
          disabled={!isAuthenticated || openOrdersQuery.isFetching}
          onClick={() => void openOrdersQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              openOrdersQuery.isFetching && "animate-spin",
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
            to view open orders.
          </div>
        ) : null}

        {isAuthenticated && openOrdersQuery.isLoading ? (
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
              onClick={() => void openOrdersQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isAuthenticated &&
        !openOrdersQuery.isLoading &&
        !errorMessage &&
        orders.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-input-label">
            No open orders
          </div>
        ) : null}

        {isAuthenticated &&
        !openOrdersQuery.isLoading &&
        !errorMessage &&
        orders.length > 0 ? (
          <table className="w-full min-w-[860px] text-xs">
            <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm">
              <tr className="border-b border-border text-input-label">
                <th className="px-4 py-2 text-left font-normal">Market</th>
                <th className="px-4 py-2 text-left font-normal">Side</th>
                <th className="px-4 py-2 text-left font-normal">Type</th>
                <th className="px-4 py-2 text-right font-normal">Price</th>
                <th className="px-4 py-2 text-right font-normal">Qty</th>
                <th className="px-4 py-2 text-right font-normal">Filled</th>
                <th className="px-4 py-2 text-right font-normal">Remaining</th>
                <th className="px-4 py-2 text-right font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isActiveMarket={order.market === TRADING_MARKET}
                  isCancelling={
                    cancelOrder.isPending &&
                    cancelOrder.variables === order.id
                  }
                  onCancel={handleCancel}
                />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
