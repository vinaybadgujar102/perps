#!/usr/bin/env bun
/**
 * Dev script: seeds a multi-level BTC orderbook and simulates realistic
 * activity — passive liquidity updates plus actual trades between sim users.
 *
 * Requires: Redis + trade-engine + Postgres (DATABASE_URL) + db-poller for full E2E.
 *
 * Usage:
 *   bun run simulate:orderbook
 *
 * Env:
 *   DATABASE_URL        required — seeds markets + sim users in Postgres for db-poller
 *   DEMO_USER_EMAIL     default demo@perps.local (login account for the UI)
 *   DEMO_USER_PASSWORD  default demo1234
 *   DEMO_SEED_LOGIN_USER default true — credits a demo login user in engine + Postgres
 *   REDIS_URL           default redis://localhost:6379
 *   SIM_INTERVAL_MS     default 1500 (base tick; actual delay is jittered)
 *   SIM_USER_BASE       default 9001 (creates SIM_USER_COUNT users from here)
 *   SIM_USER_COUNT      default 5
 *   SIM_DEPTH_LEVELS    default 10 (matches engine snapshot limit)
 *   SIM_MID_PRICE       default 6100000 ($61,000.00)
 *   SIM_SPREAD          default 3000 ($30.00 between best bid and best ask)
 *   SIM_PRICE_STEP      default 1000 ($10.00 between levels)
 *   SIM_MIN_QTY         default 5   (0.05 BTC with quantityScale=2)
 *   SIM_MAX_QTY         default 40  (0.40 BTC)
 *   SIM_TRADE_PROB      default 0.35 (chance each tick executes a cross)
 */

import { createClient, type RedisClientType } from "redis";
import {
  AssetConfig,
  EVENT_KINDS,
  ORDER_TYPE,
  QUEUES,
  SIDE,
  eventSchema,
} from "@repo/sharedtypes";
import {
  ensureDemoLoginUserInDb,
  seedDemoDatabase,
} from "./lib/demo-db-seed";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS ?? 1500);
const SIM_USER_BASE = Number(process.env.SIM_USER_BASE ?? 9001);
const SIM_USER_COUNT = Number(process.env.SIM_USER_COUNT ?? 5);
const DEPTH_LEVELS = Number(process.env.SIM_DEPTH_LEVELS ?? 10);
const MID_PRICE = Number(process.env.SIM_MID_PRICE ?? 6_100_000);
const SPREAD = Number(process.env.SIM_SPREAD ?? 3_000);
const PRICE_STEP = Number(process.env.SIM_PRICE_STEP ?? 1_000);
const MIN_QTY = Number(process.env.SIM_MIN_QTY ?? 5);
const MAX_QTY = Number(process.env.SIM_MAX_QTY ?? 40);
const TRADE_PROB = Number(process.env.SIM_TRADE_PROB ?? 0.35);
const DEMO_SEED_LOGIN_USER = process.env.DEMO_SEED_LOGIN_USER !== "false";
const DEMO_LOGIN_BALANCE_USD = Number(
  process.env.DEMO_LOGIN_BALANCE_USD ?? 100_000_000,
);
const MARKET = "BTC";

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
const simUserIds = Array.from(
  { length: SIM_USER_COUNT },
  (_, i) => SIM_USER_BASE + i,
);

let tradeCount = 0;
let totalFilledQty = 0;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomQty(levelIndex: number) {
  const touchWeight = Math.max(0.35, 1 - levelIndex * 0.07);
  const base = MIN_QTY + (MAX_QTY - MIN_QTY) * touchWeight;
  return Math.max(MIN_QTY, Math.round(base * (0.75 + Math.random() * 0.5)));
}

function pickSimUser() {
  return simUserIds[randomInt(0, simUserIds.length - 1)]!;
}

function pickTakerUser(excludeUserId: number) {
  const candidates = simUserIds.filter((id) => id !== excludeUserId);
  if (candidates.length === 0) return simUserIds[0]!;
  return candidates[randomInt(0, candidates.length - 1)]!;
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
}

async function ensureSimUser(publisher: RedisClientType, userId: number) {
  await ensureEngineUser(publisher, userId, 100_000_000, "sim user");
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
          leverage: 20,
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
  userId: number,
  side: SIDE,
  price: number,
  qty: number,
): Promise<RestingOrder> {
  assertNoCross(side, price);

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
    const tradeQty = Math.min(
      randomQty(0),
      available,
      maker.qty,
    );
    if (tradeQty < MIN_QTY) return;

    const takerUserId = pickTakerUser(maker.userId);
    const { fills } = await createOrder(
      publisher,
      takerUserId,
      SIDE.LONG,
      bestAsk,
      tradeQty,
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
  const tradeQty = Math.min(randomQty(0), available, maker.qty);
  if (tradeQty < MIN_QTY) return;

  const takerUserId = pickTakerUser(maker.userId);
  const { fills } = await createOrder(
    publisher,
    takerUserId,
    SIDE.SHORT,
    bestBid,
    tradeQty,
  );

  if (fills.length === 0) {
    console.log(`[trade] no fill — SELL user ${takerUserId} @ ${formatPrice(bestBid)}`);
    return;
  }

  logTrade(fills);
}

async function bootstrapBook(publisher: RedisClientType) {
  console.log("Seeding initial depth...");

  for (let level = DEPTH_LEVELS - 1; level >= 0; level--) {
    const ask = await placeRestingOrder(
      publisher,
      pickSimUser(),
      SIDE.SHORT,
      askPriceAtLevel(level),
      randomQty(level),
    );
    console.log(
      `  ask L${level} ${formatPrice(ask.price)} x ${formatQty(ask.qty)} BTC (user ${ask.userId})`,
    );
    await sleep(50);
  }

  for (let level = 0; level < DEPTH_LEVELS; level++) {
    const bid = await placeRestingOrder(
      publisher,
      pickSimUser(),
      SIDE.LONG,
      bidPriceAtLevel(level),
      randomQty(level),
    );
    console.log(
      `  bid L${level} ${formatPrice(bid.price)} x ${formatQty(bid.qty)} BTC (user ${bid.userId})`,
    );
    await sleep(50);
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
  const level = randomInt(0, DEPTH_LEVELS - 1);
  const price =
    side === SIDE.LONG ? bidPriceAtLevel(level) : askPriceAtLevel(level);
  const qty = randomQty(level);

  const order = await placeRestingOrder(publisher, pickSimUser(), side, price, qty);
  console.log(
    `[+] ${side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC (user ${order.userId})`,
  );
}

async function pullLiquidity(publisher: RedisClientType) {
  if (restingOrders.length === 0) return;

  const index = randomInt(0, restingOrders.length - 1);
  const order = restingOrders[index]!;
  await cancelOrder(publisher, order.id);
  console.log(
    `[-] ${order.side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC`,
  );
}

async function refreshTouch(publisher: RedisClientType) {
  const side = Math.random() < 0.5 ? SIDE.LONG : SIDE.SHORT;
  const touchOrders = restingOrders.filter((o) => o.side === side);
  if (touchOrders.length === 0) return;

  const touchPrice =
    side === SIDE.LONG
      ? Math.max(...touchOrders.map((o) => o.price))
      : Math.min(...touchOrders.map((o) => o.price));

  const atTouch = touchOrders.filter((o) => o.price === touchPrice);
  const toReplace = atTouch[randomInt(0, atTouch.length - 1)]!;

  await cancelOrder(publisher, toReplace.id);

  const newQty = randomQty(0);
  const order = await placeRestingOrder(
    publisher,
    pickSimUser(),
    side,
    touchPrice,
    newQty,
  );

  console.log(
    `[~] touch ${side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC (user ${order.userId})`,
  );
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

  const replaced = await placeRestingOrder(
    publisher,
    pickSimUser(),
    side,
    newPrice,
    newQty,
  );

  console.log(
    `[↔] ${side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} → ${formatPrice(replaced.price)} x ${formatQty(replaced.qty)} BTC`,
  );
}

async function replenishIfThin(publisher: RedisClientType) {
  const bidLevels = new Set(
    restingOrders.filter((o) => o.side === SIDE.LONG).map((o) => o.price),
  ).size;
  const askLevels = new Set(
    restingOrders.filter((o) => o.side === SIDE.SHORT).map((o) => o.price),
  ).size;

  const minLevels = Math.max(3, Math.floor(DEPTH_LEVELS / 2));

  for (let level = bidLevels; level < minLevels; level++) {
    const price = bidPriceAtLevel(level);
    if (ordersAtPrice(SIDE.LONG, price).length > 0) continue;
    const order = await placeRestingOrder(
      publisher,
      pickSimUser(),
      SIDE.LONG,
      price,
      randomQty(level),
    );
    console.log(
      `[↺] refill bid L${level} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC`,
    );
  }

  for (let level = askLevels; level < minLevels; level++) {
    const price = askPriceAtLevel(level);
    if (ordersAtPrice(SIDE.SHORT, price).length > 0) continue;
    const order = await placeRestingOrder(
      publisher,
      pickSimUser(),
      SIDE.SHORT,
      price,
      randomQty(level),
    );
    console.log(
      `[↺] refill ask L${level} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC`,
    );
  }
}

async function simulateTick(publisher: RedisClientType) {
  if (Math.random() < TRADE_PROB) {
    await executeTrade(publisher);
    await replenishIfThin(publisher);
    return;
  }

  const roll = Math.random();

  if (roll < 0.35) {
    await addLiquidity(publisher);
  } else if (roll < 0.6) {
    await pullLiquidity(publisher);
  } else if (roll < 0.8) {
    await refreshTouch(publisher);
  } else {
    await shiftLevel(publisher);
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

  console.log("Orderbook + trade simulator started");
  console.log(
    [
      `market=${MARKET}`,
      `mid=${formatPrice(MID_PRICE)}`,
      `spread=${formatPrice(SPREAD)}`,
      `step=${formatPrice(PRICE_STEP)}`,
      `levels=${DEPTH_LEVELS}`,
      `users=${simUserIds.join(",")}`,
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
