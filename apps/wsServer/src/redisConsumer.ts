import {
  indexPriceRoom,
  indexPricePushSchema,
  QUEUES,
  RESPONSE_KINDS,
  responseQueueSchema,
} from "@repo/sharedtypes";
import { createClient } from "redis";
import { broadcast } from "./subscriptions";

export async function startRedisConsumer() {
  const consumerRedis = await createClient().connect();
  let lastId = "$";

  while (true) {
    try {
      const res = await consumerRedis.xRead(
        { key: QUEUES.RESPONSE_QUEUE, id: lastId },
        { BLOCK: 0, COUNT: 1 },
      );

      if (!res || !Array.isArray(res)) continue;

      const message = res[0]?.messages?.[0];
      if (!message) continue;

      lastId = message.id;
      const parsedData = JSON.parse(message.message.data);
      const data = responseQueueSchema.parse(parsedData);

      if (data.kind !== RESPONSE_KINDS.INDEX_PRICE_UPDATE) continue;

      const room = indexPriceRoom(data.payload.market);
      const messageToBroadcast = indexPricePushSchema.parse({
        stream: room,
        data: data.payload,
      });

      broadcast(room, JSON.stringify(messageToBroadcast));
    } catch (error) {
      console.error(error);
    }
  }
}
