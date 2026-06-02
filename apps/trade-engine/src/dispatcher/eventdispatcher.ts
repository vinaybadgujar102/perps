import {
  EVENT_KINDS,
  type eventSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { CreateUserHandler } from "../handlers/createUser.handler";

export interface EventHandler<T = z.infer<typeof eventSchema>> {
  handle(event: T): TradeEngineResponse;
}

export class EventDispatcher {
  constructor(private handlers: Map<string, EventHandler>) {}

  dispatch(event: z.infer<typeof eventSchema>) {
    const handler = this.handlers.get(event.kind);

    if (!handler) {
      throw new Error(`Unknown event ${event.kind}`);
    }

    return handler.handle(event);
  }
}

export const dispatcher = new EventDispatcher(
  new Map([[EVENT_KINDS.CREATE_USER, new CreateUserHandler()]]),
);
