import { ORDER_TYPE } from "@repo/sharedtypes";
import { POSITIONS, orderbooks } from "../inMemoryStates";
import { createOrder } from "../utils/order.util";
import { createPosition } from "../utils/position.util";
import { USERS } from "../utils/user.util";
import type { Order } from "../types";

function getPositionsSnapshot() {
  return Array.from(POSITIONS.entries()).map(([key, value]) => ({
    key,
    userId: value.userId,
    market: value.market,
    size: value.size,
    averageEntryPrice: value.averageEntryPrice,
    collateralUser: value.collateralUser,
    orderId: value.orderId,
    liquidationPrice: value.estimatedLiquidationPrice,
  }));
}

function getOrderbookSnapshot() {
  return {
    BTC: {
      bids: orderbooks.BTC.bids.map((level) => ({
        price: level.price,
        availableQty: level.availableQty,
        orders: level.orders.map((order) => ({
          id: order.id,
          userId: order.userId,
          qty: order.qty,
          filledQty: order.filledQty,
          type: order.type,
        })),
      })),
      asks: orderbooks.BTC.asks.map((level) => ({
        price: level.price,
        availableQty: level.availableQty,
        orders: level.orders.map((order) => ({
          id: order.id,
          userId: order.userId,
          qty: order.qty,
          filledQty: order.filledQty,
          type: order.type,
        })),
      })),
      indexPrice: orderbooks.BTC.indexPrice,
    },
    SOL: {
      bids: orderbooks.SOL.bids.length,
      asks: orderbooks.SOL.asks.length,
      indexPrice: orderbooks.SOL.indexPrice,
    },
  };
}

function logStep(title: string, payload?: unknown) {
  console.log(`\n=== ${title} ===`);
  if (payload !== undefined) {
    console.log(JSON.stringify(payload, null, 2));
  }
}

function resetState() {
  orderbooks.BTC = { bids: [], asks: [], indexPrice: 0 };
  orderbooks.SOL = { bids: [], asks: [], indexPrice: 0 };
  POSITIONS.clear();
}

function ensureUsers() {
  for (const userId of [101, 202, 303]) {
    if (!USERS.getUser(userId)) {
      const user = USERS.addUser(userId);
      user.balance = 1_000_000;
    }
  }
}

function makeOrder({
  id,
  userId,
  type,
  qty,
  price,
  market = "BTC",
}: {
  id: string;
  userId: number;
  type: "LONG" | "SHORT";
  qty: number;
  price: number;
  market?: string;
}): Order {
  return {
    id,
    userId,
    market,
    qty,
    filledQty: 0,
    price,
    type,
    orderType: ORDER_TYPE.LIMIT_ORDER,
    timestamp: Date.now(),
  };
}

function applyFillsToPositions(fills: ReturnType<typeof createOrder>["data"]) {
  if (!fills || fills.length === 0) {
    logStep("No fills to apply");
    return;
  }

  for (const fill of fills) {
    logStep("Applying fill to positions", fill);

    createPosition({
      userId: fill.takerId,
      orderId: fill.takerOrderId,
      market: fill.market,
      orderType: fill.takerOrderType,
      filledQty: fill.filledQty,
      fillPrice: fill.price,
    });

    createPosition({
      userId: fill.makerId,
      orderId: fill.makerOrderId,
      market: fill.market,
      orderType: fill.makerOrderType,
      filledQty: fill.filledQty,
      fillPrice: fill.price,
    });
  }

  logStep("Positions after fill application", getPositionsSnapshot());
}

function submitOrder(order: Order, label: string) {
  logStep(`${label} - submit order`, order);
  const result = createOrder(order);
  logStep(`${label} - createOrder result`, result);
  logStep(`${label} - orderbook snapshot`, getOrderbookSnapshot());
  return result;
}

function runE2ESeed() {
  logStep("E2E seed start");
  resetState();
  logStep("State reset", {
    positions: POSITIONS.size,
    orderbook: getOrderbookSnapshot(),
  });

  ensureUsers();
  logStep(
    "Users ensured",
    [101, 202, 303].map((userId) => USERS.getUser(userId)),
  );

  // Seed resting SHORT liquidity (maker side).
  submitOrder(
    makeOrder({
      id: "maker-short-1",
      userId: 101,
      type: "SHORT",
      qty: 2,
      price: 50_000,
    }),
    "Step 1",
  );
  submitOrder(
    makeOrder({
      id: "maker-short-2",
      userId: 303,
      type: "SHORT",
      qty: 1.5,
      price: 50_100,
    }),
    "Step 2",
  );

  // Seed taker LONG that matches both asks and creates positions.
  const takerResult = submitOrder(
    makeOrder({
      id: "taker-long-1",
      userId: 202,
      type: "LONG",
      qty: 3,
      price: 50_200,
    }),
    "Step 3",
  );
  applyFillsToPositions(takerResult.data);

  // Add to existing taker position in same direction.
  submitOrder(
    makeOrder({
      id: "maker-short-3",
      userId: 101,
      type: "SHORT",
      qty: 1,
      price: 50_300,
    }),
    "Step 4",
  );
  const scaleInResult = submitOrder(
    makeOrder({
      id: "taker-long-2",
      userId: 202,
      type: "LONG",
      qty: 1,
      price: 50_300,
    }),
    "Step 5",
  );
  applyFillsToPositions(scaleInResult.data);

  const positionsSnapshot = getPositionsSnapshot();

  console.log("=== E2E Seed Complete ===");
  console.log(JSON.stringify(positionsSnapshot, null, 2));
  console.log(
    JSON.stringify(
      {
        btcBook: {
          bids: orderbooks.BTC.bids.length,
          asks: orderbooks.BTC.asks.length,
        },
        totalPositions: POSITIONS.size,
      },
      null,
      2,
    ),
  );
}

runE2ESeed();
