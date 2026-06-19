import { SIDE } from "@repo/sharedtypes";
import type { OrderEntity } from "../entity/order.entity";
import type { Fill } from "../types";
import type { DepthDelta } from "../orderbook.types";
import type { Orderbook, OrderbookManager } from "../inMemoryStates";
import { DepthDeltaCollector } from "../utils/depth-delta.util";

export type MatchOrderResult = {
  fills: Fill[];
  depthDelta: DepthDelta;
};

export class MatchingEngineService {
  constructor(private orderBookManager: OrderbookManager) {}

  matchAsks(order: OrderEntity, orderbook: Orderbook): MatchOrderResult {
    const fills: Fill[] = [];
    const depthDelta = new DepthDeltaCollector();

    for (let i = 0; i < orderbook.asks.length; i++) {
      const priceLevel = orderbook.asks[i];
      if (!priceLevel) continue;

      if (
        !order.isMarketOrder() &&
        (priceLevel.price > order.price || order.isOrderFullyFilled())
      ) {
        return { fills, depthDelta: depthDelta.toDelta() };
      }

      if (order.isOrderFullyFilled()) {
        return { fills, depthDelta: depthDelta.toDelta() };
      }

      let totalFilledQty = 0;
      for (const makerOrder of priceLevel.orders) {
        if (order.isOrderFullyFilled()) break;
        if (makerOrder.userId === order.userId) continue;

        const filledQty = Math.min(
          makerOrder.getAvailableQty(),
          order.getAvailableQty(),
        );

        if (filledQty <= 0) continue;

        makerOrder.filledQty += filledQty;
        order.filledQty += filledQty;
        totalFilledQty += filledQty;

        fills.push({
          id: crypto.randomUUID(),
          makerId: makerOrder.userId,
          takerId: order.userId,
          market: order.market,
          takerSide: order.side,
          makerSide: makerOrder.side,
          timestamp: Date.now(),
          takerOrderId: order.id,
          makerOrderId: makerOrder.id,
          filledQty: filledQty,
          price: priceLevel.price,
        });
      }

      if (totalFilledQty > 0) {
        if (
          orderbook.cleanupPriceLevel(orderbook.asks, priceLevel, i, totalFilledQty)
        ) {
          depthDelta.setAsk(priceLevel.price, 0);
          i--;
        } else {
          depthDelta.setAsk(priceLevel.price, priceLevel.availableQty);
        }
      }
    }
    return { fills, depthDelta: depthDelta.toDelta() };
  }

  private matchBids(order: OrderEntity, orderbook: Orderbook): MatchOrderResult {
    const fills: Fill[] = [];
    const depthDelta = new DepthDeltaCollector();

    for (let i = 0; i < orderbook.bids.length; i++) {
      const priceLevel = orderbook.bids[i];
      if (!priceLevel) continue;

      if (
        !order.isMarketOrder() &&
        (priceLevel.price < order.price || order.isOrderFullyFilled())
      ) {
        return { fills, depthDelta: depthDelta.toDelta() };
      }

      if (order.isOrderFullyFilled()) {
        return { fills, depthDelta: depthDelta.toDelta() };
      }

      let totalFilledQty = 0;
      for (const makerOrder of priceLevel.orders) {
        if (order.isOrderFullyFilled()) break;
        if (makerOrder.userId === order.userId) continue;

        const filledQty = Math.min(
          makerOrder.getAvailableQty(),
          order.getAvailableQty(),
        );

        if (filledQty <= 0) continue;

        makerOrder.filledQty += filledQty;
        order.filledQty += filledQty;
        totalFilledQty += filledQty;

        fills.push({
          id: crypto.randomUUID(),
          makerId: makerOrder.userId,
          takerId: order.userId,
          market: order.market,
          takerSide: order.side,
          makerSide: makerOrder.side,
          timestamp: Date.now(),
          takerOrderId: order.id,
          makerOrderId: makerOrder.id,
          filledQty: filledQty,
          price: priceLevel.price,
        });
      }

      if (totalFilledQty > 0) {
        if (
          orderbook.cleanupPriceLevel(orderbook.bids, priceLevel, i, totalFilledQty)
        ) {
          depthDelta.setBid(priceLevel.price, 0);
          i--;
        } else {
          depthDelta.setBid(priceLevel.price, priceLevel.availableQty);
        }
      }
    }
    return { fills, depthDelta: depthDelta.toDelta() };
  }

  matchOrder(order: OrderEntity): MatchOrderResult {
    const orderbook = this.orderBookManager.getOrderbook(order.market);

    if (order.side === SIDE.LONG) {
      return this.matchAsks(order, orderbook);
    }

    return this.matchBids(order, orderbook);
  }
}
