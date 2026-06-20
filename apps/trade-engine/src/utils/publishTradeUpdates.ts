import { RESPONSE_KINDS, type Fill } from "@repo/sharedtypes";
import type { PubSub } from "../pubsub/pubsub";

export function publishTradeUpdates(pubsub: PubSub, fills: Fill[]) {
  for (const fill of fills) {
    pubsub.publish({
      kind: RESPONSE_KINDS.TRADE_UPDATE,
      payload: {
        market: fill.market,
        price: fill.price,
        timestamp: fill.timestamp,
        fillId: fill.id,
      },
    });
  }
}
