#!/usr/bin/env bun
/**
 * Dev script: seeds a multi-level BTC orderbook and simulates realistic
 * activity — passive liquidity updates plus actual trades between sim users.
 *
 * Requires: Redis + trade-engine + Postgres (DATABASE_URL) + db-poller for full E2E.
 * Does NOT require TimescaleDB / DB_URL — candles are independent (fake under HOSTED_DEMO).
 *
 * Usage:
 *   bun run simulate:orderbook
 *
 * Env:
 *   DATABASE_URL        required — seeds markets + sim users in Postgres for db-poller
 *   DEMO_USER_EMAIL     default demo@perps.local (login account for the UI)
 *   DEMO_USER_PASSWORD  default demo1234
 *   DEMO_SEED_LOGIN_USER default true — credits a demo login user in engine + Postgres
 *   HOSTED_DEMO         when true: low-volume defaults; no Timescale needed for charts
 *   REDIS_URL           default redis://localhost:6379
 *   SIM_INTERVAL_MS     default 1500 (hosted: 9000)
 *   SIM_USER_BASE       default 9001 (creates SIM_USER_COUNT users from here)
 *   SIM_USER_COUNT      default 12 (hosted: 5)
 *   SIM_DEPTH_LEVELS    default 10 (hosted: 5; matches engine snapshot limit)
 *   SIM_ORDERS_PER_LEVEL default 6 (hosted: 2; stacked makers per price level)
 *   SIM_MID_PRICE       default 6100000 ($61,000.00)
 *   SIM_SPREAD          default 1000 ($10.00 between best bid and best ask)
 *   SIM_PRICE_STEP      default 500  ($5.00 between levels — denser book)
 *   SIM_MIN_QTY         default 150  (1.50 BTC with quantityScale=2)
 *   SIM_MAX_QTY         default 2500 (25.00 BTC)
 *   SIM_TOUCH_MIN_QTY   default 400  (4.00 BTC at best bid/ask)
 *   SIM_TOUCH_MAX_QTY   default 5000 (50.00 BTC at best bid/ask)
 *   SIM_TRADE_PROB      default 0.12 (hosted: 0.02; chance each tick executes a cross)
 *   SIM_TRADE_MAX_QTY   default 120 (1.20 BTC max per simulated cross)
 *   SIM_PULL_PROB       default 0.03 (hosted: 0.01; chance to cancel a deep order)
 *   SIM_USER_BALANCE_DISPLAY_USD default 50000000 ($50M per sim user)
 *   SIM_LEVERAGE        default 20 (max for BTC)
 */

import { createClient, type RedisClientType } from "redis";
import {
  AssetConfig,
  EVENT_KINDS,
  ORDER_TYPE,
  QUEUES,
  SIDE,
  eventSchema,
  scaleDisplayUsdToEngine,
} from "@repo/sharedtypes";
import {
  ensureDemoLoginUserInDb,
  seedDemoDatabase,
} from "./lib/demo-db-seed";

const HOSTED_DEMO = process.env.HOSTED_DEMO === "true";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
// Hosted demo defaults keep Redis lean; any SIM_* env override still wins.
const INTERVAL_MS = Number(
  process.env.SIM_INTERVAL_MS ?? (HOSTED_DEMO ? 9000 : 1500),
);
const SIM_USER_BASE = Number(process.env.SIM_USER_BASE ?? 9001);
const SIM_USER_COUNT = Number(
  process.env.SIM_USER_COUNT ?? (HOSTED_DEMO ? 5 : 12),
);
const DEPTH_LEVELS = Number(
  process.env.SIM_DEPTH_LEVELS ?? (HOSTED_DEMO ? 5 : 10),
);
const ORDERS_PER_LEVEL = Number(
  process.env.SIM_ORDERS_PER_LEVEL ?? (HOSTED_DEMO ? 2 : 6),
);
const MID_PRICE = Number(process.env.SIM_MID_PRICE ?? 6_100_000);
const SPREAD = Number(process.env.SIM_SPREAD ?? 1_000);
const PRICE_STEP = Number(process.env.SIM_PRICE_STEP ?? 500);
const MIN_QTY = Number(process.env.SIM_MIN_QTY ?? 150);
const MAX_QTY = Number(process.env.SIM_MAX_QTY ?? 2_500);
const TOUCH_MIN_QTY = Number(process.env.SIM_TOUCH_MIN_QTY ?? 400);
const TOUCH_MAX_QTY = Number(process.env.SIM_TOUCH_MAX_QTY ?? 5_000);
const TRADE_PROB = Number(
  process.env.SIM_TRADE_PROB ?? (HOSTED_DEMO ? 0.02 : 0.12),
);
const TRADE_MAX_QTY = Number(process.env.SIM_TRADE_MAX_QTY ?? 120);
const PULL_PROB = Number(
  process.env.SIM_PULL_PROB ?? (HOSTED_DEMO ? 0.01 : 0.03),
);
const MARKET = "BTC";
const SIM_USER_BALANCE_DISPLAY_USD = Number(
  process.env.SIM_USER_BALANCE_DISPLAY_USD ?? 50_000_000,
);
const SIM_LEVERAGE = Number(process.env.SIM_LEVERAGE ?? AssetConfig.BTC.maxLeverage);
const SIM_USER_BALANCE = scaleDisplayUsdToEngine(
  SIM_USER_BALANCE_DISPLAY_USD,
  MARKET,
);
const DEMO_SEED_LOGIN_USER = process.env.DEMO_SEED_LOGIN_USER !== "false";
const DEMO_LOGIN_BALANCE_USD = Number(
  process.env.DEMO_LOGIN_BALANCE_USD ?? 5_000_000_000,
);

const { priceScale, quantityScale } = AssetConfig[MARKET];
const BEST_BID = MID_PRICE - Math.floor(SPREAD / 2);
const BEST_ASK = MID_PRICE + Math.ceil(SPREAD / 2);

type EngineData<T> = {
  success: boolean;
  message: string | null;
  data: T | null;
};

type PendingRequest = {
  resolve: (value: EngineData<unknown>) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type TradeFill = {
  id: string;
  makerId: number;
  takerId: number;
  makerOrderId: string;
  takerOrderId: string;
  filledQty: number;
  price: number;
  takerSide: SIDE;
  makerSide: SIDE;
};

type RestingOrder = {
  id: string;
  userId: number;
  side: SIDE;
  price: number;
  qty: number;
};

const pending = new Map<string, PendingRequest>();
const restingOrders: RestingOrder[] = [];
const userMargin = new Map<number, { balance: number; locked: number }>();
const simUserIds = Array.from(
  { length: SIM_USER_COUNT },
  (_, i) => SIM_USER_BASE + i,
);

let tradeCount = 0;
let totalFilledQty = 0;
let seedUserIndex = 0;

function requiredCollateral(price: number, qty: number) {
  return (price * qty) / SIM_LEVERAGE;
}

function creditUserMargin(userId: number, amount: number) {
  const existing = userMargin.get(userId);
  if (existing) {
    existing.balance += amount;
    return;
  }
  userMargin.set(userId, { balance: amount, locked: 0 });
}

function getAvailableMargin(userId: number) {
  const state = userMargin.get(userId);
  if (!state) return 0;
  return state.balance - state.locked;
}

function reserveLocalMargin(userId: number, price: number, qty: number) {
  const state = userMargin.get(userId);
  if (!state) {
    throw new Error(`Unknown sim user ${userId}`);
  }

  const required = requiredCollateral(price, qty);
  if (getAvailableMargin(userId) < required) {
    throw new Error(`Local margin tracking out of sync for user ${userId}`);
  }
  state.locked += required;
}

function releaseLocalMargin(userId: number, price: number, qty: number) {
  const state = userMargin.get(userId);
  if (!state) return;

  state.locked = Math.max(
    0,
    state.locked - requiredCollateral(price, qty),
  );
}

function capQtyToMargin(userId: number, price: number, desiredQty: number) {
  const maxQty = Math.floor(
    (getAvailableMargin(userId) * SIM_LEVERAGE) / price,
  );
  return Math.max(0, Math.min(desiredQty, maxQty));
}

function pickSimUserWithMargin(price: number, qty: number) {
  const required = requiredCollateral(price, qty);
  const rotated = [
    ...simUserIds.slice(seedUserIndex),
    ...simUserIds.slice(0, seedUserIndex),
  ];

  for (const userId of rotated) {
    if (getAvailableMargin(userId) >= required) {
      seedUserIndex = (simUserIds.indexOf(userId) + 1) % simUserIds.length;
      return userId;
    }
  }

  let bestUser = simUserIds[0]!;
  let bestAvailable = getAvailableMargin(bestUser);
  for (const userId of simUserIds) {
    const available = getAvailableMargin(userId);
    if (available > bestAvailable) {
      bestAvailable = available;
      bestUser = userId;
    }
  }
  return bestUser;
}

function pickTakerUserWithMargin(
  excludeUserId: number,
  price: number,
  qty: number,
) {
  const required = requiredCollateral(price, qty);
  const candidates = simUserIds.filter((id) => id !== excludeUserId);

  for (const userId of candidates) {
    if (getAvailableMargin(userId) >= required) {
      return userId;
    }
  }

  return null;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomQty(levelIndex: number) {
  if (levelIndex === 0) {
    return randomInt(TOUCH_MIN_QTY, TOUCH_MAX_QTY);
  }

  const depthFalloff = Math.max(0.45, 1 - levelIndex * 0.05);
  const base = MIN_QTY + (MAX_QTY - MIN_QTY) * depthFalloff;
  return Math.max(MIN_QTY, Math.round(base * (0.85 + Math.random() * 0.3)));
}

function targetQtyAtLevel(levelIndex: number) {
  if (levelIndex === 0) {
    return randomInt(TOUCH_MIN_QTY, TOUCH_MAX_QTY);
  }
  return randomQty(levelIndex);
}

function randomTradeQty(available: number, makerQty: number) {
  if (available < MIN_QTY) return 0;

  const cap = Math.min(TRADE_MAX_QTY, available, makerQty);
  const floor = Math.min(MIN_QTY, cap);
  return randomInt(floor, cap);
}

function bidPriceAtLevel(levelIndex: number) {
  return BEST_BID - levelIndex * PRICE_STEP;
}

function askPriceAtLevel(levelIndex: number) {
  return BEST_ASK + levelIndex * PRICE_STEP;
}

function formatPrice(price: number) {
  return (price / 10 ** priceScale).toFixed(priceScale);
}

function formatQty(qty: number) {
  return (qty / 10 ** quantityScale).toFixed(quantityScale);
}

function sleep(ms: number) {
  return Bun.sleep(ms);
}

function jitteredInterval() {
  return INTERVAL_MS + randomInt(-400, 400);
}

function unwrapEngine<T>(data: EngineData<T>): T {
  if (!data.success || data.data === null) {
    throw new Error(data.message ?? "Engine request failed");
  }
  return data.data;
}

function bestBidPrice() {
  const bids = restingOrders.filter((o) => o.side === SIDE.LONG);
  return bids.length > 0 ? Math.max(...bids.map((o) => o.price)) : null;
}

function bestAskPrice() {
  const asks = restingOrders.filter((o) => o.side === SIDE.SHORT);
  return asks.length > 0 ? Math.min(...asks.map((o) => o.price)) : null;
}

function ordersAtPrice(side: SIDE, price: number) {
  return restingOrders.filter((o) => o.side === side && o.price === price);
}

function availableQtyAtPrice(side: SIDE, price: number) {
  return ordersAtPrice(side, price).reduce((sum, o) => sum + o.qty, 0);
}

function assertNoCross(side: SIDE, price: number) {
  const bestBid = bestBidPrice();
  const bestAsk = bestAskPrice();

  if (side === SIDE.LONG && bestAsk !== null && price >= bestAsk) {
    throw new Error(
      `Bid ${formatPrice(price)} would cross best ask ${formatPrice(bestAsk)}`,
    );
  }
  if (side === SIDE.SHORT && bestBid !== null && price <= bestBid) {
    throw new Error(
      `Ask ${formatPrice(price)} would cross best bid ${formatPrice(bestBid)}`,
    );
  }
}

function applyFillsToLocalBook(fills: TradeFill[]) {
  for (const fill of fills) {
    const maker = restingOrders.find((o) => o.id === fill.makerOrderId);
    if (!maker) continue;

    releaseLocalMargin(maker.userId, maker.price, fill.filledQty);
    maker.qty -= fill.filledQty;
    if (maker.qty <= 0) {
      const index = restingOrders.findIndex((o) => o.id === maker.id);
      if (index !== -1) restingOrders.splice(index, 1);
    }
  }
}

function logTrade(fills: TradeFill[]) {
  for (const fill of fills) {
    tradeCount += 1;
    totalFilledQty += fill.filledQty;
    const action = fill.takerSide === SIDE.LONG ? "BUY" : "SELL";
    console.log(
      `[trade] ${action} ${formatQty(fill.filledQty)} BTC @ $${formatPrice(fill.price)} | taker=${fill.takerId} maker=${fill.makerId}`,
    );
  }
}

async function startResponseListener(consumer: RedisClientType) {
  let lastId = "$";

  while (true) {
    try {
      const res = await consumer.xRead(
        { key: QUEUES.RESPONSE_QUEUE, id: lastId },
        { COUNT: 1, BLOCK: 0 },
      );

      if (!res?.[0]?.messages?.[0]) continue;

      const message = res[0].messages[0];
      lastId = message.id;

      try {
        const parsed = eventSchema.parse(JSON.parse(message.message.data));
        if (!("requestId" in parsed) || !parsed.requestId) continue;

        const pendingRequest = pending.get(parsed.requestId);
        if (!pendingRequest) continue;

        clearTimeout(pendingRequest.timeoutId);
        pending.delete(parsed.requestId);
        pendingRequest.resolve(parsed.data as EngineData<unknown>);
      } catch (error) {
        console.error("[simulate-orderbook] response parse error", error);
      }
    } catch (error) {
      console.error(
        "[simulate-orderbook] redis consumer error, resetting cursor to $",
        error,
      );
      lastId = "$";
    }
  }
}

async function dispatch(
  publisher: RedisClientType,
  payload: Record<string, unknown>,
): Promise<EngineData<unknown>> {
  const requestId = crypto.randomUUID();

  const response = new Promise<EngineData<unknown>>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`Request timed out: ${payload.kind}`));
    }, 10_000);

    pending.set(requestId, { resolve, reject, timeoutId });
  });

  await publisher.xAdd(QUEUES.SEND_QUEUE, "*", {
    data: JSON.stringify({ requestId, ...payload }),
  });

  return response;
}

async function ensureEngineUser(
  publisher: RedisClientType,
  userId: number,
  balanceUsd: number,
  label: string,
) {
  const createUserRes = await dispatch(publisher, {
    kind: EVENT_KINDS.CREATE_USER,
    payload: { userId },
  });

  if (createUserRes.success) {
    console.log(`Created ${label} ${userId} in trade engine`);
  } else if (createUserRes.message !== "USER_ALREADY_EXISTS") {
    throw new Error(
      createUserRes.message ?? `Failed to create ${label} ${userId}`,
    );
  }

  unwrapEngine(
    await dispatch(publisher, {
      kind: EVENT_KINDS.CREDIT_BALANCE,
      payload: {
        userId,
        amountUsd: balanceUsd,
        onrampId: crypto.randomUUID(),
      },
    }),
  );

  creditUserMargin(userId, balanceUsd);
}

async function ensureSimUser(publisher: RedisClientType, userId: number) {
  await ensureEngineUser(publisher, userId, SIM_USER_BALANCE, "sim user");
}

async function createOrder(
  publisher: RedisClientType,
  userId: number,
  side: SIDE,
  price: number,
  qty: number,
  orderType: ORDER_TYPE = ORDER_TYPE.LIMIT_ORDER,
): Promise<{ fills: TradeFill[]; resting: RestingOrder | null }> {
  const orderId = crypto.randomUUID();
  const fills =
    unwrapEngine<TradeFill[] | null>(
      await dispatch(publisher, {
        kind: EVENT_KINDS.CREATE_ORDER,
        userId,
        payload: {
          id: orderId,
          market: MARKET,
          side,
          qty,
          orderType,
          price,
          leverage: SIM_LEVERAGE,
        },
      }),
    ) ?? [];

  applyFillsToLocalBook(fills);

  const matchedQty = fills.reduce((sum, fill) => sum + fill.filledQty, 0);
  const remainingQty = qty - matchedQty;

  let resting: RestingOrder | null = null;
  if (remainingQty > 0 && orderType === ORDER_TYPE.LIMIT_ORDER) {
    resting = { id: orderId, userId, side, price, qty: remainingQty };
    restingOrders.push(resting);
  }

  return { fills, resting };
}

async function placeRestingOrder(
  publisher: RedisClientType,
  side: SIDE,
  price: number,
  desiredQty: number,
): Promise<RestingOrder | null> {
  assertNoCross(side, price);

  const userId = pickSimUserWithMargin(price, desiredQty);
  const qty = capQtyToMargin(userId, price, desiredQty);
  if (qty < MIN_QTY) {
    return null;
  }

  const { fills, resting } = await createOrder(
    publisher,
    userId,
    side,
    price,
    qty,
  );

  if (fills.length > 0) {
    throw new Error(
      `Unexpected match at passive ${side} ${formatPrice(price)} — ${fills.length} fill(s)`,
    );
  }

  if (!resting) {
    throw new Error(`Passive order did not rest on book: ${side} ${formatPrice(price)}`);
  }

  reserveLocalMargin(userId, price, resting.qty);
  return resting;
}

async function cancelOrder(publisher: RedisClientType, orderId: string) {
  const order = restingOrders.find((o) => o.id === orderId);
  if (!order) return;

  unwrapEngine(
    await dispatch(publisher, {
      kind: EVENT_KINDS.CANCEL_ORDER,
      userId: order.userId,
      payload: { orderId },
    }),
  );

  releaseLocalMargin(order.userId, order.price, order.qty);

  const index = restingOrders.findIndex((o) => o.id === orderId);
  if (index !== -1) restingOrders.splice(index, 1);
}

async function executeTrade(publisher: RedisClientType) {
  const bestBid = bestBidPrice();
  const bestAsk = bestAskPrice();
  if (bestBid === null || bestAsk === null) return;

  const takerSide = Math.random() < 0.5 ? SIDE.LONG : SIDE.SHORT;

  if (takerSide === SIDE.LONG) {
    const makers = ordersAtPrice(SIDE.SHORT, bestAsk);
    if (makers.length === 0) return;

    const maker = makers[randomInt(0, makers.length - 1)]!;
    const available = availableQtyAtPrice(SIDE.SHORT, bestAsk);
    const tradeQty = randomTradeQty(available, maker.qty);
    if (tradeQty < MIN_QTY) return;

    const takerUserId = pickTakerUserWithMargin(maker.userId, bestAsk, tradeQty);
    if (!takerUserId) return;

    const takerQty = capQtyToMargin(takerUserId, bestAsk, tradeQty);
    if (takerQty < MIN_QTY) return;

    const { fills } = await createOrder(
      publisher,
      takerUserId,
      SIDE.LONG,
      bestAsk,
      takerQty,
    );

    if (fills.length === 0) {
      console.log(`[trade] no fill — BUY user ${takerUserId} @ ${formatPrice(bestAsk)}`);
      return;
    }

    logTrade(fills);
    return;
  }

  const makers = ordersAtPrice(SIDE.LONG, bestBid);
  if (makers.length === 0) return;

  const maker = makers[randomInt(0, makers.length - 1)]!;
  const available = availableQtyAtPrice(SIDE.LONG, bestBid);
  const tradeQty = randomTradeQty(available, maker.qty);
  if (tradeQty < MIN_QTY) return;

  const takerUserId = pickTakerUserWithMargin(maker.userId, bestBid, tradeQty);
  if (!takerUserId) return;

  const takerQty = capQtyToMargin(takerUserId, bestBid, tradeQty);
  if (takerQty < MIN_QTY) return;

  const { fills } = await createOrder(
    publisher,
    takerUserId,
    SIDE.SHORT,
    bestBid,
    takerQty,
  );

  if (fills.length === 0) {
    console.log(`[trade] no fill — SELL user ${takerUserId} @ ${formatPrice(bestBid)}`);
    return;
  }

  logTrade(fills);
}

async function seedLevel(
  publisher: RedisClientType,
  side: SIDE,
  level: number,
  ordersToPlace = ORDERS_PER_LEVEL,
) {
  const price =
    side === SIDE.LONG ? bidPriceAtLevel(level) : askPriceAtLevel(level);

  for (let i = 0; i < ordersToPlace; i++) {
    const qty = randomQty(level);
    await placeRestingOrder(publisher, side, price, qty);
    await sleep(25);
  }
}

async function bootstrapBook(publisher: RedisClientType) {
  console.log("Seeding deep initial liquidity...");

  for (let level = DEPTH_LEVELS - 1; level >= 0; level--) {
    await seedLevel(publisher, SIDE.SHORT, level);
    const levelQty = availableQtyAtPrice(SIDE.SHORT, askPriceAtLevel(level));
    console.log(
      `  ask L${level} ${formatPrice(askPriceAtLevel(level))} x ${formatQty(levelQty)} BTC (${ORDERS_PER_LEVEL} orders)`,
    );
  }

  for (let level = 0; level < DEPTH_LEVELS; level++) {
    await seedLevel(publisher, SIDE.LONG, level);
    const levelQty = availableQtyAtPrice(SIDE.LONG, bidPriceAtLevel(level));
    console.log(
      `  bid L${level} ${formatPrice(bidPriceAtLevel(level))} x ${formatQty(levelQty)} BTC (${ORDERS_PER_LEVEL} orders)`,
    );
  }

  console.log(
    `Book seeded: ${restingOrders.length} resting orders | spread ${formatPrice(BEST_ASK - BEST_BID)}`,
  );
}

function logBookSnapshot() {
  const bid = bestBidPrice();
  const ask = bestAskPrice();
  const bidCount = restingOrders.filter((o) => o.side === SIDE.LONG).length;
  const askCount = restingOrders.filter((o) => o.side === SIDE.SHORT).length;

  console.log(
    `[book] bids=${bidCount} asks=${askCount} | best ${bid !== null ? formatPrice(bid) : "--"} / ${ask !== null ? formatPrice(ask) : "--"} | resting=${restingOrders.length} | trades=${tradeCount} vol=${formatQty(totalFilledQty)} BTC`,
  );
}

async function addLiquidity(publisher: RedisClientType) {
  const side = Math.random() < 0.5 ? SIDE.LONG : SIDE.SHORT;
  const level =
    Math.random() < 0.7 ? randomInt(0, 2) : randomInt(0, DEPTH_LEVELS - 1);
  const price =
    side === SIDE.LONG ? bidPriceAtLevel(level) : askPriceAtLevel(level);
  const qty = randomQty(level);

  const order = await placeRestingOrder(publisher, side, price, qty);
  if (!order) return;

  console.log(
    `[+] ${side === SIDE.LONG ? "bid" : "ask"} L${level} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC (user ${order.userId})`,
  );
}

async function pullLiquidity(publisher: RedisClientType) {
  if (restingOrders.length === 0) return;

  const deepOrders = restingOrders.filter((order) => {
    const level =
      order.side === SIDE.LONG
        ? Math.round((BEST_BID - order.price) / PRICE_STEP)
        : Math.round((order.price - BEST_ASK) / PRICE_STEP);
    return level >= 3;
  });

  const candidates = deepOrders.length > 0 ? deepOrders : restingOrders;
  const order = candidates[randomInt(0, candidates.length - 1)]!;
  await cancelOrder(publisher, order.id);
  console.log(
    `[-] ${order.side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC`,
  );
}

async function topUpTouch(publisher: RedisClientType) {
  for (const side of [SIDE.LONG, SIDE.SHORT] as const) {
    const touchPrice =
      side === SIDE.LONG ? bidPriceAtLevel(0) : askPriceAtLevel(0);
    const currentQty = availableQtyAtPrice(side, touchPrice);
    const targetQty = targetQtyAtLevel(0);

    if (currentQty >= targetQty) continue;

    const order = await placeRestingOrder(
      publisher,
      side,
      touchPrice,
      targetQty - currentQty,
    );
    if (!order) continue;

    console.log(
      `[~] top-up ${side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} +${formatQty(order.qty)} BTC (total ${formatQty(availableQtyAtPrice(side, touchPrice))})`,
    );
  }
}

async function shiftLevel(publisher: RedisClientType) {
  const side = Math.random() < 0.5 ? SIDE.LONG : SIDE.SHORT;
  const sideOrders = restingOrders.filter((o) => o.side === side);
  if (sideOrders.length === 0) return;

  const order = sideOrders[randomInt(0, sideOrders.length - 1)]!;
  await cancelOrder(publisher, order.id);

  const levelDelta = Math.random() < 0.5 ? 1 : -1;
  const currentLevel =
    side === SIDE.LONG
      ? Math.round((BEST_BID - order.price) / PRICE_STEP)
      : Math.round((order.price - BEST_ASK) / PRICE_STEP);

  const nextLevel = Math.min(
    DEPTH_LEVELS - 1,
    Math.max(0, currentLevel + levelDelta),
  );
  const newPrice =
    side === SIDE.LONG
      ? bidPriceAtLevel(nextLevel)
      : askPriceAtLevel(nextLevel);
  const newQty = randomQty(nextLevel);

  const replaced = await placeRestingOrder(publisher, side, newPrice, newQty);
  if (!replaced) return;

  console.log(
    `[↔] ${side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} → ${formatPrice(replaced.price)} x ${formatQty(replaced.qty)} BTC`,
  );
}

async function maintainBookDepth(publisher: RedisClientType) {
  for (let level = 0; level < DEPTH_LEVELS; level++) {
    for (const side of [SIDE.LONG, SIDE.SHORT] as const) {
      const price =
        side === SIDE.LONG ? bidPriceAtLevel(level) : askPriceAtLevel(level);
      const ordersAtLevel = ordersAtPrice(side, price);
      const currentQty = availableQtyAtPrice(side, price);
      const targetQty = targetQtyAtLevel(level);

      const missingOrders = ORDERS_PER_LEVEL - ordersAtLevel.length;
      for (let i = 0; i < missingOrders; i++) {
        const order = await placeRestingOrder(
          publisher,
          side,
          price,
          randomQty(level),
        );
        if (!order) continue;

        console.log(
          `[↺] stack ${side === SIDE.LONG ? "bid" : "ask"} L${level} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC`,
        );
      }

      if (currentQty < targetQty) {
        const order = await placeRestingOrder(
          publisher,
          side,
          price,
          targetQty - currentQty,
        );
        if (!order) continue;

        console.log(
          `[↺] refill ${side === SIDE.LONG ? "bid" : "ask"} L${level} ${formatPrice(order.price)} +${formatQty(order.qty)} BTC`,
        );
      }
    }
  }
}

async function simulateTick(publisher: RedisClientType) {
  if (Math.random() < TRADE_PROB) {
    await executeTrade(publisher);
    await topUpTouch(publisher);
    await maintainBookDepth(publisher);
    return;
  }

  const roll = Math.random();

  if (roll < 0.55) {
    await addLiquidity(publisher);
  } else if (roll < 0.75) {
    await topUpTouch(publisher);
  } else if (roll < 0.8 && Math.random() < PULL_PROB) {
    await pullLiquidity(publisher);
  } else if (roll < 0.9) {
    await shiftLevel(publisher);
  } else {
    await maintainBookDepth(publisher);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required so sim users and orders can persist via db-poller",
    );
  }

  await seedDemoDatabase(simUserIds);
  console.log(
    `Postgres seeded: markets + sim users ${simUserIds.join(", ")}`,
  );

  const consumer = createClient({ url: REDIS_URL });
  const publisher = createClient({ url: REDIS_URL });

  await consumer.connect();
  await publisher.connect();

  void startResponseListener(consumer);

  if (DEMO_SEED_LOGIN_USER) {
    const demoUser = await ensureDemoLoginUserInDb();
    await ensureEngineUser(
      publisher,
      demoUser.userId,
      DEMO_LOGIN_BALANCE_USD,
      "demo login user",
    );
    console.log(
      `Demo login ready: ${demoUser.email} / ${demoUser.password} (userId ${demoUser.userId})`,
    );
  }

  console.log(
    HOSTED_DEMO
      ? "Orderbook + trade simulator started (HOSTED_DEMO low-volume mode — no Timescale required)"
      : "Orderbook + trade simulator started",
  );
  console.log(
    [
      `market=${MARKET}`,
      `mid=${formatPrice(MID_PRICE)}`,
      `spread=${formatPrice(SPREAD)}`,
      `step=${formatPrice(PRICE_STEP)}`,
      `levels=${DEPTH_LEVELS}`,
      `ordersPerLevel=${ORDERS_PER_LEVEL}`,
      `qty=${formatQty(MIN_QTY)}-${formatQty(MAX_QTY)} BTC`,
      `touch=${formatQty(TOUCH_MIN_QTY)}-${formatQty(TOUCH_MAX_QTY)} BTC`,
      `users=${simUserIds.join(",")}`,
      `userBalance=$${SIM_USER_BALANCE_DISPLAY_USD.toLocaleString()}`,
      `tradeProb=${TRADE_PROB}`,
      `interval~${INTERVAL_MS}ms`,
    ].join(" | "),
  );

  for (const userId of simUserIds) {
    await ensureSimUser(publisher, userId);
  }

  await bootstrapBook(publisher);
  logBookSnapshot();

  let ticksSinceSnapshot = 0;

  while (true) {
    try {
      await simulateTick(publisher);
    } catch (error) {
      console.error(
        "[simulate-orderbook]",
        error instanceof Error ? error.message : error,
      );
    }

    ticksSinceSnapshot += 1;
    if (ticksSinceSnapshot >= 10) {
      logBookSnapshot();
      ticksSinceSnapshot = 0;
    }

    await sleep(jitteredInterval());
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
