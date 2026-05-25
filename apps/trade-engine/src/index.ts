import {
  createOrderPayloadSchema,
  EVENT_KINDS,
  eventSchema,
  QUEUES,
  RESPONSE_KINDS,
  TICK_KINDS,
} from "@repo/sharedtypes";
import { createClient } from "redis";
import { createOrder, createUserHandle } from "./handlers";
import type { Order } from "./types";
import { z } from "zod";
import { orderbooks } from "./inMemoryStates";

const redis = createClient();
await redis.connect();
let lastId = "$";

while (true) {
  try {
    const res = await redis.xRead(
      { key: QUEUES.SEND_QUEUE, id: lastId },
      { BLOCK: 0, COUNT: 1 },
    );

    if (!res || !Array.isArray(res)) continue;
    const message = res[0]?.messages?.[0];
    if (!message) continue;
    lastId = message.id;
    const parsedData = JSON.parse(message.message.data);
    const data = eventSchema.parse(parsedData);
    if (data.kind === EVENT_KINDS.CREATE_USER) {
      createUserHandle(data.payload.userId);
    } else if (data.kind === EVENT_KINDS.CREATE_ORDER) {
      const normalizeOrder = (
        payload: z.infer<typeof createOrderPayloadSchema.shape.payload>,
        userId: number,
      ): Order => {
        return {
          id: payload.id,
          margin: payload.margin,
          market: payload.market,
          qty: payload.qty,
          filledQty: 0,
          price: payload.price,
          userId: userId,
          type: payload.type,
          orderType: payload.orderType,
          timestamp: Date.now(),
        };
      };
      const order = normalizeOrder(data.payload, data.userId);
      console.log("[createOrder] TradeEngine: normalized order", { order });
      const res = createOrder(order);
      console.log("[createOrder] TradeEngine: createOrder result", { res });

      await redis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
        data: JSON.stringify({
          requestId: data.requestId,
          kind: RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
          data: res,
        }),
      });
      console.log("[createOrder] TradeEngine: published to RESPONSE_QUEUE", {
        requestId: data.requestId,
        queue: QUEUES.RESPONSE_QUEUE,
      });
    } else if (data.kind === TICK_KINDS.MARK_PRICE) {
      for (const [key, data1] of Object.entries(orderbooks)) {
        const market = orderbooks[key];
        if (!market) continue;
        if (market.indexPrice === data.payload[key]) {
          continue;
        }
        // update price
        market.indexPrice = data.payload[key]!;
        // call liquidations
        console.log(orderbooks);
      }
    }
  } catch (error) {
    console.log(error);
    continue;
  }
}
