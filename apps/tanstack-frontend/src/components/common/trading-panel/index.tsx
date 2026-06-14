import { useEffect, useState } from "react";
import { ORDER_TYPE, SIDE, type Side } from "@repo/sharedtypes";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { usePlaceOrder } from "#/hooks/use-place-order";
import { useTradingMarket } from "#/hooks/use-trading-market";
import { TRADING_MARKET } from "#/lib/market";
import {
  defaultLimitPriceDisplay,
  estimateCollateral,
  estimateNotional,
  isMarketBookMissing,
  resolveSubmitPrice,
  toApiQty,
} from "#/lib/trading/order-pricing";
import {
  canSubmitOrder,
  getOrderValidationMessage,
} from "#/lib/trading/order-validation";
import { MarginSummary } from "./margin-summary";
import { OrderFields } from "./order-fields";
import { OrderStats } from "./order-stats";
import { OrderTypeToggle } from "./order-type-toggle";
import { SubmitButtons } from "./submit-buttons";

export function TradingPanel() {
  const {
    isAuthenticated,
    availableMarginUsd,
    isBalanceLoading,
  } = useUser();
  const { bestBid, bestAsk, lastPrice, isLoading: isOrderbookLoading } =
    useTradingMarket();

  const [orderType, setOrderType] = useState(ORDER_TYPE.LIMIT_ORDER);
  const [orderSide, setOrderSide] = useState<Side>(SIDE.LONG);
  const [priceInput, setPriceInput] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [qtyInput, setQtyInput] = useState("");

  const prices = { bestBid, bestAsk, lastPrice };
  const displayQty = Number(qtyInput);
  const effectivePrice = resolveSubmitPrice(
    orderType,
    orderSide,
    priceInput,
    prices,
  );
  const apiQty = toApiQty(displayQty);
  const estimatedCollateral = estimateCollateral(effectivePrice, displayQty);
  const notional = estimateNotional(effectivePrice, displayQty);
  const marketBookMissing = isMarketBookMissing(orderType, orderSide, prices);

  const placeOrder = usePlaceOrder(() => setQtyInput(""));

  const validationMessage = getOrderValidationMessage({
    isAuthenticated,
    isOrderbookLoading,
    marketBookMissing,
    qtyInput,
    displayQty,
    orderType,
    priceInput,
    effectivePrice,
    estimatedCollateral,
    availableMarginUsd,
  });

  const canSubmit = canSubmitOrder({
    isAuthenticated,
    apiQty,
    effectivePrice,
    marketBookMissing,
    isPending: placeOrder.isPending,
    isOrderbookLoading,
  });

  useEffect(() => {
    if (priceTouched || orderType !== ORDER_TYPE.LIMIT_ORDER) return;
    const next = defaultLimitPriceDisplay(orderSide, prices);
    if (next) setPriceInput(next);
  }, [orderSide, lastPrice, bestBid, bestAsk, priceTouched, orderType]);

  const handleSubmit = (side: Side) => {
    setOrderSide(side);

    if (!isAuthenticated) return;
    if (!canSubmit || effectivePrice == null || apiQty == null) {
      if (validationMessage) {
        terminalToast.error("ERROR", validationMessage);
      }
      return;
    }

    placeOrder.mutate({
      market: TRADING_MARKET,
      side,
      qty: apiQty,
      orderType,
      price: effectivePrice,
    });
  };

  return (
    <div className="flex flex-1 flex-col justify-between border border-border p-4">
      <div className="flex flex-col gap-4">
        <MarginSummary
          isAuthenticated={isAuthenticated}
          isBalanceLoading={isBalanceLoading}
          availableMarginUsd={availableMarginUsd}
          estimatedCollateral={estimatedCollateral}
        />

        <OrderTypeToggle
          orderType={orderType}
          isAuthenticated={isAuthenticated}
          onSelectLimit={() => {
            setOrderType(ORDER_TYPE.LIMIT_ORDER);
            setPriceTouched(false);
          }}
          onSelectMarket={() => {
            setOrderType(ORDER_TYPE.MARKET_ORDER);
            setPriceTouched(false);
          }}
        />

        <OrderFields
          orderType={orderType}
          orderSide={orderSide}
          isAuthenticated={isAuthenticated}
          priceInput={priceInput}
          qtyInput={qtyInput}
          prices={prices}
          effectivePrice={effectivePrice}
          onPriceChange={(value) => {
            setPriceTouched(true);
            setPriceInput(value);
          }}
          onQtyChange={setQtyInput}
        />

        {validationMessage ? (
          <p className="px-4 text-xs text-accent">{validationMessage}</p>
        ) : null}

        <OrderStats
          estimatedCollateral={estimatedCollateral}
          notional={notional}
        />
      </div>

      <SubmitButtons
        canSubmit={canSubmit}
        isPending={placeOrder.isPending}
        orderSide={orderSide}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
