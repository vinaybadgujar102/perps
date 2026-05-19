import crypto from "crypto";

type Order = {
  id: string; // unique order identity
  userId: string; // who placed the order
  price: number; // price at which the order was placed,
  qty: number; // how much qty to execute for the order,
  asset: string; // which asset we are trading
  filledQty: number; // keeping track of the qty
  side: "BUY" | "SELL"; // if buy or sell
  timestamp: number; // when the order was placed for prio
};

type PriceLevel = {
  price: number;
  totalQty: number;
  orders: Order[];
};

type OrderBook = {
  asset: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  lastTradedPrice: number;
};

type Fill = {
  id: string;
  orderId: string;
  filledQty: number;
  price: number;
  makerId: string;
  takerId: string;
  asset: string;
};

const btcUsdOrderbook: OrderBook = {
  asset: "BTCUSD",
  bids: [],
  asks: [],
  lastTradedPrice: 0,
};

function addOrder(order: Order): Fill[] {
  // first we match the orders
  const fills = matchOrder(order);
  const remainingQty = order.qty - order.filledQty;

  if (remainingQty === 0) {
    return fills;
  }

  // place remaining qty in the orderbook
  const side =
    order.side === "BUY" ? btcUsdOrderbook.bids : btcUsdOrderbook.asks;
  const priceLevel = side.find((level) => level.price === order.price);

  if (!priceLevel) {
    const newPriceLevel: PriceLevel = {
      price: order.price,
      totalQty: remainingQty,
      orders: [order],
    };

    if (order.side === "BUY") {
      const index = side.findIndex((level) => order.price > level.price);
      if (index === -1) {
        btcUsdOrderbook.bids.push(newPriceLevel);
      } else {
        btcUsdOrderbook.bids.splice(index, 0, newPriceLevel);
      }
    } else {
      const index = side.findIndex((level) => order.price < level.price);
      if (index === -1) {
        btcUsdOrderbook.asks.push(newPriceLevel);
      } else {
        btcUsdOrderbook.asks.splice(index, 0, newPriceLevel);
      }
    }
  } else {
    priceLevel.totalQty += remainingQty;
    priceLevel.orders.push(order);
  }

  return fills;
}

function matchOrder(order: Order): Fill[] {
  const fills: Fill[] = [];
  if (order.side === "BUY") {
    for (let i = 0; i < btcUsdOrderbook.asks.length; i++) {
      const priceLevel = btcUsdOrderbook.asks[i];
      if (!priceLevel) return fills;
      if (priceLevel.price > order.price || order.filledQty === order.qty) {
        return fills;
      }
      for (const makerOrder of priceLevel.orders) {
        if (order.filledQty === order.qty) break;
        const filledQty = Math.min(
          order.qty - order.filledQty,
          makerOrder.qty - makerOrder.filledQty,
        );
        order.filledQty += filledQty;
        makerOrder.filledQty += filledQty;
        fills.push({
          id: crypto.randomUUID(),
          orderId: order.id,
          filledQty,
          price: priceLevel.price,
          makerId: makerOrder.userId,
          takerId: order.userId,
          asset: order.asset,
        });
      }
      priceLevel.orders = priceLevel.orders.filter(
        (o) => o.qty !== o.filledQty,
      );
      if (priceLevel.orders.length === 0) {
        btcUsdOrderbook.asks.splice(i, 1);
        i--;
      }
    }
  } else {
    for (let i = 0; i < btcUsdOrderbook.bids.length; i++) {
      const priceLevel = btcUsdOrderbook.bids[i];
      if (!priceLevel) return fills;
      if (priceLevel.price < order.price || order.qty === order.filledQty)
        return fills;
      for (const makerOrder of priceLevel.orders) {
        if (order.filledQty === order.qty) break;
        const filledQty = Math.min(
          makerOrder.qty - makerOrder.filledQty,
          order.qty - order.filledQty,
        );
        makerOrder.filledQty += filledQty;
        order.filledQty += filledQty;
        fills.push({
          id: crypto.randomUUID(),
          orderId: order.id,
          takerId: order.userId,
          makerId: makerOrder.userId,
          asset: order.asset,
          filledQty,
          price: priceLevel.price,
        });
      }
      priceLevel.orders = priceLevel.orders.filter(
        (o) => o.qty !== o.filledQty,
      );
      if (priceLevel.orders.length === 0) {
        btcUsdOrderbook.bids.splice(i, 1);
        i--;
      }
    }
  }
  return fills;
}

function cancelOrder(order: Order) {
  let orderBookSide =
    order.side === "BUY" ? btcUsdOrderbook.bids : btcUsdOrderbook.asks;
  const priceLevel = orderBookSide.find(
    (priceLevel) => priceLevel.price === order.price,
  );
  if (!priceLevel) return false;

  priceLevel.orders = priceLevel.orders.filter(
    (currentOrder) => order.id !== currentOrder.id,
  ); // order deleted

  priceLevel.totalQty -= order.qty - order.filledQty;

  // check if price level becomes empty
  if (priceLevel.orders.length === 0) {
    const index = orderBookSide.findIndex(
      (priceLevel) => priceLevel.price === order.price,
    );
    orderBookSide.splice(index, 1);
  }

  return true;
}

function getBestBid() {
  return btcUsdOrderbook.bids[0]?.price;
}

function getBestAsk() {
  return btcUsdOrderbook.asks[0]?.price;
}

//---------------------------------------------------------//

const sellOrder: Order = {
  id: crypto.randomUUID(),
  side: "SELL",
  qty: 10,
  price: 100,
  asset: "BTC/USD",
  userId: "vinay",
  timestamp: Date.now(),
  filledQty: 0,
};

const buyOrder: Order = {
  id: crypto.randomUUID(),
  side: "BUY",
  qty: 5,
  price: 110,
  asset: "BTC/USD",
  userId: "om",
  timestamp: Date.now() + 100,
  filledQty: 0,
};

// const fill: Fill = {
//   id: crypto.randomUUID(),
//   asset: "BTC/USD",
//   makerId: "vinay",
//   takerId: "om",
//   price: 100,
//   filledQty: 5,
//   orderId: buyOrder.id
// }
//
// seed the book
const sell1: Order = {
  id: crypto.randomUUID(),
  side: "SELL",
  qty: 10,
  price: 100,
  asset: "BTC/USD",
  userId: "vinay",
  timestamp: Date.now(),
  filledQty: 0,
};
const sell2: Order = {
  id: crypto.randomUUID(),
  side: "SELL",
  qty: 5,
  price: 102,
  asset: "BTC/USD",
  userId: "raj",
  timestamp: Date.now(),
  filledQty: 0,
};
const sell3: Order = {
  id: crypto.randomUUID(),
  side: "SELL",
  qty: 8,
  price: 105,
  asset: "BTC/USD",
  userId: "sara",
  timestamp: Date.now(),
  filledQty: 0,
};

addOrder(sell1);
addOrder(sell2);
addOrder(sell3);

console.log("=== book after seeding asks ===");
console.log("best ask:", getBestAsk()); // expect 100

// buy that partially matches sell1
const buy1: Order = {
  id: crypto.randomUUID(),
  side: "BUY",
  qty: 6,
  price: 101,
  asset: "BTC/USD",
  userId: "om",
  timestamp: Date.now(),
  filledQty: 0,
};
const fills1 = addOrder(buy1);
console.log("\n=== buy 6 @ 101 ===");
console.log("fills:", fills1); // expect 1 fill, qty 6 @ 100
console.log("best ask:", getBestAsk()); // expect 100 (4 qty remaining)
console.log("best bid:", getBestBid()); // expect undefined (fully filled)

// buy that sweeps multiple levels
const buy2: Order = {
  id: crypto.randomUUID(),
  side: "BUY",
  qty: 20,
  price: 106,
  asset: "BTC/USD",
  userId: "om",
  timestamp: Date.now(),
  filledQty: 0,
};
const fills2 = addOrder(buy2);
console.log("\n=== buy 20 @ 106 (sweeps book) ===");
console.log("fills:", fills2); // expect 3 fills: 4@100, 5@102, 8@105
console.log("best ask:", getBestAsk()); // expect undefined (book empty)
console.log("best bid:", getBestBid()); // expect 106 (3 qty remaining)
