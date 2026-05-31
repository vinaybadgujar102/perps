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
import { fetchMarkets, useMarkets } from "@/hooks/queries/use-markets";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

const MarketsComponent = () => {
  const marketsQuery = useMarkets();

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>All Markets</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void marketsQuery.refetch()}
            disabled={marketsQuery.isFetching}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {marketsQuery.isLoading ? (
            <div className="space-y-2" aria-live="polite" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : null}

          {marketsQuery.error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Failed to load markets.</p>
              <Button variant="outline" size="sm" onClick={() => void marketsQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}

          {!marketsQuery.isLoading && !marketsQuery.error && marketsQuery.data?.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No markets available.</div>
          ) : null}

          {!marketsQuery.isLoading && !marketsQuery.error && (marketsQuery.data?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead className="text-right">Max leverage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketsQuery.data?.map((market) => (
                  <TableRow key={market.symbol}>
                    <TableCell className="font-medium">{market.symbol}-PERP</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{market.maxLeverage}x</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/trade/$symbol" params={{ symbol: market.symbol }}>
                          Trade
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
};

export const MarketsRouteView = {
  Component: MarketsComponent,
  fetchMarkets,
};
