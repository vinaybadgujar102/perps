import { Link } from "@tanstack/react-router";
import type { Market } from "../lib/api";

type MarketsSidebarProps = {
  markets: Market[];
  activeSymbol: string;
};

export const MarketsSidebar = ({ markets, activeSymbol }: MarketsSidebarProps) => {
  return (
    <aside className="panel markets-sidebar">
      <div className="panel-title-row">
        <h2>Markets</h2>
      </div>
      <div className="market-list" role="list">
        {markets.map((market) => (
          <Link
            key={market.symbol}
            to="/trade/$symbol"
            params={{ symbol: market.symbol }}
            className={`market-link ${activeSymbol === market.symbol ? "market-link-active" : ""}`}
          >
            <span>{market.symbol}-PERP</span>
            <span>{market.maxLeverage}x</span>
          </Link>
        ))}
      </div>
    </aside>
  );
};
