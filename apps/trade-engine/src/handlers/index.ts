import { EVENT_KINDS, TICK_KINDS, type eventSchema } from "@repo/sharedtypes";
import type z from "zod";
import { handleCreateUserEvent } from "./user.handler";
import { handleCreateOrderEvent } from "./order.handle";
import { createClient } from "redis";
import { handleMarkPriceUpdateEvent } from "./markPrice.handle";
import { handleGetAccountStateEvent } from "./account.handler";
import { handleGetOpenPositionsEvent } from "./position.handler";

export const publisherRedis = await createClient().connect();

export const handleIncomingEvents = (data: z.infer<typeof eventSchema>) => {
  if (data.kind === EVENT_KINDS.CREATE_USER) {
    handleCreateUserEvent(data.payload.userId);
  } else if (data.kind === EVENT_KINDS.CREATE_ORDER) {
    handleCreateOrderEvent(data);
  } else if (data.kind === EVENT_KINDS.GET_ACCOUNT_STATE) {
    handleGetAccountStateEvent(data);
  } else if (data.kind === EVENT_KINDS.GET_OPEN_POSITIONS) {
    handleGetOpenPositionsEvent(data);
  } else if (data.kind === TICK_KINDS.MARK_PRICE) {
    handleMarkPriceUpdateEvent(data);
  }
};
