import { AssetConfig } from "@repo/sharedtypes";
import { useQueries } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getOrderbookApi } from "#/api/orderbook.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

const MARKET_STATS: Record<
  string,
  { changePct: string; changePositive: boolean }
> = {
  BTC: { changePct: "+0.86%", changePositive: true },
  SOL: { changePct: "+5.02%", changePositive: true },
};

function formatMidPrice(
  bestBid: number | undefined,
  bestAsk: number | undefined,
  priceScale: number,
) {
  if (bestBid == null || bestAsk == null) return "—";
  const mid = (bestBid + bestAsk) / 2 / 10 ** priceScale;
  return mid.toLocaleString("en-US", {
    minimumFractionDigits: priceScale,
    maximumFractionDigits: priceScale,
  });
}

type MarketSelectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMarket: string;
  markets: readonly string[];
  onSelect: (market: string) => void;
};

export function MarketSelectModal({
  open,
  onOpenChange,
  selectedMarket,
  markets,
  onSelect,
}: MarketSelectModalProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const orderbookQueries = useQueries({
    queries: markets.map((symbol) => ({
      queryKey: queryKeys.orderbook(symbol),
      queryFn: () => getOrderbookApi(symbol),
      enabled: open,
      staleTime: 10_000,
    })),
  });

  const filteredMarkets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return markets;
    return markets.filter((symbol) =>
      `${symbol}/usd`.toLowerCase().includes(query),
    );
  }, [markets, search]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[80vh] max-w-2xl flex-col gap-0 overflow-hidden border-border bg-surface p-0 text-foreground sm:max-w-2xl"
      >
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="mono-label text-xs font-semibold tracking-widest text-input-label uppercase">
            Select Market
          </DialogTitle>
        </DialogHeader>

        <div className="border-b border-border p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-input-label"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Markets"
              className="h-11 border-border bg-background pl-10 font-mono text-sm text-foreground placeholder:text-input-label focus-visible:ring-accent/50"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 border-b border-border bg-surface">
              <tr>
                <th className="mono-label px-4 py-3 text-[9px] font-semibold tracking-widest text-input-label uppercase">
                  Asset
                </th>
                <th className="mono-label px-4 py-3 text-right text-[9px] font-semibold tracking-widest text-input-label uppercase">
                  Price
                </th>
                <th className="mono-label px-4 py-3 text-right text-[9px] font-semibold tracking-widest text-input-label uppercase">
                  24h Change
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs text-foreground">
              {filteredMarkets.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-input-label"
                  >
                    No markets match your search
                  </td>
                </tr>
              ) : (
                filteredMarkets.map((symbol) => {
                  const index = markets.indexOf(symbol);
                  const orderbook = orderbookQueries[index]?.data;
                  const { priceScale } = AssetConfig[symbol]!;
                  const stats = MARKET_STATS[symbol];
                  const price = formatMidPrice(
                    orderbook?.bestBid?.price,
                    orderbook?.bestAsk?.price,
                    priceScale,
                  );

                  return (
                    <tr
                      key={symbol}
                      className={cn(
                        "cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/5",
                        symbol === selectedMarket && "bg-surface/60",
                      )}
                      onClick={() => handleSelect(symbol)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect(symbol);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${symbol} USD`}
                    >
                      <td className="px-4 py-3 font-bold text-foreground">
                        {symbol}/USD
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {price}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums",
                          stats?.changePositive
                            ? "text-trading-green"
                            : "text-accent",
                        )}
                      >
                        {stats?.changePct ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
