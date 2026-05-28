import { ORDER_TYPE, SIDE } from "@repo/sharedtypes";
import { POSITIONS, orderbooks } from "../inMemoryStates";
import { createOrder } from "../utils/order.util";
import { liquidatePositions } from "../utils/liquidation.util";
import { createPosition, generatePositionKey } from "../utils/position.util";
import { USERS } from "../utils/user.util";
import type { Order } from "../types";

const E2E_MARK_PRICE = 50_250;
const E2E_USER_IDS = [101, 202, 303] as const;

export function getPositionsSnapshot() {
  return Array.from(POSITIONS.entries()).map(([key, value]) => ({
    key,
    userId: value.userId,
    market: value.market,
    size: value.size,
    averageEntryPrice: value.averageEntryPrice,
    collateralUser: value.collateralUser,
    realizedPnl: value.realizedPnl,
    orderId: value.orderId,
    liquidationPrice: value.estimatedLiquidationPrice,
  }));
}

export function getUsersSnapshot() {
  return E2E_USER_IDS.map((userId) => {
    const user = USERS.getUser(userId);
    return {
      userId,
      balance: user?.balance ?? null,
      lockedBalance: user?.lockedBalance ?? null,
    };
  });
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
          side: order.side,
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
          side: order.side,
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

export function resetE2EState(markPrice = E2E_MARK_PRICE) {
  orderbooks.BTC = { bids: [], asks: [], indexPrice: markPrice };
  orderbooks.SOL = { bids: [], asks: [], indexPrice: 0 };
  POSITIONS.clear();
}

function ensureUsers() {
  for (const userId of E2E_USER_IDS) {
    if (!USERS.getUser(userId)) {
      const user = USERS.addUser(userId);
      user.balance = 1_000_000;
      user.lockedBalance = 0;
    }
  }
}

function makeOrder({
  id,
  userId,
  side,
  qty,
  price,
  market = "BTC",
}: {
  id: string;
  userId: number;
  side: Order["side"];
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
    side,
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
      side: fill.takerSide,
      filledQty: fill.filledQty,
      fillPrice: fill.price,
    });

    createPosition({
      userId: fill.makerId,
      orderId: fill.makerOrderId,
      market: fill.market,
      side: fill.makerSide,
      filledQty: fill.filledQty,
      fillPrice: fill.price,
    });
  }

  logStep("Positions after fill application", getPositionsSnapshot());
  logStep("Users after fill application", getUsersSnapshot());
}

function submitOrder(order: Order, label: string) {
  logStep(`${label} - submit order`, order);
  const result = createOrder(order);
  logStep(`${label} - createOrder result`, result);
  logStep(`${label} - orderbook snapshot`, getOrderbookSnapshot());
  return result;
}

export type E2ESeedResult = {
  markPrice: number;
  positions: ReturnType<typeof getPositionsSnapshot>;
  users: ReturnType<typeof getUsersSnapshot>;
  taker202: ReturnType<typeof getPositionsSnapshot>[number] | undefined;
  liquidationEvents?: {
    indexPrice: number;
    taker202PositionExists: boolean;
  }[];
};

type RunE2ESeedOptions = {
  simulateLiquidationFlow?: boolean;
  randomPriceSteps?: number;
  maxRandomMoveBps?: number;
};

function randomizePrice(
  price: number,
  maxMoveBps: number,
  minPrice = 100,
): number {
  const moveBps = (Math.random() * 2 - 1) * maxMoveBps;
  const moved = price * (1 + moveBps / 10_000);
  return Number(Math.max(minPrice, moved).toFixed(2));
}

function runRandomLiquidationFlow(
  startPrice: number,
  stepCount: number,
  maxMoveBps: number,
) {
  const events: { indexPrice: number; taker202PositionExists: boolean }[] = [];

  // Keep deep bid liquidity so any liquidation SHORT market order can match.
  submitOrder(
    makeOrder({
      id: "liq-liquidity-bid",
      userId: 101,
      side: SIDE.LONG,
      qty: 50,
      price: 1_000_000,
    }),
    "Step 7a",
  );

  let indexPrice = startPrice;
  for (let step = 1; step <= stepCount; step++) {
    indexPrice = randomizePrice(indexPrice, maxMoveBps);
    orderbooks.BTC.indexPrice = indexPrice;
    liquidatePositions(indexPrice);

    events.push({
      indexPrice,
      taker202PositionExists: Boolean(getPosition(202)),
    });
  }

  // Ensure the flow demonstrates liquidation even if random walk did not cross.
  const taker202 = getPosition(202);
  if (taker202) {
    const forcedLiqPrice = Number(
      (taker202.estimatedLiquidationPrice - 1).toFixed(2),
    );
    orderbooks.BTC.indexPrice = forcedLiqPrice;
    liquidatePositions(forcedLiqPrice);
    events.push({
      indexPrice: forcedLiqPrice,
      taker202PositionExists: Boolean(getPosition(202)),
    });
  }

  logStep("Random index-price liquidation flow", events);
  return events;
}

export function runE2ESeed(
  markPrice = E2E_MARK_PRICE,
  options: RunE2ESeedOptions = {},
): E2ESeedResult {
  const {
    simulateLiquidationFlow = false,
    randomPriceSteps = 8,
    maxRandomMoveBps = 120,
  } = options;
  logStep("E2E seed start");
  resetE2EState(markPrice);
  logStep("State reset", {
    positions: POSITIONS.size,
    markPrice: orderbooks.BTC.indexPrice,
    orderbook: getOrderbookSnapshot(),
  });

  ensureUsers();
  logStep("Users ensured", getUsersSnapshot());

  // Seed resting SHORT liquidity (maker side).
  submitOrder(
    makeOrder({
      id: "maker-short-1",
      userId: 101,
      side: "SHORT",
      qty: 2,
      price: 50_000,
    }),
    "Step 1",
  );
  submitOrder(
    makeOrder({
      id: "maker-short-2",
      userId: 303,
      side: "SHORT",
      qty: 1.5,
      price: 50_100,
    }),
    "Step 2",
  );

  // Taker LONG matches both asks and opens positions.
  const takerResult = submitOrder(
    makeOrder({
      id: "taker-long-1",
      userId: 202,
      side: "LONG",
      qty: 3,
      price: 50_200,
    }),
    "Step 3",
  );
  applyFillsToPositions(takerResult.data);

  submitOrder(
    makeOrder({
      id: "maker-short-3",
      userId: 101,
      side: "SHORT",
      qty: 1,
      price: 50_300,
    }),
    "Step 4",
  );
  const scaleInResult = submitOrder(
    makeOrder({
      id: "taker-long-2",
      userId: 202,
      side: "LONG",
      qty: 1,
      price: 50_300,
    }),
    "Step 5",
  );
  applyFillsToPositions(scaleInResult.data);

  // Partial close taker LONG at mark (resting bid then taker SHORT).
  submitOrder(
    makeOrder({
      id: "maker-long-for-close",
      userId: 101,
      side: "LONG",
      qty: 1,
      price: 50_200,
    }),
    "Step 6a",
  );
  const partialCloseResult = submitOrder(
    makeOrder({
      id: "taker-partial-close",
      userId: 202,
      side: "SHORT",
      qty: 1,
      price: 50_200,
    }),
    "Step 6b",
  );
  applyFillsToPositions(partialCloseResult.data);

  const positions = getPositionsSnapshot();
  const taker202 = positions.find((p) => p.userId === 202);
  const liquidationEvents = simulateLiquidationFlow
    ? runRandomLiquidationFlow(markPrice, randomPriceSteps, maxRandomMoveBps)
    : undefined;

  logStep("E2E seed complete", {
    positions,
    users: getUsersSnapshot(),
    btcBook: {
      bids: orderbooks.BTC.bids.length,
      asks: orderbooks.BTC.asks.length,
      indexPrice: orderbooks.BTC.indexPrice,
    },
  });

  return {
    markPrice,
    positions,
    users: getUsersSnapshot(),
    taker202,
    liquidationEvents,
  };
}

function getPosition(userId: number, market = "BTC") {
  return POSITIONS.get(generatePositionKey(userId.toString(), market));
}

export { getPosition, E2E_MARK_PRICE };

if (import.meta.main) {
  const result = runE2ESeed(E2E_MARK_PRICE, { simulateLiquidationFlow: true });
  console.log("=== E2E Seed Complete ===");
  console.log(JSON.stringify(result, null, 2));
}
