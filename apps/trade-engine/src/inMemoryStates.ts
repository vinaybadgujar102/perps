import { SIDE, type Position } from "@repo/sharedtypes";
import { OrderbookNotFoundError } from "./errors";
import type { PriceLevel } from "./types";
import { UserManager } from "./utils/UserManager.class";
import type { OrderEntity } from "./entity/order.entity";

// export type OrderBook = Record<
//   string,
//   { bids: PriceLevel[]; asks: PriceLevel[]; indexPrice: number }
// >;

// export const orderbooks: OrderBook = {
//   BTC: { bids: [], asks: [], indexPrice: 0 },
//   SOL: { bids: [], asks: [], indexPrice: 0 },
// };

export const POSITIONS: Map<string, Position> = new Map();

export const USERMANAGER = new UserManager();

export class Orderbook {
  market: string;
  bids: PriceLevel[] = [];
  asks: PriceLevel[] = [];
  indexPrice: number = 0;

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

  addOrder(order: OrderEntity) {
    const availableQty = order.getAvailableQty();
    const bookSide = order.side === SIDE.LONG ? this.bids : this.asks;

    const existingLevel = bookSide.find((level) => level.price === order.price);

    if (existingLevel) {
      existingLevel.availableQty += availableQty;
      existingLevel.orders.push(order);
      return;
    }

    const newPriceLevel: PriceLevel = {
      price: order.price,
      availableQty,
      orders: [order],
    };

    if (order.side === SIDE.LONG) {
      const index = this.bids.findIndex(
        (level) => order.price > level.price,
      );
      if (index === -1) {
        this.bids.push(newPriceLevel);
      } else {
        this.bids.splice(index, 0, newPriceLevel);
      }
    } else {
      const index = this.asks.findIndex(
        (level) => order.price < level.price,
      );
      if (index === -1) {
        this.asks.push(newPriceLevel);
      } else {
        this.asks.splice(index, 0, newPriceLevel);
      }
    }
  }

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
}

export class OrderbookManager {
  private orderbook: Record<string, Orderbook> = {};

  addOrderbook(market: string) {
    const existingOrderbook = this.orderbook[market];
    if (existingOrderbook) {
      throw new Error("Orderbook already exists!");
    }

    this.orderbook[market] = new Orderbook(market);
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
