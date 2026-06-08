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

  createNewPriceLevel(price: number, availableQty: number): PriceLevel {
    return {
      price,
      orders: [],
      availableQty,
    };
  }

  insertPriceLevel(level: PriceLevel, side: SIDE) {
    const book = side === SIDE.LONG ? this.bids : this.asks;

    const index = book.findIndex((existing) =>
      side === SIDE.LONG
        ? level.price > existing.price
        : level.price < existing.price,
    );

    if (index === -1) {
      book.push(level);
    } else {
      book.splice(index, 0, level);
    }
  }

  addOrder(order: OrderEntity) {
    const availableQty = order.getAvailableQty();
    const side = order.side === SIDE.LONG ? this.bids : this.asks;

    const existingLevel = side.find((level) => level.price === order.price);

    if (existingLevel) {
      existingLevel.availableQty += availableQty;
      existingLevel.orders.push(order);
      return;
    }

    const newLevel = this.createNewPriceLevel(order.price, availableQty);

    newLevel.orders.push(order);
    this.insertPriceLevel(newLevel, order.side);
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
