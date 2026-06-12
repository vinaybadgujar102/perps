#!/usr/bin/env bun
/**
 * Dev script: seeds and maintains a multi-level BTC orderbook with realistic
 * resting liquidity. Bids always stay below asks — no matching.
 *
 * Requires: Redis + trade-engine (+ wsServer for live depth UI).
 *
 * Usage:
 *   bun run simulate:orderbook
 *
 * Env:
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

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomQty(levelIndex: number) {
  // Larger size near the touch, thinner further away — typical book shape.
  const touchWeight = Math.max(0.35, 1 - levelIndex * 0.07);
  const base = MIN_QTY + (MAX_QTY - MIN_QTY) * touchWeight;
  return Math.max(MIN_QTY, Math.round(base * (0.75 + Math.random() * 0.5)));
}

function pickSimUser() {
  return simUserIds[randomInt(0, simUserIds.length - 1)]!;
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

async function ensureSimUser(publisher: RedisClientType, userId: number) {
  const createUserRes = await dispatch(publisher, {
    kind: EVENT_KINDS.CREATE_USER,
    payload: { userId },
  });

  if (createUserRes.success) {
    console.log(`Created sim user ${userId}`);
  } else if (createUserRes.message !== "USER_ALREADY_EXISTS") {
    throw new Error(createUserRes.message ?? `Failed to create sim user ${userId}`);
  }

  unwrapEngine(
    await dispatch(publisher, {
      kind: EVENT_KINDS.CREDIT_BALANCE,
      payload: {
        userId,
        amountUsd: 500_000_000,
        onrampId: crypto.randomUUID(),
      },
    }),
  );
}

async function placeOrder(
  publisher: RedisClientType,
  userId: number,
  side: SIDE,
  price: number,
  qty: number,
): Promise<RestingOrder> {
  assertNoCross(side, price);

  const orderId = crypto.randomUUID();
  const fills =
    unwrapEngine<Array<{ filledQty: number }> | null>(
      await dispatch(publisher, {
        kind: EVENT_KINDS.CREATE_ORDER,
        userId,
        payload: {
          id: orderId,
          market: MARKET,
          side,
          qty,
          orderType: ORDER_TYPE.LIMIT_ORDER,
          price,
        },
      }),
    ) ?? [];

  if (fills.length > 0) {
    throw new Error(
      `Unexpected match at ${side} ${formatPrice(price)} — ${fills.length} fill(s)`,
    );
  }

  const order: RestingOrder = { id: orderId, userId, side, price, qty };
  restingOrders.push(order);
  return order;
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

async function bootstrapBook(publisher: RedisClientType) {
  console.log("Seeding initial depth...");

  // Place asks first (farther from mid), then bids — guarantees no cross on seed.
  for (let level = DEPTH_LEVELS - 1; level >= 0; level--) {
    const ask = await placeOrder(
      publisher,
      pickSimUser(),
      SIDE.SHORT,
      askPriceAtLevel(level),
      randomQty(level),
    );
    console.log(
      `  ask L${level} ${formatPrice(ask.price)} x ${formatQty(ask.qty)} BTC`,
    );
    await sleep(50);
  }

  for (let level = 0; level < DEPTH_LEVELS; level++) {
    const bid = await placeOrder(
      publisher,
      pickSimUser(),
      SIDE.LONG,
      bidPriceAtLevel(level),
      randomQty(level),
    );
    console.log(
      `  bid L${level} ${formatPrice(bid.price)} x ${formatQty(bid.qty)} BTC`,
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
    `[book] bids=${bidCount} asks=${askCount} | best ${bid !== null ? formatPrice(bid) : "--"} / ${ask !== null ? formatPrice(ask) : "--"} | resting=${restingOrders.length}`,
  );
}

async function addLiquidity(publisher: RedisClientType) {
  const side = Math.random() < 0.5 ? SIDE.LONG : SIDE.SHORT;
  const level = randomInt(0, DEPTH_LEVELS - 1);
  const price =
    side === SIDE.LONG ? bidPriceAtLevel(level) : askPriceAtLevel(level);
  const qty = randomQty(level);

  const order = await placeOrder(publisher, pickSimUser(), side, price, qty);
  console.log(
    `[+] ${side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC`,
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
  const order = await placeOrder(
    publisher,
    pickSimUser(),
    side,
    touchPrice,
    newQty,
  );

  console.log(
    `[~] touch ${side === SIDE.LONG ? "bid" : "ask"} ${formatPrice(order.price)} x ${formatQty(order.qty)} BTC`,
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

  const replaced = await placeOrder(
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

async function simulateTick(publisher: RedisClientType) {
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
  const consumer = createClient({ url: REDIS_URL });
  const publisher = createClient({ url: REDIS_URL });

  await consumer.connect();
  await publisher.connect();

  void startResponseListener(consumer);

  console.log("Orderbook simulator started");
  console.log(
    [
      `market=${MARKET}`,
      `mid=${formatPrice(MID_PRICE)}`,
      `spread=${formatPrice(SPREAD)}`,
      `step=${formatPrice(PRICE_STEP)}`,
      `levels=${DEPTH_LEVELS}`,
      `users=${simUserIds.join(",")}`,
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
