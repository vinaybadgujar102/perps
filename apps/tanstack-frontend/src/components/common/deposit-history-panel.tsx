import type { DepositRecord } from "@repo/sharedtypes";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { useUser } from "#/context/user-context";
import { useDepositHistory } from "#/hooks/use-deposit-history";
import { formatTradingTimestamp } from "#/lib/format-trading-timestamp";
import { formatUsd } from "#/lib/format";
import { cn } from "#/lib/utils";

function formatDepositStatus(status: DepositRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "Success";
    case "FAILED":
      return "Failed";
    case "CREATED":
      return "Pending";
    default:
      return status;
  }
}

function truncateOrderId(orderId: string) {
  if (orderId.length <= 16) {
    return orderId;
  }
  return `${orderId.slice(0, 8)}…${orderId.slice(-6)}`;
}

type DepositHistoryRowProps = {
  deposit: DepositRecord;
};

function DepositHistoryRow({ deposit }: DepositHistoryRowProps) {
  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="px-4 py-2 text-right font-mono tabular-nums text-input-label">
        {formatTradingTimestamp(deposit.createdAt)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {formatUsd(deposit.amountUsd)} USD
      </td>
      <td className="px-4 py-2">
        <span
          className={cn(
            "mono-label rounded px-1.5 py-0.5 text-[10px]",
            deposit.status === "SUCCESS"
              ? "bg-trading-green/10 text-trading-green"
              : deposit.status === "FAILED"
                ? "bg-accent/10 text-accent"
                : "bg-surface/60 text-input-label",
          )}
        >
          {formatDepositStatus(deposit.status)}
        </span>
      </td>
      <td
        className="px-4 py-2 font-mono text-input-label"
        title={deposit.orderId}
      >
        {truncateOrderId(deposit.orderId)}
      </td>
    </tr>
  );
}

export function DepositHistoryPanel() {
  const { isAuthenticated } = useUser();
  const depositHistoryQuery = useDepositHistory();

  const deposits = depositHistoryQuery.data ?? [];
  const errorMessage =
    depositHistoryQuery.error instanceof Error
      ? depositHistoryQuery.error.message
      : depositHistoryQuery.error
        ? "Unable to load deposit history"
        : null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface/20">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-input-label hover:text-foreground"
          disabled={!isAuthenticated || depositHistoryQuery.isFetching}
          onClick={() => void depositHistoryQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              depositHistoryQuery.isFetching && "animate-spin",
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
            to view deposit history.
          </div>
        ) : null}

        {isAuthenticated && depositHistoryQuery.isLoading ? (
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
              onClick={() => void depositHistoryQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isAuthenticated &&
        !depositHistoryQuery.isLoading &&
        !errorMessage &&
        deposits.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-input-label">
            No deposits yet
          </div>
        ) : null}

        {isAuthenticated &&
        !depositHistoryQuery.isLoading &&
        !errorMessage &&
        deposits.length > 0 ? (
          <table className="w-full min-w-[640px] text-xs">
            <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm">
              <tr className="border-b border-border text-input-label">
                <th className="px-4 py-2 text-right font-normal">Date</th>
                <th className="px-4 py-2 text-right font-normal">Amount</th>
                <th className="px-4 py-2 text-left font-normal">Status</th>
                <th className="px-4 py-2 text-left font-normal">Order ID</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <DepositHistoryRow key={deposit.orderId} deposit={deposit} />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
