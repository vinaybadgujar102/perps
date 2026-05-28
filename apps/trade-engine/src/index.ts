import { eventSchema, QUEUES } from "@repo/sharedtypes";
import { createClient } from "redis";
import { handleIncomingEvents } from "./handlers";

const subscriberRedis = await createClient().connect();
let lastId = "$";

while (true) {
  try {
    const res = await subscriberRedis.xRead(
      { key: QUEUES.SEND_QUEUE, id: lastId },
      { BLOCK: 0, COUNT: 1 },
    );
    if (!res || !Array.isArray(res)) continue;
    const message = res[0]?.messages?.[0];
    if (!message) continue;
    lastId = message.id;
    const parsedData = JSON.parse(message.message.data);
    const data = eventSchema.parse(parsedData);
    console.log(data);
    await handleIncomingEvents(data);
  } catch (error) {
    console.log(error);
    continue;
  }
}
