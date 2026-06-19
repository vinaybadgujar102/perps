import { SIDE } from "@repo/sharedtypes";
import {
  OrderbookNotFoundError,
  OrderNotCancellableError,
  OrderNotFoundError,
  UnauthorizedOrderError,
} from "./errors";
import type { PriceLevel } from "./orderbook.types";
import type { OrderEntity } from "./entity/order.entity";

// export type OrderBook = Record<
//   string,
//   { bids: PriceLevel[]; asks: PriceLevel[]; indexPrice: number }
// >;

// export const orderbooks: OrderBook = {
//   BTC: { bids: [], asks: [], indexPrice: 0 },
//   SOL: { bids: [], asks: [], indexPrice: 0 },
// };

export class Orderbook {
  market: string;
  bids: PriceLevel[] = [];
  asks: PriceLevel[] = [];
  indexPrice: number = 0;
  lastTradedPrice: number = 0;

  constructor(market: string) {
    this.market = market;
  }

  updateIndexPrice(indexPrice: number) {
    this.indexPrice = indexPrice;
  }

  getIndexPrice() {
    return this.indexPrice;
  }

  getBestBidPrice() {
    const priceLevel = this.bids[0];
    if (!priceLevel) throw new Error("Orderbook is empty");
    return priceLevel.price;
  }

  getBestAskPrice() {
    const priceLevel = this.asks[0];
    if (!priceLevel) throw new Error("Orderbook is empty");
    return priceLevel.price;
  }

  getMarkPrice() {
    return (this.getBestAskPrice() - this.getBestBidPrice()) / 2;
  }

  setIndexPrice(indexPrice: number) {
    if (indexPrice < 0) throw new Error("Invalid index price");
    this.indexPrice = indexPrice;
  }

  setLastTradedPrice(price: number) {
    if (price <= 0) return;
    this.lastTradedPrice = price;
  }

  getLastTradedPriceForFunding(): number {
    if (this.lastTradedPrice > 0) return this.lastTradedPrice;
    if (this.bids.length > 0 && this.asks.length > 0) {
      return this.getMarkPrice();
    }
    return this.indexPrice;
  }

  addOrder(order: OrderEntity): {
    side: "bids" | "asks";
    price: number;
    qty: number;
  } {
    const availableQty = order.getAvailableQty();
    const bookSide = order.side === SIDE.LONG ? this.bids : this.asks;
    const side = order.side === SIDE.LONG ? "bids" : "asks";

    const existingLevel = bookSide.find((level) => level.price === order.price);

    if (existingLevel) {
      existingLevel.availableQty += availableQty;
      existingLevel.orders.push(order);
      return { side, price: order.price, qty: existingLevel.availableQty };
    }

    const newPriceLevel: PriceLevel = {
      price: order.price,
      availableQty,
      orders: [order],
    };

    if (order.side === SIDE.LONG) {
      const index = this.bids.findIndex((level) => order.price > level.price);
      if (index === -1) {
        this.bids.push(newPriceLevel);
      } else {
        this.bids.splice(index, 0, newPriceLevel);
      }
    } else {
      const index = this.asks.findIndex((level) => order.price < level.price);
      if (index === -1) {
        this.asks.push(newPriceLevel);
      } else {
        this.asks.splice(index, 0, newPriceLevel);
      }
    }

    return { side, price: order.price, qty: availableQty };
  }

  /**
   * @returns boolean: true if price level is completely removed from the orderbook
   */
  cleanupPriceLevel(
    book: PriceLevel[],
    priceLevel: PriceLevel,
    index: number,
    totalFilledQty: number,
  ): boolean {
    priceLevel.orders = priceLevel.orders.filter(
      (order) => order.getAvailableQty() > 0,
    );

    if (priceLevel.orders.length === 0) {
      book.splice(index, 1);
      return true;
    }

    priceLevel.availableQty -= totalFilledQty;
    return false;
  }

  removeOrderById(
    orderId: string,
    userId: number,
  ): {
    side: "bids" | "asks";
    price: number;
    qty: number;
    cancelledQty: number;
  } {
    for (const side of ["bids", "asks"] as const) {
      const book = side === "bids" ? this.bids : this.asks;

      for (let i = 0; i < book.length; i++) {
        const level = book[i];
        if (!level) continue;

        const orderIndex = level.orders.findIndex(
          (order) => order.id === orderId,
        );
        if (orderIndex === -1) continue;

        const order = level.orders[orderIndex];
        if (!order) continue;

        if (order.userId !== userId) {
          throw new UnauthorizedOrderError();
        }
        if (!order.isLimitOrder() || order.getAvailableQty() <= 0) {
          throw new OrderNotCancellableError();
        }

        const cancelledQty = order.getAvailableQty();
        level.availableQty -= cancelledQty;
        level.orders.splice(orderIndex, 1);

        if (level.orders.length === 0) {
          book.splice(i, 1);
          return { side, price: level.price, qty: 0, cancelledQty };
        }

        return {
          side,
          price: level.price,
          qty: level.availableQty,
          cancelledQty,
        };
      }
    }

    throw new OrderNotFoundError(orderId);
  }
}

export class OrderbookManager {
  private orderbook: Record<string, Orderbook> = {};

  getMarkets(): string[] {
    return Object.keys(this.orderbook);
  }

  ensureOrderbook(market: string): Orderbook {
    const existingOrderbook = this.orderbook[market];
    if (existingOrderbook) {
      return existingOrderbook;
    }

    const orderbook = new Orderbook(market);
    this.orderbook[market] = orderbook;
    return orderbook;
  }

  getOrderbook(market: string) {
    const orderbook = this.orderbook[market];
    if (!orderbook) {
      throw new OrderbookNotFoundError(market);
    }
    return orderbook;
  }
}

export const GLOBAL_ORDERBOOK = new OrderbookManager();
