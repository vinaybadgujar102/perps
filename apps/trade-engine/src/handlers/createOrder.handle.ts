import type z from "zod";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import {
  RESPONSE_KINDS,
  type createOrderPayloadSchema,
  type EVENT_KINDS,
  type ORDER_TYPE,
  type SIDE,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type { OrderService } from "../services/order.service";
import { successResponse } from "../utils/handlerResponse.util";
import { mapErrorToResponse } from "../utils/mapErrorToResponse";

export class CreateOrderHandler implements EventHandler<
  z.infer<typeof createOrderPayloadSchema>
> {
  constructor(private orderService: OrderService) {}

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
      const fills = this.orderService.createOrder(event);
      return successResponse(
        event.requestId,
        RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
        fills,
      );
    } catch (error) {
      return mapErrorToResponse(
        error,
        event.requestId,
        RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
      );
    }
  }
}
