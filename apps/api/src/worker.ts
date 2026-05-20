import { QUEUES } from "@repo/sharedtypes";
import { redis } from "./routes";

let lastId = ")";

while (true) {
  const res = await redis.XREAD(
    { key: QUEUES.RESPONSE_QUEUE, id: lastId },
    {
      COUNT: 1,
      BLOCK: 0,
    },
  );

  if (!res || Array.isArray(res)) continue;

  const message = res[0]?.messages?.[0];
  if (!message) continue;
  lastId = message.id;
  const parsedData = JSON.parse(message.message.data);
}
