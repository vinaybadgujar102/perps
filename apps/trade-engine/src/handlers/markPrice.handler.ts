import type z from "zod";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import { RESPONSE_KINDS, type markPriceTickSchema } from "@repo/sharedtypes";
import { GLOBAL_ORDERBOOK } from "../inMemoryStates";
import type { OrderService } from "../services/order.service";
import { liquidatePositions } from "../utils/liquidation.util";
import type { PubSub } from "../pubsub/pubsub";

export class MarkPriceHandler implements EventHandler {
  constructor(
    private pubsub: PubSub,
    private orderService: OrderService,
  ) {}

  handle(event: z.infer<typeof markPriceTickSchema>): null {
    for (const [market, newPrice] of Object.entries(event.payload)) {
      const orderbook = GLOBAL_ORDERBOOK.getOrderbook(market);
      if (orderbook.getIndexPrice() === newPrice) continue;

      this.pubsub.publish({
        kind: RESPONSE_KINDS.INDEX_PRICE_UPDATE,
        payload: {
          market,
          indexPrice: newPrice,
          timestamp: Date.now(),
        },
      });
      orderbook.setIndexPrice(newPrice);

      liquidatePositions(market, newPrice, this.orderService);
    }

    return null;
  }
}
