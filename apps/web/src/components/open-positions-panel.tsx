import { Link } from "@tanstack/react-router";
import type { Market, OpenPosition } from "../lib/api";
import { formatNumber } from "../lib/format";

type OpenPositionsPanelProps = {
  positions: OpenPosition[];
  activeSymbol: string;
  markets: Market[];
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
  if (value > 0) return "positive";
  if (value < 0) return "sell";
  return "";
};

export const OpenPositionsPanel = ({
  positions,
  activeSymbol,
  markets,
  isLoading,
  error,
  onRetry,
  isAuthenticated,
}: OpenPositionsPanelProps) => {
  const marketBySymbol = new Map(markets.map((m) => [m.symbol, m]));

  return (
    <section className="panel positions-panel">
      <div className="panel-title-row">
        <h2>Open Positions</h2>
        <button className="text-button" type="button" onClick={onRetry}>
          Refresh
        </button>
      </div>

      <div className="positions-table-head">
        <span>Market</span>
        <span>Side</span>
        <span>Size</span>
        <span>Entry</span>
        <span>Margin</span>
        <span>Liq. price</span>
        <span className="align-right">Realized PnL</span>
      </div>

      {!isAuthenticated ? (
        <div className="positions-state">
          <Link to="/login">Sign in</Link> to view positions.
        </div>
      ) : null}

      {isAuthenticated && isLoading ? (
        <div className="positions-state" aria-live="polite">
          Loading positions...
        </div>
      ) : null}

      {isAuthenticated && error ? (
        <div className="positions-state error" aria-live="assertive">
          <p>{error}</p>
          <button type="button" className="text-button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {isAuthenticated && !isLoading && !error && positions.length === 0 ? (
        <div className="positions-state">No open positions</div>
      ) : null}

      {isAuthenticated && !isLoading && !error && positions.length > 0 ? (
        <div className="positions-table-body">
          {positions.map((position) => {
            const market = marketBySymbol.get(position.market);
            const priceScale = market?.priceScale ?? 2;
            const quantityScale = market?.quantityScale ?? 2;

            return (
              <div
                key={position.market}
                className={`positions-row ${position.market === activeSymbol ? "is-active" : ""}`}
                role="row"
              >
                <span className="positions-cell market">{position.market}</span>
                <span className={`positions-cell side ${position.side === "LONG" ? "buy" : "sell"}`}>
                  {position.side}
                </span>
                <span className="positions-cell">
                  {formatNumber(Math.abs(position.size), quantityScale)}
                </span>
                <span className="positions-cell">
                  {formatNumber(position.averageEntryPrice, priceScale)}
                </span>
                <span className="positions-cell">
                  {formatNumber(position.collateralUser, 2)}
                </span>
                <span className="positions-cell">
                  {formatNumber(position.estimatedLiquidationPrice, priceScale)}
                </span>
                <span className={`positions-cell align-right ${pnlClassName(position.realizedPnl)}`}>
                  {formatPnl(position.realizedPnl, 2)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
