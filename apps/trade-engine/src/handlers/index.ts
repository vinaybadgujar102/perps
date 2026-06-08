import {
  EVENT_KINDS,
  QUEUES,
  type eventSchema,
  type ResponseQueueMessage,
} from "@repo/sharedtypes";
import type z from "zod";

import { createClient } from "redis";

import {
  EventDispatcher,
  type EventHandler,
} from "../dispatcher/eventdispatcher";
import { CreateUserHandler } from "./createUser.handler";
import { CreateOrderHandler } from "./createOrder.handle";

export const publisherRedis = await createClient().connect();

export const dispatcher = new EventDispatcher(
  new Map<string, EventHandler<any>>([
    [EVENT_KINDS.CREATE_USER, new CreateUserHandler()],
    [EVENT_KINDS.CREATE_ORDER, new CreateOrderHandler()],
  ]),
);

const publishToResponseQueue = async (message: ResponseQueueMessage) => {
  await publisherRedis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
    data: JSON.stringify(message),
  });
};

export const handleIncomingEvents = async (
  data: z.infer<typeof eventSchema>,
) => {
  const response = dispatcher.dispatch(data);

  // if (data.kind === EVENT_KINDS.CREATE_USER) {
  //   response = handleCreateUserEvent(data);
  // } else if (data.kind === EVENT_KINDS.CREATE_ORDER) {
  //   response = handleCreateOrderEvent(data);
  // } else if (data.kind === EVENT_KINDS.GET_ACCOUNT_STATE) {
  //   response = handleGetAccountStateEvent(data);
  // } else if (data.kind === EVENT_KINDS.GET_OPEN_POSITIONS) {
  //   response = handleGetOpenPositionsEvent(data);
  // } else if (data.kind === EVENT_KINDS.GET_ORDERBOOK) {
  //   response = handleGetOrderbookEvent(data);
  // } else if (data.kind === EVENT_KINDS.CREDIT_BALANCE) {
  //   response = handleCreditBalanceEvent(data);
  // } else if (data.kind === TICK_KINDS.MARK_PRICE) {
  //   const updates = handleMarkPriceUpdateEvent(data);
  //   for (const update of updates) {
  //     await publishToResponseQueue(update);
  //   }
  // }

  if (response) {
    await publishToResponseQueue(response);
  }
};
