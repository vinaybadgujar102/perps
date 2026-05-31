import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Market, OpenPosition } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { calculateUnrealizedPnl } from "@/lib/pnl";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

type OpenPositionsPanelProps = {
  positions: OpenPosition[];
  activeSymbol: string;
  markets: Market[];
  indexPrices: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isAuthenticated: boolean;
};

const formatPnl = (value: number, digits: number) => {
  const formatted = formatNumber(Math.abs(value), digits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

const pnlClassName = (value: number) => {
  if (value > 0) return "text-primary";
  if (value < 0) return "text-destructive";
  return "";
};

export const OpenPositionsPanel = ({
  positions,
  activeSymbol,
  markets,
  indexPrices,
  isLoading,
  error,
  onRetry,
  isAuthenticated,
}: OpenPositionsPanelProps) => {
  const marketBySymbol = new Map(markets.map((m) => [m.symbol, m]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Open Positions
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="p-0 pb-4">
        {!isAuthenticated ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to view positions.
          </div>
        ) : null}

        {isAuthenticated && isLoading ? (
          <div className="space-y-2 px-4" aria-live="polite" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {isAuthenticated && error ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center" aria-live="assertive">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}

        {isAuthenticated && !isLoading && !error && positions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No open positions</div>
        ) : null}

        {isAuthenticated && !isLoading && !error && positions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right font-mono">Size</TableHead>
                  <TableHead className="text-right font-mono">Entry</TableHead>
                  <TableHead className="text-right font-mono">Margin</TableHead>
                  <TableHead className="text-right font-mono">Liq. price</TableHead>
                  <TableHead className="text-right font-mono">Unrealized PnL</TableHead>
                  <TableHead className="text-right font-mono">Realized PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const market = marketBySymbol.get(position.market);
                  const priceScale = market?.priceScale ?? 2;
                  const quantityScale = market?.quantityScale ?? 2;
                  const markPrice = indexPrices[position.market];
                  const unrealizedPnl =
                    markPrice === undefined
                      ? null
                      : calculateUnrealizedPnl({
                          markPrice,
                          averageEntryPrice: position.averageEntryPrice,
                          size: position.size,
                        });

                  return (
                    <TableRow
                      key={position.market}
                      className={cn(position.market === activeSymbol && "bg-primary/5")}
                    >
                      <TableCell className="font-medium">{position.market}</TableCell>
                      <TableCell>
                        <Badge
                          variant={position.side === "LONG" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {position.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatNumber(Math.abs(position.size), quantityScale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatNumber(position.averageEntryPrice, priceScale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatNumber(position.collateralUser, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatNumber(position.estimatedLiquidationPrice, priceScale)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums",
                          unrealizedPnl === null ? "" : pnlClassName(unrealizedPnl),
                        )}
                      >
                        {unrealizedPnl === null ? "--" : formatPnl(unrealizedPnl, 2)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums",
                          pnlClassName(position.realizedPnl),
                        )}
                      >
                        {formatPnl(position.realizedPnl, 2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
