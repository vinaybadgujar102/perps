import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Market } from "@/lib/api";
import { formatScaledNumber } from "@/lib/format";

type MarketHeaderProps = {
  market: Market;
  markPrice: number | null;
};

export const MarketHeader = ({ market, markPrice }: MarketHeaderProps) => {
  const displayPrice =
    markPrice !== null ? `$${formatScaledNumber(markPrice, market.priceScale)}` : "--";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-lg font-semibold">{market.symbol}/USDT</p>
            <p className="text-xs text-muted-foreground">Perpetual</p>
          </div>
          <Badge variant="secondary">{market.maxLeverage}x max</Badge>
        </div>

        <dl className="flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Mark price</dt>
            <dd className="font-mono text-base font-medium text-primary tabular-nums">
              {displayPrice}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Max lev</dt>
            <dd className="font-mono tabular-nums">{market.maxLeverage}x</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
};
