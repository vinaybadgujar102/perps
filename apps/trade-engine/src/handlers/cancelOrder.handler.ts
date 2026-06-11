import type z from "zod";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import {
  RESPONSE_KINDS,
  type cancelOrderPayloadSchema,
  type EVENT_KINDS,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type { OrderService } from "../services/order.service";
import { successResponse } from "../utils/handlerResponse.util";
import { mapErrorToResponse } from "../utils/mapErrorToResponse";
import type { PubSub } from "../pubsub/pubsub";

export class CancelOrderHandler implements EventHandler<
  z.infer<typeof cancelOrderPayloadSchema>
> {
  constructor(
    private orderService: OrderService,
    private pubsub: PubSub,
  ) {}

  handle(event: {
    requestId: string;
    kind: EVENT_KINDS.CANCEL_ORDER;
    userId: number;
    payload: {
      orderId: string;
    };
  }): TradeEngineResponse {
    try {
      const result = this.orderService.cancelOrder(event);

      if (result.depthDelta.bids.length > 0 || result.depthDelta.asks.length > 0) {
        this.pubsub.publish({
          kind: RESPONSE_KINDS.DEPTH_UPDATE,
          payload: {
            market: result.market,
            timestamp: Date.now(),
            bids: result.depthDelta.bids,
            asks: result.depthDelta.asks,
          },
        });
      }

      return successResponse(
        event.requestId,
        RESPONSE_KINDS.CANCEL_ORDER_RESPONSE,
        {
          orderId: result.orderId,
          market: result.market,
          cancelledQty: result.cancelledQty,
        },
        "Order cancelled successfully.",
      );
    } catch (error) {
      return mapErrorToResponse(
        error,
        RESPONSE_KINDS.CANCEL_ORDER_RESPONSE,
        event.requestId,
      );
    }
  }
}
