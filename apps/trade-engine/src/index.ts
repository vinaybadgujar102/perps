import { eventSchema, QUEUES, type Position } from "@repo/sharedtypes";
import { createClient } from "redis";
import { handleIncomingEvents } from "./handlers";
import { POSITIONS, USERMANAGER } from "./inMemoryStates";
import type { User } from "./utils/User.class";

type Snapshot = {
  users: [number, User][];
  positions: [string, Position][];
  lastProcessedId: string;
};
export async function writeSnapshot() {
  const snapshot: Snapshot = {
    users: USERMANAGER.getAllUsers(),
    positions: Array.from(POSITIONS.entries()),
    lastProcessedId: lastId,
  };

  await Bun.write("snapshot.json", JSON.stringify(snapshot));
}

export async function readSnapshot() {
  const content = Bun.file("snapshot.json");
  const snapshot = (await content.json()) as Snapshot;
  return snapshot;
}

export const latestSnapshot = await readSnapshot();
const subscriberRedis = await createClient().connect();
let lastId = latestSnapshot.lastProcessedId;

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
