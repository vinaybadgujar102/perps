import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAccount } from "@/hooks/queries/use-account";
import { useCreateOrder } from "@/hooks/queries/use-create-order";
import { useDeposit } from "@/hooks/queries/use-deposit";
import type { CreateOrderInput, Market, OrderSide, OrderType } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth-store";
import { useTradeUiStore } from "@/stores/trade-ui-store";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
  const { orderSide, orderType, setOrderSide, setOrderType } = useTradeUiStore();
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [qtyInput, setQtyInput] = useState("");

  const accountQuery = useAccount(user?.id, isAuthenticated);
  const depositMutation = useDeposit(user?.id);
  const orderMutation = useCreateOrder(user?.id);

  useEffect(() => {
    if (priceTouched || orderType !== "LIMIT_ORDER") return;
    const next = defaultLimitPrice(orderSide, lastPrice, bestBid, bestAsk);
    if (next) setPriceInput(next);
  }, [orderSide, lastPrice, bestBid, bestAsk, priceTouched, orderType]);

  const qty = Number(qtyInput);
  const effectivePrice = useMemo(
    () => resolveSubmitPrice(orderType, orderSide, priceInput, lastPrice, bestBid, bestAsk),
    [orderType, orderSide, priceInput, lastPrice, bestBid, bestAsk],
  );

  const availableMarginUsd = accountQuery.data?.availableMarginUsd ?? 0;
  const hasBalance = availableMarginUsd > 0;

  const estimatedCollateral =
    effectivePrice != null && Number.isFinite(qty) && qty > 0
      ? (effectivePrice * qty) / market.maxLeverage
      : null;

  const marketBookMissing =
    orderType === "market_order" &&
    (orderSide === "LONG"
      ? bestAsk == null && lastPrice == null
      : bestBid == null && lastPrice == null);

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
    depositMutation.mutate(amountUsd, {
      onSuccess: () => {
        toast.success("Deposit confirmed");
        setDepositOpen(false);
        setDepositAmountInput("");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Deposit failed");
      },
    });
  };

  const handleSubmitOrder = () => {
    if (!canSubmit || effectivePrice == null) return;

    const input: CreateOrderInput = {
      market: market.symbol,
      side: orderSide,
      qty,
      orderType,
      price: effectivePrice,
    };

    orderMutation.mutate(input, {
      onSuccess: (result) => {
        const fillCount = result.fills.length;
        const fillNote = fillCount > 0 ? ` (${fillCount} fill${fillCount === 1 ? "" : "s"})` : "";
        toast.success(`${result.message ?? "Order placed"}${fillNote}`);
        setQtyInput("");
        onOrderPlaced();
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Order failed");
      },
    });
  };

  const submitLabel = orderSide === "LONG" ? "Buy Long" : "Sell Short";
  const qtyPlaceholder = `0.${"0".repeat(market.quantityScale)} ${market.symbol}`;

  return (
    <>
      <Card>
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Spot / Perps
          </CardTitle>
          {isAuthenticated && accountQuery.data ? (
            <p className="text-xs text-muted-foreground">
              Available:{" "}
              <span className="font-mono tabular-nums">
                ${formatNumber(accountQuery.data.availableMarginUsd)}
              </span>
              {estimatedCollateral != null ? (
                <span className="font-mono tabular-nums">
                  {" "}
                  · Est. margin: ${formatNumber(estimatedCollateral)}
                </span>
              ) : null}
            </p>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          <ToggleGroup
            type="single"
            value={orderSide}
            onValueChange={(value) => value && setOrderSide(value as OrderSide)}
            className="grid grid-cols-2 gap-2"
            disabled={!isAuthenticated}
          >
            <ToggleGroupItem
              value="LONG"
              className={cn(
                "h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
              )}
            >
              Buy
            </ToggleGroupItem>
            <ToggleGroupItem
              value="SHORT"
              className={cn(
                "h-10 data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground",
              )}
            >
              Sell
            </ToggleGroupItem>
          </ToggleGroup>

          <Tabs
            value={orderType}
            onValueChange={(value) => setOrderType(value as OrderType)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="LIMIT_ORDER" disabled={!isAuthenticated}>
                Limit
              </TabsTrigger>
              <TabsTrigger value="market_order" disabled={!isAuthenticated}>
                Market
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {orderType === "LIMIT_ORDER" ? (
              <div className="space-y-2">
                <Label htmlFor="priceInput">Price</Label>
                <Input
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
                  className="font-mono tabular-nums"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Market price:{" "}
                <span className="font-mono tabular-nums">
                  {orderSide === "LONG"
                    ? bestAsk != null
                      ? formatNumber(bestAsk, market.priceScale)
                      : lastPrice != null
                        ? formatNumber(lastPrice, market.priceScale)
                        : "—"
                    : bestBid != null
                      ? formatNumber(bestBid, market.priceScale)
                      : lastPrice != null
                        ? formatNumber(lastPrice, market.priceScale)
                        : "—"}
                </span>{" "}
                USDT
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="sizeInput">Amount</Label>
              <Input
                id="sizeInput"
                type="number"
                min="0"
                step="any"
                placeholder={qtyPlaceholder}
                value={qtyInput}
                onChange={(event) => setQtyInput(event.target.value)}
                disabled={!isAuthenticated}
                className="font-mono tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="levInput">Leverage</Label>
              <Input
                id="levInput"
                value={`${market.maxLeverage}x`}
                readOnly
                className="font-mono tabular-nums"
              />
            </div>

            {!isAuthenticated ? (
              <p className="text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>{" "}
                to place orders.
              </p>
            ) : null}

            {validationMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {validationMessage}
              </p>
            ) : null}

            <Button
              type="button"
              className={cn(
                "w-full",
                orderSide === "LONG"
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-destructive hover:bg-destructive/90",
              )}
              disabled={!canSubmit}
              onClick={handleSubmitOrder}
            >
              {orderMutation.isPending ? "Placing order..." : submitLabel}
            </Button>

            {isAuthenticated ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setDepositOpen(true)}
              >
                Deposit
              </Button>
            ) : (
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Deposit</Link>
              </Button>
            )}

            {!hasBalance && isAuthenticated ? (
              <p className="text-sm text-muted-foreground">
                Insufficient balance. Deposit to start trading.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit funds</DialogTitle>
            <DialogDescription>Add USD to your trading account via onramp.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Deposit amount (USD)</Label>
              <Input
                id="depositAmount"
                type="number"
                min="1"
                step="1"
                placeholder="Enter amount"
                value={depositAmountInput}
                onChange={(event) => setDepositAmountInput(event.target.value)}
                className="font-mono tabular-nums"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {DEPOSIT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmountInput(String(preset))}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={depositMutation.isPending || !depositAmountInput}
            >
              {depositMutation.isPending ? "Depositing..." : "Confirm deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
