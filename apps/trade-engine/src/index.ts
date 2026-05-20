import {
  EVENT_KINDS,
  eventSchema,
  QUEUES,
  TICK_KINDS,
} from "@repo/sharedtypes";
import { createClient } from "redis";
import { createUserHandle, handleIncomingTickPrice } from "./handlers";
import { pricePoller } from "./pricePoller";

await pricePoller();

const redis = createClient();
await redis.connect();
let lastId = "0";

while (true) {
  try {
    const res = await redis.XREAD(
      { key: QUEUES.SEND_QUEUE, id: lastId },
      {
        BLOCK: 0,
        COUNT: 1,
      },
    );

    if (!res || !Array.isArray(res)) continue;
    const message = res[0]?.messages?.[0];
    if (!message) continue;
    lastId = message.id;
    const parsedData = JSON.parse(message.message.data);
    const data = eventSchema.parse(parsedData);
    if (data.kind === EVENT_KINDS.CREATE_USER) {
      createUserHandle(data.payload.userId);
    }
  } catch (error) {
    continue;
  }
}
