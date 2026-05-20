import { SYMBOLS } from "@repo/sharedtypes";
import { orderbooks, USERS } from "./inMemoryStates";
import type { Fill, Order, PriceLevel } from "./types";

export const createUserHandle = (userId: number) => {
  USERS.set(userId, {
    userId: userId,
    balance: 0,
    lockedBalance: 0,
  });
};

const getOrderbook = (market: string) => {
  return orderbooks[market];
};

export const createOrder = (order: Order): Fill[] => {
  const orderbook = getOrderbook(order.market);

  if (!orderbook) {
    console.log("market not present");
    return [];
  }

  const fills = matchOrder(order) ?? [];

  const availableQty = order.qty - order.filledQty;
  if (availableQty === 0) return fills;

  const side = order.type === "LONG" ? orderbook.bids : orderbook.asks;

  const priceLevel = side.find(
    (priceLevel) => priceLevel.price === order.price,
  );
  if (!priceLevel) {
    const newPriceLevel: PriceLevel = {
      price: order.price,
      availableQty: availableQty,
      orders: [],
    };
    newPriceLevel.orders.push(order);

    if (order.type === "LONG") {
      const index = orderbook.bids.findIndex(
        (priceLevel) => order.price > priceLevel.price,
      );

      if (index === -1) {
        orderbook.bids.push(newPriceLevel);
      } else {
        orderbook.bids.splice(index, 0, newPriceLevel);
      }
    } else {
      const index = orderbook.asks.findIndex(
        (priceLevel) => order.price < priceLevel.price,
      );

      if (index === -1) {
        orderbook.asks.push(newPriceLevel);
      } else {
        orderbook.asks.splice(index, 0, newPriceLevel);
      }
    }
  } else {
    priceLevel.availableQty += availableQty;
    priceLevel.orders.push(order);
  }

  return fills;
};

const matchOrder = (order: Order): Fill[] | null => {
  const orderbook = getOrderbook(order.market);
  if (!orderbook) {
    return null;
  }
  const fills: Fill[] = [];

  if (order.type === "LONG") {
    for (let i = 0; i < orderbook.asks.length; i++) {
      const priceLevel = orderbook.asks[i];
      if (!priceLevel) return fills;

      if (priceLevel.price > order.price || order.qty === order.filledQty)
        return fills;

      for (const makerOrder of priceLevel.orders) {
        if (order.qty === order.filledQty) break;

        const filledQty = Math.min(
          makerOrder.qty - makerOrder.filledQty,
          order.qty - order.filledQty,
        );
        makerOrder.filledQty += filledQty;
        order.filledQty += filledQty;
        fills.push({
          id: crypto.randomUUID(),
          makerId: makerOrder.userId,
          takerId: order.userId,
          market: order.market,
          timestamp: Date.now(),
          orderId: order.id,
          price: priceLevel.price,
        });
      }

      priceLevel.orders = priceLevel.orders.filter(
        (order) => order.filledQty != order.qty,
      );
      if (priceLevel.orders.length === 0) {
        orderbook.asks.splice(i, 1);
        i--;
      }
    }
  } else {
    for (let i = 0; i < orderbook.bids.length; i++) {
      const priceLevel = orderbook.bids[i];
      if (!priceLevel) return fills;

      if (priceLevel.price < order.price || order.qty === order.filledQty)
        return fills;

      for (const makerOrder of priceLevel.orders) {
        if (order.qty === order.filledQty) break;

        const filledQty = Math.min(
          makerOrder.qty - makerOrder.filledQty,
          order.qty - order.filledQty,
        );
        makerOrder.filledQty += filledQty;
        order.filledQty += filledQty;
        fills.push({
          id: crypto.randomUUID(),
          makerId: makerOrder.userId,
          takerId: order.userId,
          market: order.market,
          timestamp: Date.now(),
          orderId: order.id,
          price: priceLevel.price,
        });
      }

      priceLevel.orders = priceLevel.orders.filter(
        (order) => order.filledQty != order.qty,
      );
      if (priceLevel.orders.length === 0) {
        orderbook.bids.splice(i, 1);
        i--;
      }
    }
  }

  return fills;
};
