import { ORDER_TYPE, type Side } from "@repo/sharedtypes";
import { Input } from "#/components/ui/input";
import {
  formatDisplayPrice,
  marketConfig,
  qtyInputPlaceholder,
  unscalePriceFromApi,
} from "#/lib/market";
import {
  defaultLimitPriceDisplay,
  type MarketPrices,
} from "#/lib/trading/order-pricing";

type OrderFieldsProps = {
  orderType: ORDER_TYPE;
  orderSide: Side;
  isAuthenticated: boolean;
  priceInput: string;
  qtyInput: string;
  prices: MarketPrices;
  effectivePrice: number | null;
  onPriceChange: (value: string) => void;
  onQtyChange: (value: string) => void;
};

export function OrderFields({
  orderType,
  orderSide,
  isAuthenticated,
  priceInput,
  qtyInput,
  prices,
  effectivePrice,
  onPriceChange,
  onQtyChange,
}: OrderFieldsProps) {
  const { priceScale, quantityScale } = marketConfig;

  return (
    <div className="flex flex-col gap-6 border-b border-b-border p-4 pb-8">
      {orderType === ORDER_TYPE.LIMIT_ORDER ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="price"
            className="nav-label text-[10px] font-semibold tracking-widest text-input-label"
          >
            PRICE
          </label>
          <Input
            id="price"
            type="number"
            min={0}
            step={1 / 10 ** priceScale}
            value={priceInput}
            onChange={(event) => onPriceChange(event.target.value)}
            placeholder={
              prices.lastPrice != null
                ? defaultLimitPriceDisplay(orderSide, prices)
                : "0.00"
            }
            disabled={!isAuthenticated}
            className="h-10 border-border bg-surface-container font-mono tabular-nums"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="nav-label text-[10px] font-semibold tracking-widest text-input-label">
            EXECUTION PRICE
          </span>
          <span className="font-mono text-sm tabular-nums text-foreground">
            {effectivePrice != null
              ? `${formatDisplayPrice(unscalePriceFromApi(effectivePrice))} USD`
              : "—"}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="qty"
          className="nav-label text-[10px] font-semibold tracking-widest text-input-label"
        >
          SIZE
        </label>
        <Input
          id="qty"
          type="number"
          min={0}
          step={1 / 10 ** quantityScale}
          value={qtyInput}
          onChange={(event) => onQtyChange(event.target.value)}
          placeholder={qtyInputPlaceholder()}
          disabled={!isAuthenticated}
          className="h-10 border-border bg-surface-container font-mono tabular-nums"
        />
      </div>
    </div>
  );
}
