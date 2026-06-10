import { SIDE } from "@repo/sharedtypes";
import type { OrderEntity } from "../entity/order.entity";
import type { Fill } from "../types";
import type { Orderbook, OrderbookManager } from "../inMemoryStates";

export class MatchingEngineService {
  constructor(private orderBookManager: OrderbookManager) {}

  private matchAsks(order: OrderEntity, orderbook: Orderbook): Fill[] {
    const fills: Fill[] = [];
    for (let i = 0; i < orderbook.asks.length; i++) {
      const priceLevel = orderbook.asks[i];
      if (!priceLevel) continue;

      if (
        !order.isMarketOrder() &&
        (priceLevel.price > order.price || order.isOrderFullyFilled())
      ) {
        return fills;
      }

      if (order.isOrderFullyFilled()) {
        return fills;
      }

      let totalFilledQty = 0;
      for (const makerOrder of priceLevel.orders) {
        if (order.isOrderFullyFilled()) break;

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

      if (orderbook.cleanupPriceLevel(orderbook.asks, priceLevel, i, totalFilledQty)) {
        i--;
      }
    }
    return fills;
  }

  private matchBids(order: OrderEntity, orderbook: Orderbook): Fill[] {
    const fills: Fill[] = [];
    for (let i = 0; i < orderbook.bids.length; i++) {
      const priceLevel = orderbook.bids[i];
      if (!priceLevel) continue;

      if (
        !order.isMarketOrder() &&
        (priceLevel.price < order.price || order.isOrderFullyFilled())
      ) {
        return fills;
      }

      if (order.isOrderFullyFilled()) {
        return fills;
      }

      let totalFilledQty = 0;
      for (const makerOrder of priceLevel.orders) {
        if (order.isOrderFullyFilled()) break;

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

      if (orderbook.cleanupPriceLevel(orderbook.bids, priceLevel, i, totalFilledQty)) {
        i--;
      }
    }
    return fills;
  }

  matchOrder(order: OrderEntity) {
    const orderbook = this.orderBookManager.getOrderbook(order.market);

    if (order.side === SIDE.LONG) {
      return this.matchAsks(order, orderbook);
    }

    return this.matchBids(order, orderbook);
  }
}
