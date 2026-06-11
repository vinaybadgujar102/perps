#!/usr/bin/env bun
/**
 * Dev script: continuously adds/cancels resting limit orders on BTC orderbook.
 * Bids stay below asks so nothing matches.
 *
 * Requires: Redis + trade-engine running (API optional).
 *
 * Usage:
 *   bun run simulate:orderbook
 *
 * Env:
 *   REDIS_URL          default redis://localhost:6379
 *   SIM_INTERVAL_MS    default 2000
 *   SIM_USER_ID        default 9001
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
const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS ?? 2000);
const SIM_USER_ID = Number(process.env.SIM_USER_ID ?? 9001);
const MARKET = "BTC";

const { priceScale, quantityScale } = AssetConfig[MARKET];
const QTY = 10 ** quantityScale; // 1.00 BTC
const BID_BASE = 6_000_000; // $60,000.00 (priceScale=2)
const ASK_BASE = 6_300_000; // $63,000.00
const PRICE_STEP = 1_000; // $10.00 per tick

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

const pending = new Map<string, PendingRequest>();

function unwrapEngine<T>(data: EngineData<T>): T {
  if (!data.success || data.data === null) {
    throw new Error(data.message ?? "Engine request failed");
  }
  return data.data;
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

async function ensureSimUser(publisher: RedisClientType) {
  const createUserRes = await dispatch(publisher, {
    kind: EVENT_KINDS.CREATE_USER,
    payload: { userId: SIM_USER_ID },
  });

  if (createUserRes.success) {
    console.log(`Created sim user ${SIM_USER_ID}`);
  } else if (createUserRes.message !== "USER_ALREADY_EXISTS") {
    throw new Error(createUserRes.message ?? "Failed to create sim user");
  } else {
    console.log(`Sim user ${SIM_USER_ID} already exists`);
  }

  unwrapEngine(
    await dispatch(publisher, {
      kind: EVENT_KINDS.CREDIT_BALANCE,
      payload: {
        userId: SIM_USER_ID,
        amountUsd: 100_000_000,
        onrampId: crypto.randomUUID(),
      },
    }),
  );

  console.log(`Credited sim user ${SIM_USER_ID}`);
}

async function placeOrder(
  publisher: RedisClientType,
  side: SIDE,
  price: number,
): Promise<string> {
  const orderId = crypto.randomUUID();
  const fills =
    unwrapEngine<Array<{ filledQty: number }> | null>(
      await dispatch(publisher, {
        kind: EVENT_KINDS.CREATE_ORDER,
        userId: SIM_USER_ID,
        payload: {
          id: orderId,
          market: MARKET,
          side,
          qty: QTY,
          orderType: ORDER_TYPE.LIMIT_ORDER,
          price,
        },
      }),
    ) ?? [];

  if (fills.length > 0) {
    throw new Error(
      `Unexpected match at price ${price} (side ${side}) — ${fills.length} fill(s)`,
    );
  }

  return orderId;
}

async function cancelOrder(publisher: RedisClientType, orderId: string) {
  unwrapEngine(
    await dispatch(publisher, {
      kind: EVENT_KINDS.CANCEL_ORDER,
      userId: SIM_USER_ID,
      payload: {
        orderId,
      },
    }),
  );
}

function formatPrice(price: number) {
  return (price / 10 ** priceScale).toFixed(priceScale);
}

async function main() {
  const consumer = createClient({ url: REDIS_URL });
  const publisher = createClient({ url: REDIS_URL });

  await consumer.connect();
  await publisher.connect();

  void startResponseListener(consumer);

  console.log("Orderbook simulator started");
  console.log(
    `Market=${MARKET} interval=${INTERVAL_MS}ms bidBase=${formatPrice(BID_BASE)} askBase=${formatPrice(ASK_BASE)}`,
  );

  await ensureSimUser(publisher);

  let tick = 0;

  while (true) {
    const bidPrice = BID_BASE - tick * PRICE_STEP;
    const askPrice = ASK_BASE + tick * PRICE_STEP;

    try {
      const bidOrderId = await placeOrder(publisher, SIDE.LONG, bidPrice);
      const askOrderId = await placeOrder(publisher, SIDE.SHORT, askPrice);
      console.log(
        `[+] bid ${formatPrice(bidPrice)} | ask ${formatPrice(askPrice)}`,
      );

      await Bun.sleep(INTERVAL_MS);

      await cancelOrder(publisher, bidOrderId);
      await cancelOrder(publisher, askOrderId);
      console.log(
        `[-] bid ${formatPrice(bidPrice)} | ask ${formatPrice(askPrice)}`,
      );
    } catch (error) {
      console.error(
        "[simulate-orderbook]",
        error instanceof Error ? error.message : error,
      );
    }

    tick = (tick + 1) % 20;
    await Bun.sleep(INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
