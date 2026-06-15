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
import { mapErrorToResponse } from "../utils/mapErrorToResponse";
import { deriveOrderStatus } from "../utils/order.util";
import type { PubSub } from "../pubsub/pubsub";
import { GLOBAL_ORDERBOOK } from "../inMemoryStates";

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
      const { fills, depthDelta } = this.orderService.createOrder(event); // matches , returns fills and depthChanges
      let message: string | null = null;

      // editing repsone message
      if (event.payload.orderType === ORDER_TYPE.MARKET_ORDER) {
        if (fills.length === 0) {
          message = "Order not matched at all";
        } else {
          const filledQty = fills.reduce(
            (sum, fill) => sum + fill.filledQty,
            0,
          );
          if (filledQty < event.payload.qty) {
            message = "Order fully/partially filled";
          }
        }
      }

      // publish to pubsub the delta updates
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

      console.log(GLOBAL_ORDERBOOK);

      const orderFills = fills.filter(
        (fill) => fill.takerOrderId === event.payload.id,
      );
      const filledQty = orderFills.reduce(
        (sum, fill) => sum + fill.filledQty,
        0,
      );

      return {
        requestId: event.requestId,
        kind: RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
        data: {
          success: true,
          message,
          data: fills,
          order: {
            orderId: event.payload.id,
            userId: event.userId,
            market: event.payload.market,
            side: event.payload.side,
            orderType: event.payload.orderType,
            qty: event.payload.qty,
            filledQty,
            price: event.payload.price,
            status: deriveOrderStatus(
              event.payload.orderType,
              event.payload.qty,
              filledQty,
            ),
            placedAt: Date.now(),
          },
        },
      } as TradeEngineResponse;
    } catch (error) {
      return mapErrorToResponse(
        error,
        RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
        event.requestId,
      );
    }
  }
}
