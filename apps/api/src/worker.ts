import { eventSchema, QUEUES, RESPONSE_KINDS } from "@repo/sharedtypes";
import { createClient } from "redis";
import { requestMap } from ".";

const consumerRedis = await createClient().connect();

export async function listenForRequestId() {
  let lastId = "0";

  while (true) {
    try {
      const res = await consumerRedis.xRead(
        { key: QUEUES.RESPONSE_QUEUE, id: lastId },
        { COUNT: 1, BLOCK: 0 },
      );

      if (!res || !Array.isArray(res)) continue;

      const message = res[0]?.messages?.[0];
      if (!message) continue;
      lastId = message.id;
      const parsedData = JSON.parse(message.message.data);
      console.log(parsedData);
      const payload = eventSchema.parse(parsedData);

      if (payload.kind === RESPONSE_KINDS.CREATE_USER_RESPONSE) {
        if (payload.requestId) {
          const pendingRequest = requestMap.get(payload.requestId);
          if (!pendingRequest) {
            continue;
          }
          clearTimeout(pendingRequest.timeoutId);
          requestMap.delete(payload.requestId);
          pendingRequest.resolve(payload.data);
        }
      } else if (payload.kind === RESPONSE_KINDS.CREATE_ORDER_RESPONSE) {
        if (payload.requestId) {
          const pendingRequest = requestMap.get(payload.requestId);
          if (!pendingRequest) {
            continue;
          }
          clearTimeout(pendingRequest.timeoutId);
          requestMap.delete(payload.requestId);
          pendingRequest.resolve(payload.data);
        }
      } else if (payload.kind === RESPONSE_KINDS.GET_ACCOUNT_STATE_RESPONSE) {
        if (payload.requestId) {
          const pendingRequest = requestMap.get(payload.requestId);
          if (!pendingRequest) {
            continue;
          }
          clearTimeout(pendingRequest.timeoutId);
          requestMap.delete(payload.requestId);
          pendingRequest.resolve(payload.data);
        }
      } else if (payload.kind === RESPONSE_KINDS.GET_OPEN_POSITIONS_RESPONSE) {
        if (payload.requestId) {
          const pendingRequest = requestMap.get(payload.requestId);
          if (!pendingRequest) {
            continue;
          }
          clearTimeout(pendingRequest.timeoutId);
          requestMap.delete(payload.requestId);
          pendingRequest.resolve(payload.data);
        }
      } else if (payload.kind === RESPONSE_KINDS.GET_ORDERBOOK_RESPONSE) {
        if (payload.requestId) {
          const pendingRequest = requestMap.get(payload.requestId);
          if (!pendingRequest) {
            continue;
          }
          clearTimeout(pendingRequest.timeoutId);
          requestMap.delete(payload.requestId);
          pendingRequest.resolve(payload.data);
        }
      } else if (payload.kind === RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE) {
        if (payload.requestId) {
          const pendingRequest = requestMap.get(payload.requestId);
          if (!pendingRequest) {
            continue;
          }
          clearTimeout(pendingRequest.timeoutId);
          requestMap.delete(payload.requestId);
          pendingRequest.resolve(payload.data);
        }
      } else if (payload.kind === RESPONSE_KINDS.CANCEL_ORDER_RESPONSE) {
        if (payload.requestId) {
          const pendingRequest = requestMap.get(payload.requestId);
          if (!pendingRequest) {
            continue;
          }
          clearTimeout(pendingRequest.timeoutId);
          requestMap.delete(payload.requestId);
          pendingRequest.resolve(payload.data);
        }
      }
    } catch (e) {
      console.error(e);
      continue;
    }
  }
}
