import { ORDER_STATUS, ORDER_TYPE } from "@repo/sharedtypes";

export function deriveOrderStatus(
  orderType: ORDER_TYPE,
  qty: number,
  filledQty: number,
): ORDER_STATUS {
  if (filledQty === 0) {
    return orderType === ORDER_TYPE.MARKET_ORDER
      ? ORDER_STATUS.CANCELLED
      : ORDER_STATUS.OPEN;
  }

  if (filledQty < qty) {
    return ORDER_STATUS.PARTIALLY_FILLED;
  }

  return ORDER_STATUS.FILLED;
}
