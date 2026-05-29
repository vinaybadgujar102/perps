import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/auth-context";
import {
  createOnrampDeposit,
  createOrder,
  fetchAccountState,
  type CreateOrderInput,
  type Market,
  type OrderSide,
  type OrderType,
} from "../lib/api";
import { formatNumber } from "../lib/format";

const DEPOSIT_PRESETS = [100, 500, 1000];

type TradePanelProps = {
  market: Market;
  lastPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  onOrderPlaced: () => void;
};

const defaultLimitPrice = (
  side: OrderSide,
  lastPrice: number | null,
  bestBid: number | null,
  bestAsk: number | null,
): string => {
  if (side === "LONG" && bestAsk != null) return String(bestAsk);
  if (side === "SHORT" && bestBid != null) return String(bestBid);
  if (lastPrice != null) return String(lastPrice);
  return "";
};

const resolveSubmitPrice = (
  orderType: OrderType,
  side: OrderSide,
  priceInput: string,
  lastPrice: number | null,
  bestBid: number | null,
  bestAsk: number | null,
): number | null => {
  if (orderType === "LIMIT_ORDER") {
    const price = Number(priceInput);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  if (side === "LONG") {
    const price = bestAsk ?? lastPrice;
    return price != null && price > 0 ? price : null;
  }

  const price = bestBid ?? lastPrice;
  return price != null && price > 0 ? price : null;
};

export const TradePanel = ({
  market,
  lastPrice,
  bestBid,
  bestAsk,
  onOrderPlaced,
}: TradePanelProps) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [side, setSide] = useState<OrderSide>("LONG");
  const [orderType, setOrderType] = useState<OrderType>("LIMIT_ORDER");
  const [priceInput, setPriceInput] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [qtyInput, setQtyInput] = useState("");
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const accountQuery = useQuery({
    queryKey: ["account", user?.id],
    queryFn: () => fetchAccountState(user!.id),
    enabled: isAuthenticated && Boolean(user?.id),
  });

  const depositMutation = useMutation({
    mutationFn: (amountUsd: number) => createOnrampDeposit(amountUsd),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account", user?.id] });
      setShowDepositForm(false);
      setDepositAmountInput("");
    },
  });

  const orderMutation = useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (result) => {
      const fillCount = result.fills.length;
      const fillNote = fillCount > 0 ? ` (${fillCount} fill${fillCount === 1 ? "" : "s"})` : "";
      setOrderFeedback({
        type: "success",
        text: `${result.message ?? "Order placed"}${fillNote}`,
      });
      setQtyInput("");
      onOrderPlaced();
    },
    onError: (error) => {
      setOrderFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Order failed",
      });
    },
  });

  useEffect(() => {
    if (priceTouched || orderType !== "LIMIT_ORDER") return;
    const next = defaultLimitPrice(side, lastPrice, bestBid, bestAsk);
    if (next) setPriceInput(next);
  }, [side, lastPrice, bestBid, bestAsk, priceTouched, orderType]);

  const qty = Number(qtyInput);
  const effectivePrice = useMemo(
    () => resolveSubmitPrice(orderType, side, priceInput, lastPrice, bestBid, bestAsk),
    [orderType, side, priceInput, lastPrice, bestBid, bestAsk],
  );

  const availableMarginUsd = accountQuery.data?.availableMarginUsd ?? 0;
  const hasBalance = availableMarginUsd > 0;

  const estimatedCollateral =
    effectivePrice != null && Number.isFinite(qty) && qty > 0
      ? (effectivePrice * qty) / market.maxLeverage
      : null;

  const marketBookMissing =
    orderType === "market_order" &&
    (side === "LONG" ? bestAsk == null && lastPrice == null : bestBid == null && lastPrice == null);

  const canSubmit =
    isAuthenticated &&
    Number.isFinite(qty) &&
    qty > 0 &&
    effectivePrice != null &&
    !marketBookMissing &&
    !orderMutation.isPending;

  const validationMessage = useMemo(() => {
    if (!isAuthenticated) return null;
    if (marketBookMissing) return "Orderbook price unavailable for market order.";
    if (!qtyInput || !Number.isFinite(qty) || qty <= 0) return null;
    if (orderType === "LIMIT_ORDER" && (!priceInput || effectivePrice == null)) {
      return "Enter a valid limit price.";
    }
    return null;
  }, [isAuthenticated, marketBookMissing, qtyInput, qty, orderType, priceInput, effectivePrice]);

  const handleDeposit = () => {
    const amountUsd = Number(depositAmountInput);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
    depositMutation.mutate(amountUsd);
  };

  const handleSubmitOrder = () => {
    setOrderFeedback(null);
    if (!canSubmit || effectivePrice == null) return;

    const input: CreateOrderInput = {
      market: market.symbol,
      side,
      qty,
      orderType,
      price: effectivePrice,
    };

    orderMutation.mutate(input);
  };

  const submitLabel = side === "LONG" ? "Buy Long" : "Sell Short";
  const qtyPlaceholder = `0.${"0".repeat(market.quantityScale)} ${market.symbol}`;

  return (
    <section className="panel trade-panel">
      <div className="panel-title-row trade-head">
        <h2>Spot / Perps</h2>
        {isAuthenticated && accountQuery.data && (
          <p className="trade-balance">
            Available: ${formatNumber(accountQuery.data.availableMarginUsd)}
            {estimatedCollateral != null && (
              <span className="trade-margin-est">
                {" "}
                · Est. margin: ${formatNumber(estimatedCollateral)}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="trade-tabs buy-sell">
        <button
          type="button"
          className={`buy ${side === "LONG" ? "active" : ""}`}
          onClick={() => setSide("LONG")}
          disabled={!isAuthenticated}
        >
          Buy
        </button>
        <button
          type="button"
          className={`sell ${side === "SHORT" ? "active" : ""}`}
          onClick={() => setSide("SHORT")}
          disabled={!isAuthenticated}
        >
          Sell
        </button>
      </div>
      <div className="inline-tabs order-kind">
        <button
          type="button"
          className={orderType === "LIMIT_ORDER" ? "is-active" : ""}
          onClick={() => setOrderType("LIMIT_ORDER")}
          disabled={!isAuthenticated}
        >
          Limit
        </button>
        <button
          type="button"
          className={orderType === "market_order" ? "is-active" : ""}
          onClick={() => setOrderType("market_order")}
          disabled={!isAuthenticated}
        >
          Market
        </button>
      </div>
      <div className="trade-form">
        {orderType === "LIMIT_ORDER" ? (
          <>
            <label htmlFor="priceInput">Price</label>
            <input
              id="priceInput"
              type="number"
              min="0"
              step="any"
              placeholder="USDT"
              value={priceInput}
              onChange={(event) => {
                setPriceTouched(true);
                setPriceInput(event.target.value);
              }}
              disabled={!isAuthenticated}
            />
          </>
        ) : (
          <p className="trade-market-price-hint">
            Market price:{" "}
            {side === "LONG"
              ? bestAsk != null
                ? formatNumber(bestAsk, market.priceScale)
                : lastPrice != null
                  ? formatNumber(lastPrice, market.priceScale)
                  : "—"
              : bestBid != null
                ? formatNumber(bestBid, market.priceScale)
                : lastPrice != null
                  ? formatNumber(lastPrice, market.priceScale)
                  : "—"}{" "}
            USDT
          </p>
        )}
        <label htmlFor="sizeInput">Amount</label>
        <input
          id="sizeInput"
          type="number"
          min="0"
          step="any"
          placeholder={qtyPlaceholder}
          value={qtyInput}
          onChange={(event) => setQtyInput(event.target.value)}
          disabled={!isAuthenticated}
        />
        <label htmlFor="levInput">Leverage</label>
        <input id="levInput" value={`${market.maxLeverage}x`} readOnly />
        {!isAuthenticated ? (
          <p className="trade-warning">
            <Link to="/login">Sign in</Link> to place orders.
          </p>
        ) : null}
        {validationMessage ? <p className="trade-warning">{validationMessage}</p> : null}
        {orderFeedback ? (
          <p className={orderFeedback.type === "success" ? "trade-success" : "trade-warning"}>
            {orderFeedback.text}
          </p>
        ) : null}
        <button
          type="button"
          className={`primary-button ${side === "LONG" ? "buy" : "sell"}`}
          disabled={!canSubmit}
          onClick={handleSubmitOrder}
        >
          {orderMutation.isPending ? "Placing order..." : submitLabel}
        </button>
        {isAuthenticated ? (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowDepositForm((open) => !open)}
            >
              {showDepositForm ? "Cancel Deposit" : "Deposit"}
            </button>
            {showDepositForm && (
              <div className="deposit-form">
                <label htmlFor="depositAmount">Deposit amount (USD)</label>
                <input
                  id="depositAmount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter amount"
                  value={depositAmountInput}
                  onChange={(event) => setDepositAmountInput(event.target.value)}
                />
                <div className="deposit-presets">
                  {DEPOSIT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="text-button"
                      onClick={() => setDepositAmountInput(String(preset))}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={depositMutation.isPending || !depositAmountInput}
                  onClick={handleDeposit}
                >
                  {depositMutation.isPending ? "Depositing..." : "Confirm Deposit"}
                </button>
                {depositMutation.error && (
                  <p className="trade-warning">{depositMutation.error.message}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <Link to="/login" className="secondary-button trade-deposit-link">
            Deposit
          </Link>
        )}
        {!hasBalance && isAuthenticated && !showDepositForm && (
          <p className="trade-warning">Insufficient balance. Deposit to start trading.</p>
        )}
      </div>
    </section>
  );
};
