import type { OrderEntity } from "./entity/order.entity";

export type PriceLevel = {
  price: number;
  availableQty: number;
  orders: OrderEntity[];
};

export type DepthLevelUpdate = { price: number; qty: number };
export type DepthDelta = { bids: DepthLevelUpdate[]; asks: DepthLevelUpdate[] };
