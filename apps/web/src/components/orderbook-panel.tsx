import type { OrderbookData } from "../lib/api";
import { formatNumber } from "../lib/format";

type OrderbookPanelProps = {
  orderbook: OrderbookData;
  priceScale: number;
  quantityScale: number;
  isLoading: boolean;
  onRetry: () => void;
  error: string | null;
};

const renderRow = (price: number, qty: number, side: "bid" | "ask", priceScale: number, qtyScale: number) => (
  <div className={`orderbook-row ${side}`} key={`${side}-${price}-${qty}`}>
    <span>{formatNumber(price, priceScale)}</span>
    <span>{formatNumber(qty, qtyScale)}</span>
    <span>{formatNumber(price * qty, 2)}</span>
  </div>
);

export const OrderbookPanel = ({
  orderbook,
  priceScale,
  quantityScale,
  isLoading,
  onRetry,
  error,
}: OrderbookPanelProps) => {
  const safeOrderbook = orderbook ?? {
    bids: [],
    asks: [],
    bestBid: null,
    bestAsk: null,
  };
  const bids = safeOrderbook.bids;
  const asks = safeOrderbook.asks;

  return (
    <section className="panel orderbook-panel">
      <div className="panel-title-row">
        <h2>Orderbook</h2>
        <button className="text-button" type="button" onClick={onRetry}>
          Refresh
        </button>
      </div>
      <div className="orderbook-head">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      {isLoading ? (
        <div className="orderbook-loading" aria-live="polite">
          Loading orderbook...
        </div>
      ) : null}
      {error ? (
        <div className="orderbook-error" aria-live="assertive">
          <p>{error}</p>
        </div>
      ) : null}
      {!isLoading && !error && bids.length === 0 && asks.length === 0 ? (
        <div className="orderbook-empty">No orderbook depth available.</div>
      ) : null}
      <div className="orderbook-body">
        <div className="asks-list">
          {asks.slice(0, 12).map((level) =>
            renderRow(level.price, level.qty, "ask", priceScale, quantityScale),
          )}
        </div>
        <div className="spread-row">
          Spread:{" "}
          {safeOrderbook.bestAsk && safeOrderbook.bestBid
            ? formatNumber(safeOrderbook.bestAsk.price - safeOrderbook.bestBid.price, priceScale)
            : "--"}
        </div>
        <div className="bids-list">
          {bids.slice(0, 12).map((level) =>
            renderRow(level.price, level.qty, "bid", priceScale, quantityScale),
          )}
        </div>
      </div>
    </section>
  );
};
