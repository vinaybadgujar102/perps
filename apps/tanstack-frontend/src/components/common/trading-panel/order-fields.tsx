import { ORDER_TYPE, type Side } from "@repo/sharedtypes";
import type { ReactNode } from "react";
import { Input } from "#/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import {
  formatDisplayPrice,
  getMarketConfig,
  priceInputPlaceholder,
  qtyInputPlaceholder,
  sanitizeScaledDecimalInput,
  unscalePriceFromApi,
} from "#/lib/market";
import type { TradingFormValues } from "#/lib/trading/trading-form";
import {
  defaultLimitPriceDisplay,
  type MarketPrices,
} from "#/lib/trading/order-pricing";

export type TradingFieldApi = {
  name: string;
  state: {
    value: string;
    meta: {
      isTouched: boolean;
      isValid: boolean;
      errors: Array<{ message?: string } | undefined>;
    };
  };
  handleBlur: () => void;
  handleChange: (value: string) => void;
};

export type OrderFieldsForm = {
  Field: (props: {
    name: keyof TradingFormValues;
    children: (field: TradingFieldApi) => ReactNode;
  }) => ReactNode;
};

type OrderFieldsProps = {
  form: OrderFieldsForm;
  orderType: ORDER_TYPE;
  orderSide: Side;
  market: string;
  isAuthenticated: boolean;
  prices: MarketPrices;
  effectivePrice: number | null;
  onPriceTouched: () => void;
};

export function OrderFields({
  form,
  orderType,
  orderSide,
  market,
  isAuthenticated,
  prices,
  effectivePrice,
  onPriceTouched,
}: OrderFieldsProps) {
  const { priceScale, quantityScale } = getMarketConfig(market);

  return (
    <FieldGroup className="flex flex-col gap-6 border-b border-b-border p-4 pb-8">
      {orderType === ORDER_TYPE.LIMIT_ORDER ? (
        <form.Field
          name="price"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field
                className="flex flex-col gap-1.5"
                data-invalid={isInvalid}
              >
                <FieldLabel
                  htmlFor={field.name}
                  className="nav-label text-[10px] font-semibold tracking-widest text-input-label"
                >
                  PRICE
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    onPriceTouched();
                    field.handleChange(
                      sanitizeScaledDecimalInput(
                        event.target.value,
                        priceScale,
                      ),
                    );
                  }}
                  placeholder={
                    prices.lastPrice != null
                      ? defaultLimitPriceDisplay(orderSide, prices, market)
                      : priceInputPlaceholder(market)
                  }
                  disabled={!isAuthenticated}
                  aria-invalid={isInvalid}
                  className="h-10 border-border bg-surface-container font-mono tabular-nums"
                />
                {isInvalid ? (
                  <FieldError
                    className="text-xs text-accent"
                    errors={field.state.meta.errors}
                  />
                ) : null}
              </Field>
            );
          }}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="nav-label text-[10px] font-semibold tracking-widest text-input-label">
            EXECUTION PRICE
          </span>
          <span className="font-mono text-sm tabular-nums text-foreground">
            {effectivePrice != null
              ? `${formatDisplayPrice(unscalePriceFromApi(effectivePrice, market), market)} USD`
              : "—"}
          </span>
        </div>
      )}

      <form.Field
        name="qty"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field className="flex flex-col gap-1.5" data-invalid={isInvalid}>
              <FieldLabel
                htmlFor={field.name}
                className="nav-label text-[10px] font-semibold tracking-widest text-input-label"
              >
                SIZE
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(
                    sanitizeScaledDecimalInput(
                      event.target.value,
                      quantityScale,
                    ),
                  )
                }
                placeholder={qtyInputPlaceholder(market)}
                disabled={!isAuthenticated}
                aria-invalid={isInvalid}
                className="h-10 border-border bg-surface-container font-mono tabular-nums"
              />
              {isInvalid ? (
                <FieldError
                  className="text-xs text-accent"
                  errors={field.state.meta.errors}
                />
              ) : null}
            </Field>
          );
        }}
      />
    </FieldGroup>
  );
}
