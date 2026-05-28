import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchMarkets } from "../lib/api";

const MarketsComponent = () => {
  const marketsQuery = useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
  });

  return (
    <main className="markets-screen">
      <section className="panel markets-table">
        <div className="panel-title-row">
          <h2>All Markets</h2>
        </div>
        {marketsQuery.isLoading ? <p>Loading markets...</p> : null}
        {marketsQuery.error ? <p>Failed to load markets.</p> : null}
        {!marketsQuery.isLoading && !marketsQuery.error ? (
          <div className="market-table-rows">
            {marketsQuery.data?.map((market) => (
              <Link
                key={market.symbol}
                to="/trade/$symbol"
                params={{ symbol: market.symbol }}
                className="market-link"
              >
                <span>{market.symbol}-PERP</span>
                <span>{market.maxLeverage}x</span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
};

export const MarketsRouteView = {
  Component: MarketsComponent,
  fetchMarkets,
};
