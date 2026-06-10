import {
  createOrderPayloadSchema,
  ORDER_TYPE,
  type SIDE,
} from "@repo/sharedtypes";
import type { z } from "zod/mini";

export class OrderEntity {
  readonly id: string;
  readonly market: string;
  qty: number;
  filledQty: number;
  readonly price: number;
  readonly userId: number;
  readonly side: SIDE;
  readonly orderType: string;
  timestamp: number;

  constructor(
    payload: z.infer<typeof createOrderPayloadSchema.shape.payload>,
    userId: number,
  ) {
    this.id = payload.id;
    this.market = payload.market;
    this.qty = payload.qty;
    this.filledQty = 0;
    this.price = payload.price;
    this.userId = userId;
    this.side = payload.side;
    this.orderType = payload.orderType;
    this.timestamp = Date.now();
  }

  getAvailableQty(): number {
    return this.qty - this.filledQty;
  }

  isOrderFullyFilled() {
    return this.qty === this.filledQty;
  }

  isMarketOrder() {
    return this.orderType === ORDER_TYPE.MARKET_ORDER;
  }
  isLimitOrder() {
    return this.orderType === ORDER_TYPE.LIMIT_ORDER;
  }
}
