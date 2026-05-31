import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Market } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

type MarketsSidebarProps = {
  markets: Market[];
  activeSymbol: string;
  className?: string;
};

export const MarketsSidebar = ({ markets, activeSymbol, className }: MarketsSidebarProps) => {
  return (
    <aside
      className={cn(
        "flex min-h-[640px] flex-col gap-3 rounded-lg border border-border bg-card p-3",
        className,
      )}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input placeholder="Search coin" aria-label="Search coin" className="pl-9" />
      </div>

      <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        USDT Markets
      </h2>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1" role="list" aria-label="Markets list">
          {markets.map((market) => {
            const isActive = activeSymbol === market.symbol;
            return (
              <Link
                key={market.symbol}
                to="/trade/$symbol"
                params={{ symbol: market.symbol }}
                className={cn(
                  "flex items-center justify-between rounded-md border border-transparent px-2 py-2.5 text-sm transition-colors hover:bg-accent",
                  isActive && "border-primary bg-primary/10",
                )}
              >
                <div className="grid gap-0.5">
                  <strong className="text-sm">{market.symbol}/USDT</strong>
                  <span className="text-xs text-muted-foreground">Perp</span>
                </div>
                <Badge variant="outline" className="text-primary">
                  {market.maxLeverage}x
                </Badge>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
};
