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
import { pricePoller } from "./pricePoller";
import type { Order } from "./types";
import { z } from "zod";
import { orderbooks } from "./inMemoryStates";

await pricePoller();

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
      console.log("[createOrder] TradeEngine: received CREATE_ORDER event", {
        requestId: data.requestId,
        userId: data.userId,
        payload: data.payload,
      });
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

      console.log(orderbooks.BTC);
    }
  } catch (error) {
    console.log(error);
    continue;
  }
}
