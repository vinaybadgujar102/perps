import { QUEUES, responseQueueSchema } from "@repo/sharedtypes";
import { createClient } from "redis";
import { handleIncomingEvents } from "./handlers";

const subscriber = await createClient(
  process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined,
).connect();

const hostedDemo = process.env.HOSTED_DEMO === "true";
// Hosted demo: "$" avoids replaying / filling up after XTRIM. Local: "0" for catch-up.
let lastId = hostedDemo ? "$" : "0";

while (true) {
  try {
    const response = await subscriber.xRead(
      { key: QUEUES.RESPONSE_QUEUE, id: lastId },
      { BLOCK: 0, COUNT: 1 },
    );

    if (!response || !Array.isArray(response)) continue;

    const message = response[0]?.messages?.[0];
    if (!message) continue;

    lastId = message.id;

    const parsedData = JSON.parse(message.message.data);
    const data = responseQueueSchema.parse(parsedData);
    await handleIncomingEvents(data);
  } catch (error) {
    console.error(error);
    if (hostedDemo) {
      lastId = "$";
    }
  }
}
