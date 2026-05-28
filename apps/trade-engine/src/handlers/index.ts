import {
  EVENT_KINDS,
  QUEUES,
  TICK_KINDS,
  type eventSchema,
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

export const publisherRedis = await createClient().connect();

const publishResponse = async (response: TradeEngineResponse) => {
  await publisherRedis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
    data: JSON.stringify(response),
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
  } else if (data.kind === TICK_KINDS.MARK_PRICE) {
    handleMarkPriceUpdateEvent(data);
  }

  if (response) {
    await publishResponse(response);
  }
};
