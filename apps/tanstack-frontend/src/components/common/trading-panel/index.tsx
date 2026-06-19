import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { ORDER_TYPE, SIDE, calculateLiquidationPrice, type Side } from "@repo/sharedtypes";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { usePlaceOrder } from "#/hooks/use-place-order";
import { useTradingMarket } from "#/hooks/use-trading-market";
import { TRADING_MARKET, marketConfig, sanitizeScaledDecimalInput } from "#/lib/market";
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
import {
  createTradingFormSchema,
  type TradingFormValues,
} from "#/lib/trading/trading-form";
import { MarginSummary } from "./margin-summary";
import { OrderFields, type OrderFieldsForm } from "./order-fields";
import { OrderStats } from "./order-stats";
import { OrderTypeToggle } from "./order-type-toggle";
import { SubmitButtons } from "./submit-buttons";
import { Slider } from "#/components/ui/slider";

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
  const [leverage, setLeverage] = useState(marketConfig.maxLeverage);
  const [priceTouched, setPriceTouched] = useState(false);
  const pendingSideRef = useRef<Side>(SIDE.LONG);

  const prices = { bestBid, bestAsk, lastPrice };

  const tradingForm = useForm({
    defaultValues: {
      price: "",
      qty: "",
    } satisfies TradingFormValues,
    validators: {
      onSubmit: ({ value }) => {
        const result = createTradingFormSchema(orderType).safeParse(value);
        if (!result.success) {
          return result.error.flatten().fieldErrors;
        }
      },
    },
    onSubmit: async ({ value }) => {
      submitOrderRef.current(pendingSideRef.current, value);
    },
  });

  const placeOrder = usePlaceOrder(() => {
    tradingForm.setFieldValue("qty", "");
  });

  const submitOrderRef = useRef<
    (side: Side, value: TradingFormValues) => void
  >(() => {});

  submitOrderRef.current = (side, value) => {
    setOrderSide(side);

    const displayQty = Number(value.qty);
    const effectivePrice = resolveSubmitPrice(
      orderType,
      side,
      value.price,
      prices,
    );
    const apiQty = toApiQty(displayQty);
    const estimatedCollateral = estimateCollateral(
      effectivePrice,
      displayQty,
      leverage,
    );
    const bookMissing = isMarketBookMissing(orderType, side, prices);

    const validationMessage = getOrderValidationMessage({
      isAuthenticated,
      isOrderbookLoading,
      marketBookMissing: bookMissing,
      qtyInput: value.qty,
      displayQty,
      orderType,
      priceInput: value.price,
      effectivePrice,
      estimatedCollateral,
      availableMarginUsd,
    });

    const canSubmit = canSubmitOrder({
      isAuthenticated,
      apiQty,
      effectivePrice,
      marketBookMissing: bookMissing,
      isPending: placeOrder.isPending,
      isOrderbookLoading,
    });

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
      leverage,
    });
  };

  const priceInput = tradingForm.state.values.price;
  const qtyInput = tradingForm.state.values.qty;
  const displayQty = Number(qtyInput);
  const effectivePrice = resolveSubmitPrice(
    orderType,
    orderSide,
    priceInput,
    prices,
  );
  const apiQty = toApiQty(displayQty);
  const estimatedCollateral = estimateCollateral(
    effectivePrice,
    displayQty,
    leverage,
  );
  const notional = estimateNotional(effectivePrice, displayQty);
  const estimatedLiquidationPrice =
    effectivePrice != null && apiQty != null && apiQty > 0
      ? calculateLiquidationPrice(orderSide, {
          qty: apiQty,
          averageEntryPrice: effectivePrice,
          collateral: (effectivePrice * apiQty) / leverage,
        })
      : null;
  const marketBookMissing = isMarketBookMissing(orderType, orderSide, prices);

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
    if (next) {
      tradingForm.setFieldValue(
        "price",
        sanitizeScaledDecimalInput(next, marketConfig.priceScale),
      );
    }
  }, [
    orderSide,
    lastPrice,
    bestBid,
    bestAsk,
    priceTouched,
    orderType,
    tradingForm,
  ]);

  const handleSubmit = (side: Side) => {
    pendingSideRef.current = side;
    void tradingForm.handleSubmit();
  };

  return (
    <div className="flex flex-1 flex-col justify-between border border-border p-4">
      <form
        id="trading-form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
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
            form={tradingForm as unknown as OrderFieldsForm}
            orderType={orderType}
            orderSide={orderSide}
            isAuthenticated={isAuthenticated}
            prices={prices}
            effectivePrice={effectivePrice}
            onPriceTouched={() => setPriceTouched(true)}
          />

          <div className="flex flex-col gap-2 px-4">
            <div className="flex items-center justify-between text-xs">
              <span className="nav-label text-[10px] font-semibold tracking-widest text-input-label">
                LEVERAGE
              </span>
              <span className="font-mono tabular-nums">{leverage}x</span>
            </div>
            <Slider
              min={1}
              max={marketConfig.maxLeverage}
              step={1}
              value={[leverage]}
              disabled={!isAuthenticated}
              onValueChange={(value) => {
                const next = value[0];
                if (next != null) setLeverage(next);
              }}
            />
          </div>

          {validationMessage ? (
            <p className="px-4 text-xs text-accent">{validationMessage}</p>
          ) : null}

          <OrderStats
            estimatedCollateral={estimatedCollateral}
            notional={notional}
            estimatedLiquidationPrice={estimatedLiquidationPrice}
          />
        </div>
      </form>

      <SubmitButtons
        canSubmit={canSubmit}
        isPending={placeOrder.isPending}
        orderSide={orderSide}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
