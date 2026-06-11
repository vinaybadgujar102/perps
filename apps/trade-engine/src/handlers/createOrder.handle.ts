import type z from "zod";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import {
  ORDER_TYPE,
  RESPONSE_KINDS,
  type createOrderPayloadSchema,
  type EVENT_KINDS,
  type SIDE,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type { OrderService } from "../services/order.service";
import { successResponse } from "../utils/handlerResponse.util";
import { mapErrorToResponse } from "../utils/mapErrorToResponse";
import type { PubSub } from "../pubsub/pubsub";

export class CreateOrderHandler implements EventHandler<
  z.infer<typeof createOrderPayloadSchema>
> {
  constructor(
    private orderService: OrderService,
    private pubsub: PubSub,
  ) {}

  handle(event: {
    requestId: string;
    kind: EVENT_KINDS.CREATE_ORDER;
    userId: number;
    payload: {
      id: string;
      market: string;
      side: SIDE;
      qty: number;
      orderType: ORDER_TYPE;
      price: number;
    };
  }): TradeEngineResponse {
    try {
      const { fills, depthDelta } = this.orderService.createOrder(event);
      let message: string | null = null;

      if (event.payload.orderType === ORDER_TYPE.MARKET_ORDER) {
        if (fills.length === 0) {
          message = "Order not matched at all";
        } else {
          const filledQty = fills.reduce((sum, fill) => sum + fill.filledQty, 0);
          if (filledQty < event.payload.qty) {
            message = "Order fully/partially filled";
          }
        }
      }

      if (depthDelta.bids.length > 0 || depthDelta.asks.length > 0) {
        this.pubsub.publish({
          kind: RESPONSE_KINDS.DEPTH_UPDATE,
          payload: {
            market: event.payload.market,
            timestamp: Date.now(),
            bids: depthDelta.bids,
            asks: depthDelta.asks,
          },
        });
      }

      return successResponse(
        event.requestId,
        RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
        fills,
        message,
      );
    } catch (error) {
      return mapErrorToResponse(
        error,
        RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
        event.requestId,
      );
    }
  }
}
