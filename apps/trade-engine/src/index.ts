import "./bootstrap";
import { eventSchema, QUEUES } from "@repo/sharedtypes";
import { createClient } from "redis";
import { handleIncomingEvents } from "./handlers";
import { snapShotService } from "./services/snapshotting.service";

const subscriberRedis = await createClient().connect();
let lastId = snapShotService.getLatestSnapshot().lastProcessedId;

while (true) {
  try {
    const res = await subscriberRedis.xRead(
      { key: QUEUES.SEND_QUEUE, id: lastId },
      { BLOCK: 1000, COUNT: 1 },
    );
    if (!res || !Array.isArray(res)) continue;
    const message = res[0]?.messages?.[0];
    if (!message) continue;
    lastId = message.id;
    snapShotService.setLastProcessedId(lastId);
    const parsedData = JSON.parse(message.message.data);
    const data = eventSchema.parse(parsedData);
    console.log(data);
    await handleIncomingEvents(data);
  } catch (error) {
    console.log(error);
    continue;
  }
}
