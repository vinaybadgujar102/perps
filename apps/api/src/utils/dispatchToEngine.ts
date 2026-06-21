import { QUEUES } from "@repo/sharedtypes";
import CONSTANTS from "../constants";
import { requestMap } from "../requestMap";
import { redis } from "../redis";

export async function dispatchToEngine(
  payload: Record<string, unknown>,
  requestId: string,
): Promise<any> {
  await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
    data: JSON.stringify(payload),
  });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      requestMap.delete(requestId);
      reject(new Error("Request timed out"));
    }, CONSTANTS.ENGINE_DISPATCH_TIMEOUT_MS);

    requestMap.set(requestId, { timeoutId, resolve, reject });
  });
}
