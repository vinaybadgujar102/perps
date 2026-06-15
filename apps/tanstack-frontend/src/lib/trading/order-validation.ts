import { ORDER_TYPE } from "@repo/sharedtypes";

export type OrderValidationInput = {
  isAuthenticated: boolean;
  isOrderbookLoading: boolean;
  marketBookMissing: boolean;
  qtyInput: string;
  displayQty: number;
  orderType: ORDER_TYPE;
  priceInput: string;
  effectivePrice: number | null;
  estimatedCollateral: number | null;
  availableMarginUsd: number | null;
};

export function getOrderValidationMessage(
  input: OrderValidationInput,
): string | null {
  if (!input.isAuthenticated) return null;
  if (input.isOrderbookLoading) return "Loading orderbook...";
  if (input.marketBookMissing) {
    return "Orderbook price unavailable for market order.";
  }
  if (
    !input.qtyInput ||
    !Number.isFinite(input.displayQty) ||
    input.displayQty <= 0
  ) {
    return null;
  }
  if (
    input.orderType === ORDER_TYPE.LIMIT_ORDER &&
    (!input.priceInput || input.effectivePrice == null)
  ) {
    return "Enter a valid limit price.";
  }
  if (
    input.estimatedCollateral != null &&
    input.availableMarginUsd != null &&
    input.estimatedCollateral > input.availableMarginUsd
  ) {
    return "Insufficient available margin.";
  }
  return null;
}

export type SubmitEligibilityInput = {
  isAuthenticated: boolean;
  apiQty: number | null;
  effectivePrice: number | null;
  marketBookMissing: boolean;
  isPending: boolean;
  isOrderbookLoading: boolean;
};

export function canSubmitOrder(input: SubmitEligibilityInput): boolean {
  return (
    input.isAuthenticated &&
    input.apiQty != null &&
    input.effectivePrice != null &&
    !input.marketBookMissing &&
    !input.isPending &&
    !input.isOrderbookLoading
  );
}
