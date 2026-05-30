import {
  EVENT_KINDS,
  QUEUES,
  TICK_KINDS,
  type eventSchema,
  type ResponseQueueMessage,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { handleCreateUserEvent } from "./user.handler";
import { handleCreateOrderEvent } from "./order.handle";
import { createClient } from "redis";
import { handleMarkPriceUpdateEvent } from "./markPrice.handle";
import { handleGetAccountStateEvent } from "./account.handler";
import { handleGetOpenPositionsEvent } from "./position.handler";
import { handleGetOrderbookEvent } from "./orderbook.handler";
import { handleCreditBalanceEvent } from "./balance.handler";

export const publisherRedis = await createClient().connect();

const publishToResponseQueue = async (message: ResponseQueueMessage) => {
  await publisherRedis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
    data: JSON.stringify(message),
  });
};

export const handleIncomingEvents = async (
  data: z.infer<typeof eventSchema>,
) => {
  let response: TradeEngineResponse | undefined;

  if (data.kind === EVENT_KINDS.CREATE_USER) {
    response = handleCreateUserEvent(data);
  } else if (data.kind === EVENT_KINDS.CREATE_ORDER) {
    response = handleCreateOrderEvent(data);
  } else if (data.kind === EVENT_KINDS.GET_ACCOUNT_STATE) {
    response = handleGetAccountStateEvent(data);
  } else if (data.kind === EVENT_KINDS.GET_OPEN_POSITIONS) {
    response = handleGetOpenPositionsEvent(data);
  } else if (data.kind === EVENT_KINDS.GET_ORDERBOOK) {
    response = handleGetOrderbookEvent(data);
  } else if (data.kind === EVENT_KINDS.CREDIT_BALANCE) {
    response = handleCreditBalanceEvent(data);
  } else if (data.kind === TICK_KINDS.MARK_PRICE) {
    const updates = handleMarkPriceUpdateEvent(data);
    for (const update of updates) {
      await publishToResponseQueue(update);
    }
  }

  if (response) {
    await publishToResponseQueue(response);
  }
};
