import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { createOrderSchema, ORDER_TYPE, SIDE } from "@repo/sharedtypes";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

export function TradingPanel() {
  const [orderType, setOrderType] = useState(ORDER_TYPE.LIMIT_ORDER);

  const orderForm = useForm({
    defaultValues: {
      price: 0,
      market: "BTC",
      side: SIDE.LONG,
      qty: 0,
      orderType: orderType,
    },
    validators: {
      onSubmit: createOrderSchema,
    },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  });

  return (
    <div className="flex-1 p-4 border border-border flex flex-col justify-between">
      <div className="flex flex-col gap-4">
        <div>
          <Button
            type="button"
            className={cn(
              "bg-transparent hover:text-foreground font-semibold tracking-wider cursor-pointer rounded-none underline-offset-4",
              orderType === ORDER_TYPE.LIMIT_ORDER
                ? "text-foreground underline decoration-accent underline-offset-8"
                : "text-input-label",
            )}
            onClick={() => {
              setOrderType(ORDER_TYPE.LIMIT_ORDER);
              orderForm.setFieldValue("orderType", ORDER_TYPE.LIMIT_ORDER);
            }}
          >
            LIMIT
          </Button>
          <Button
            type="button"
            className={cn(
              "bg-transparent hover:text-foreground font-semibold tracking-wider cursor-pointer rounded-none underline-offset-4",
              orderType === ORDER_TYPE.MARKET_ORDER
                ? "text-foreground underline decoration-accent underline-offset-8"
                : "text-input-label",
            )}
            onClick={() => {
              setOrderType(ORDER_TYPE.MARKET_ORDER);
              orderForm.setFieldValue("orderType", ORDER_TYPE.MARKET_ORDER);
            }}
          >
            MARKET
          </Button>
        </div>
        <form
          id="order-form"
          onSubmit={(e) => {
            e.preventDefault();
            orderForm.handleSubmit(e);
          }}
        >
          <FieldGroup className="flex flex-col gap-6 border-b border-b-border p-4 pb-8">
            {orderType === ORDER_TYPE.LIMIT_ORDER && (
              <orderForm.Field
                name="price"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched || !field.state.meta.isValid;
                  return (
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-input-label tracking-widest font-semibold"
                      >
                        PRICE
                      </FieldLabel>
                      <Input
                        className="bg-surface-container h-10 border-border"
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        type="number"
                        min={0}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                        aria-invalid={isInvalid}
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError
                          className="text-accent"
                          errors={field.state.meta.errors}
                        />
                      )}
                    </Field>
                  );
                }}
              />
            )}

            <orderForm.Field
              name="qty"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched || !field.state.meta.isValid;
                return (
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel
                      htmlFor={field.name}
                      className="text-input-label tracking-widest font-semibold"
                    >
                      SIZE
                    </FieldLabel>
                    <Input
                      className="bg-surface-container h-10 border-border"
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      type="number"
                      min={0}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      aria-invalid={isInvalid}
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError
                        className="text-accent"
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
        </form>

        <div className="p-4 flex gap-2 flex-col text-xs">
          <div className="flex justify-between">
            <span className="text-input-label">LEVERAGE</span>
            <span>10.00x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-input-label">LIQUIDATION PRICE</span>
            <span className="text-accent">55,241</span>
          </div>
          <div className="flex justify-between">
            <span className="text-input-label">EST. FEE</span>
            <span>0.00045 USD</span>
          </div>
        </div>
      </div>

      <div className="flex mb-4 gap-2 text-xs tracking-widest">
        <Button
          type="submit"
          form="order-form"
          className="bg-trading-green font-bold tracking-widest flex-1 text-black"
          onClick={() => orderForm.setFieldValue("side", SIDE.LONG)}
        >
          BUY / LONG
        </Button>
        <Button
          type="submit"
          form="order-form"
          className="bg-accent flex-1 font-bold"
          onClick={() => orderForm.setFieldValue("side", SIDE.SHORT)}
        >
          SELL / SHORT
        </Button>
      </div>
    </div>
  );
}
