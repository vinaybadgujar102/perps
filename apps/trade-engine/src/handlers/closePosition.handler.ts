import type z from "zod";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import {
  RESPONSE_KINDS,
  type closePositionPayloadSchema,
  type EVENT_KINDS,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type { OrderService } from "../services/order.service";
import { successResponse } from "../utils/handlerResponse.util";
import { mapErrorToResponse } from "../utils/mapErrorToResponse";
import type { PubSub } from "../pubsub/pubsub";

export class ClosePositionHandler implements EventHandler<
  z.infer<typeof closePositionPayloadSchema>
> {
  constructor(
    private orderService: OrderService,
    private pubsub: PubSub,
  ) {}

  handle(event: {
    requestId: string;
    kind: EVENT_KINDS.CLOSE_POSITION;
    userId: number;
    payload: {
      market: string;
    };
  }): TradeEngineResponse {
    try {
      const { fills, depthDelta, market } =
        this.orderService.closePosition(event);

      const message =
        fills.length === 0
          ? "Position not matched at all"
          : "Position closed successfully.";

      if (depthDelta.bids.length > 0 || depthDelta.asks.length > 0) {
        this.pubsub.publish({
          kind: RESPONSE_KINDS.DEPTH_UPDATE,
          payload: {
            market,
            timestamp: Date.now(),
            bids: depthDelta.bids,
            asks: depthDelta.asks,
          },
        });
      }

      return successResponse(
        event.requestId,
        RESPONSE_KINDS.CLOSE_POSITION_RESPONSE,
        fills,
        message,
      );
    } catch (error) {
      return mapErrorToResponse(
        error,
        RESPONSE_KINDS.CLOSE_POSITION_RESPONSE,
        event.requestId,
      );
    }
  }
}
