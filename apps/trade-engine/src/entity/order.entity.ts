import {
  createOrderPayloadSchema,
  ORDER_TYPE,
  type SIDE,
} from "@repo/sharedtypes";
import type { z } from "zod/mini";

import type { SnapshotOrder } from "../types";

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

  static fromSnapshot(data: SnapshotOrder): OrderEntity {
    const order = new OrderEntity(
      {
        id: data.id,
        market: data.market,
        side: data.side,
        qty: data.qty,
        orderType: data.orderType,
        price: data.price,
      },
      data.userId,
    );
    order.filledQty = data.filledQty;
    order.timestamp = data.timestamp;
    return order;
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
