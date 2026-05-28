import type { Market } from "../lib/api";

type MarketHeaderProps = {
  market: Market;
  lastPrice: number | null;
};

export const MarketHeader = ({ market, lastPrice }: MarketHeaderProps) => {
  const displayPrice = lastPrice ? `$${lastPrice.toFixed(market.priceScale)}` : "--";
  return (
    <header className="market-header">
      <div className="market-head-title">
        <strong>{market.symbol}/USDT</strong>
        <span>Perpetual</span>
      </div>
      <dl className="ticker-stats">
        <div>
          <dt>Price</dt>
          <dd className="positive">{displayPrice}</dd>
        </div>
        <div>
          <dt>24h Change</dt>
          <dd className="positive">+1.15%</dd>
        </div>
        <div>
          <dt>24h High</dt>
          <dd>{displayPrice}</dd>
        </div>
        <div>
          <dt>24h Low</dt>
          <dd>{displayPrice}</dd>
        </div>
        <div>
          <dt>Max Lev</dt>
          <dd>{market.maxLeverage}x</dd>
        </div>
      </dl>
    </header>
  );
};
