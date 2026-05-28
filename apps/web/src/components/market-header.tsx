import type { Market } from "../lib/api";

type MarketHeaderProps = {
  market: Market;
  lastPrice: number | null;
};

export const MarketHeader = ({ market, lastPrice }: MarketHeaderProps) => {
  return (
    <header className="panel market-header">
      <div>
        <p className="eyebrow">Perpetual Futures</p>
        <h1>{market.symbol}-PERP</h1>
      </div>
      <dl className="market-stats">
        <div>
          <dt>Last Price</dt>
          <dd>{lastPrice ? `$${lastPrice.toFixed(market.priceScale)}` : "--"}</dd>
        </div>
        <div>
          <dt>Max Leverage</dt>
          <dd>{market.maxLeverage}x</dd>
        </div>
        <div>
          <dt>Price Scale</dt>
          <dd>{market.priceScale}</dd>
        </div>
        <div>
          <dt>Qty Scale</dt>
          <dd>{market.quantityScale}</dd>
        </div>
      </dl>
    </header>
  );
};
