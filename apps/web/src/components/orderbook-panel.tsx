import { useMemo } from "react";
import type { OrderbookData } from "../lib/api";
import { formatNumber } from "../lib/format";
import {
  ORDERBOOK_LEVELS,
  withCumulativeTotals,
  type DisplayLevel,
} from "../lib/orderbook-utils";

type OrderbookPanelProps = {
  symbol: string;
  orderbook: OrderbookData | null;
  priceScale: number;
  quantityScale: number;
  lastPrice: number | null;
  isLoading: boolean;
  onRetry: () => void;
  error: string | null;
};

const OrderbookRow = ({
  level,
  side,
  priceScale,
  quantityScale,
}: {
  level: DisplayLevel;
  side: "bid" | "ask";
  priceScale: number;
  quantityScale: number;
}) => (
  <div className={`orderbook-row-v2 ${side}`} role="row">
    <span className="orderbook-cell price">{formatNumber(level.price, priceScale)}</span>
    <span className="orderbook-cell size">{formatNumber(level.qty, quantityScale)}</span>
    <span className="orderbook-cell total">
      <span
        className="orderbook-row-depth"
        style={{ width: `${level.depthPct}%` }}
        aria-hidden="true"
      />
      {formatNumber(level.total, quantityScale)}
    </span>
  </div>
);

export const OrderbookPanel = ({
  symbol,
  orderbook,
  priceScale,
  quantityScale,
  lastPrice,
  isLoading,
  onRetry,
  error,
}: OrderbookPanelProps) => {
  const { asks, bids } = useMemo(() => {
    const rawAsks = orderbook?.asks.slice(0, ORDERBOOK_LEVELS) ?? [];
    const rawBids = orderbook?.bids.slice(0, ORDERBOOK_LEVELS) ?? [];

    return {
      asks: withCumulativeTotals([...rawAsks].reverse()),
      bids: withCumulativeTotals(rawBids),
    };
  }, [orderbook]);

  const midPrice =
    lastPrice ??
    (orderbook?.bestAsk && orderbook?.bestBid
      ? (orderbook.bestAsk.price + orderbook.bestBid.price) / 2
      : null);

  return (
    <section className="panel orderbook-panel">
      <div className="panel-title-row">
        <h2>Orderbook</h2>
        <button className="text-button" type="button" onClick={onRetry}>
          Refresh
        </button>
      </div>

      <div className="orderbook-table-head">
        <span>Price (USD)</span>
        <span>Size ({symbol})</span>
        <span className="align-right">Total ({symbol})</span>
      </div>

      {isLoading ? (
        <div className="orderbook-state" aria-live="polite">
          Loading orderbook...
        </div>
      ) : null}

      {error ? (
        <div className="orderbook-state error" aria-live="assertive">
          <p>{error}</p>
          <button type="button" className="text-button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="orderbook-table">
          <div className="orderbook-side asks">
            {asks.length === 0 ? (
              <div className="orderbook-side-empty">No asks</div>
            ) : (
              asks.map((level) => (
                <OrderbookRow
                  key={`ask-${level.price}`}
                  level={level}
                  side="ask"
                  priceScale={priceScale}
                  quantityScale={quantityScale}
                />
              ))
            )}
          </div>

          <div className="orderbook-mid">
            {midPrice !== null ? formatNumber(midPrice, priceScale) : "--"}
          </div>

          <div className="orderbook-side bids">
            {bids.length === 0 ? (
              <div className="orderbook-side-empty">No bids</div>
            ) : (
              bids.map((level) => (
                <OrderbookRow
                  key={`bid-${level.price}`}
                  level={level}
                  side="bid"
                  priceScale={priceScale}
                  quantityScale={quantityScale}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};
