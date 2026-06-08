import {
  EVENT_KINDS,
  type eventSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";

// this class helps us to hadnle the incoming events
// instead adding if else for each event type we store the mapping of
// the event -> handler and then just fetch the handler from mapping
// and execute it.

// every handler should implement same interface so that we just have to
// work on abstraction instead of actual contrete class
export interface EventHandler<T = z.infer<typeof eventSchema>> {
  // every handler should implment handle function which takes
  // event as input
  handle(event: T): TradeEngineResponse;
}

export class EventDispatcher {
  constructor(private handlers: Map<string, EventHandler<any>>) {}

  dispatch(event: z.infer<typeof eventSchema>) {
    const handler = this.handlers.get(event.kind);

    if (!handler) {
      throw new Error(`Unknown event ${event.kind}`);
    }
    return handler.handle(event);
  }
}
