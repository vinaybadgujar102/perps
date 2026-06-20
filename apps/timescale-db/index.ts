import { QUEUES } from "@repo/sharedtypes";
import redis from "redis";
const consumer = await redis.createClient().connect();

while (true) {
  const response = await consumer.xRead(
    { key: QUEUES.RESPONSE_QUEUE, id: "0" },
    {
      BLOCK: 0,
      COUNT: 1,
    },
  );
}
