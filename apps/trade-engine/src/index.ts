import { eventSchema, QUEUES } from "@repo/sharedtypes";
import { createClient } from "redis";
import { handleIncomingEvents } from "./handlers";
import { POSITIONS, USERMANAGER } from "./inMemoryStates";

export async function writeSnapshot() {
  let count = 0;
  count++;
  const snapshot = {
    count: count,
    users: USERMANAGER.getAllUsers(),
    positions: Array.from(POSITIONS.entries()),
    lastProcessedId: lastId,
  };

  await Bun.write("snapshot.json", JSON.stringify(snapshot));
}

const subscriberRedis = await createClient().connect();
let lastId = "0";

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
    const parsedData = JSON.parse(message.message.data);
    const data = eventSchema.parse(parsedData);
    console.log(data);
    await handleIncomingEvents(data);
  } catch (error) {
    console.log(error);
    continue;
  }
}
