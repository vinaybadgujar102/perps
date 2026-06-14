import {
  EVENT_KINDS,
  QUEUES,
  TICK_KINDS,
  type eventSchema,
} from "@repo/sharedtypes";
import type z from "zod";

import { createClient } from "redis";

import {
  EventDispatcher,
  type EventHandler,
} from "../dispatcher/eventdispatcher";
import { CreateUserHandler } from "./createUser.handler";
import { CreateOrderHandler } from "./createOrder.handle";
import { CancelOrderHandler } from "./cancelOrder.handler";
import { handleGetAccountStateEvent } from "./account.handler";
import { handleCreditBalanceEvent } from "./balance.handler";
import { handleGetOpenPositionsEvent } from "./position.handler";
import { handleGetOrderbookEvent } from "./orderbook.handler";
import { OrderService } from "../services/order.service";
import { GLOBAL_ORDERBOOK, USERMANAGER } from "../inMemoryStates";
import { RiskService } from "../services/risk.service";
import { MatchingEngineService } from "../services/matchingEngineService";
import { MarkPriceHandler } from "./markPrice.handler";
import { pubsub } from "../pubsub/pubsub";

export const publisherRedis = await createClient().connect();

GLOBAL_ORDERBOOK.addOrderbook("BTC");

pubsub.subscribe(async (message) => {
  await publisherRedis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
    data: JSON.stringify(message),
  });
});

const orderService = new OrderService(
  USERMANAGER,
  new RiskService(),
  new MatchingEngineService(GLOBAL_ORDERBOOK),
  GLOBAL_ORDERBOOK,
);

export const dispatcher = new EventDispatcher(
  new Map<string, EventHandler<any>>([
    [EVENT_KINDS.CREATE_USER, new CreateUserHandler()], // create user
    [EVENT_KINDS.CREDIT_BALANCE, { handle: handleCreditBalanceEvent }], // add money
    [EVENT_KINDS.CREATE_ORDER, new CreateOrderHandler(orderService, pubsub)], // create order
    [EVENT_KINDS.CANCEL_ORDER, new CancelOrderHandler(orderService, pubsub)],
    [EVENT_KINDS.GET_ACCOUNT_STATE, { handle: handleGetAccountStateEvent }],
    [EVENT_KINDS.GET_OPEN_POSITIONS, { handle: handleGetOpenPositionsEvent }],
    [EVENT_KINDS.GET_ORDERBOOK, { handle: handleGetOrderbookEvent }],
    [TICK_KINDS.MARK_PRICE, new MarkPriceHandler(pubsub, orderService)],
  ]),
);

export const handleIncomingEvents = async (
  data: z.infer<typeof eventSchema>,
) => {
  const response = dispatcher.dispatch(data);

  if (response) {
    await pubsub.publish(response);
  }
};
