import {
  EVENT_KINDS,
  QUEUES,
  SIDE,
  SIDE,
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
import { ClosePositionHandler } from "./closePosition.handler";
import { handleGetAccountStateEvent } from "./account.handler";
import { handleCreditBalanceEvent } from "./balance.handler";
import { handleGetOpenPositionsEvent } from "./position.handler";
import { handleGetOpenOrdersEvent } from "./openOrders.handler";
import { handleGetOrderbookEvent } from "./orderbook.handler";
import { OrderService } from "../services/order.service";
import { GLOBAL_ORDERBOOK } from "../inMemoryStates";
import { POSITIONS, USERMANAGER } from "../appState";
import { RiskService } from "../services/risk.service";
import { MatchingEngineService } from "../services/matchingEngineService";
import { MarkPriceHandler } from "./markPrice.handler";
import { pubsub } from "../pubsub/pubsub";
import {
  FUNDING_INTERVAL_MS,
  GLOBAL_PERPETUAL_MARKETS,
} from "../entity/perpetualMarket.entity";
import { FundingRateService } from "../services/fundingRateService";
import { snapShotService } from "../services/snapshotting.service";
import { SNAPSHOTING_INTERVAL_MS } from "../constants";

export const publisherRedis = await createClient().connect();

const btcOrderbook = GLOBAL_ORDERBOOK.ensureOrderbook("BTC");
GLOBAL_PERPETUAL_MARKETS.ensureMarket("BTC", btcOrderbook);

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

const fundingRateService = new FundingRateService();

function runFundingSettlement() {
  const marketsToUpdate: Record<string, true> = {};

  for (const position of POSITIONS.values()) {
    marketsToUpdate[position.market] = true;
  }

  for (const market in marketsToUpdate) {
    const orderbook = GLOBAL_ORDERBOOK.getOrderbook(market);
    const perpetualMarket = GLOBAL_PERPETUAL_MARKETS.getMarket(market);

    perpetualMarket.fundingRate = fundingRateService.calculateFundingRate(
      orderbook.getIndexPrice(),
      orderbook.getLastTradedPriceForFunding(),
    );
    perpetualMarket.nextFundingTime = Date.now() + FUNDING_INTERVAL_MS;
  }

  for (const position of POSITIONS.values()) {
    const perpetualMarket = GLOBAL_PERPETUAL_MARKETS.getMarket(position.market);

    const fee = fundingRateService.calculateFundingRateFees(
      position.size,
      perpetualMarket.fundingRate,
    );

    const user = USERMANAGER.getUser(position.userId);
    user.balance -= fee;
  }
}
setInterval(() => snapShotService.createSnapshot(), SNAPSHOTING_INTERVAL_MS);
setInterval(runFundingSettlement, FUNDING_INTERVAL_MS);

export const dispatcher = new EventDispatcher(
  new Map<string, EventHandler<any>>([
    [EVENT_KINDS.CREATE_USER, new CreateUserHandler()],
    [EVENT_KINDS.CREDIT_BALANCE, { handle: handleCreditBalanceEvent }],
    [EVENT_KINDS.CREATE_ORDER, new CreateOrderHandler(orderService, pubsub)],
    [EVENT_KINDS.GET_OPEN_POSITIONS, { handle: handleGetOpenPositionsEvent }],
    [EVENT_KINDS.GET_OPEN_ORDERS, { handle: handleGetOpenOrdersEvent }],
    [EVENT_KINDS.CANCEL_ORDER, new CancelOrderHandler(orderService, pubsub)],
    [
      EVENT_KINDS.CLOSE_POSITION,
      new ClosePositionHandler(orderService, pubsub),
    ],
    [EVENT_KINDS.GET_ACCOUNT_STATE, { handle: handleGetAccountStateEvent }],
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
