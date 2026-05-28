import { Link } from "@tanstack/react-router";
import type { Market } from "../lib/api";

type MarketsSidebarProps = {
  markets: Market[];
  activeSymbol: string;
};

export const MarketsSidebar = ({ markets, activeSymbol }: MarketsSidebarProps) => {
  return (
    <aside className="markets-sidebar">
      <div className="search-wrap">
        <input placeholder="Search Coin" aria-label="Search coin" />
      </div>
      <div className="panel-title-row">
        <h2>USDT Markets</h2>
      </div>
      <div className="market-list" role="list" aria-label="Markets list">
        {markets.map((market) => (
          <Link
            key={market.symbol}
            to="/trade/$symbol"
            params={{ symbol: market.symbol }}
            className={`market-link ${activeSymbol === market.symbol ? "market-link-active" : ""}`}
          >
            <div>
              <strong>{market.symbol}/USDT</strong>
              <span>Perp</span>
            </div>
            <span className="positive">{market.maxLeverage}x</span>
          </Link>
        ))}
      </div>
    </aside>
  );
};
