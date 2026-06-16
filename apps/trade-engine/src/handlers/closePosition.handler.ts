import type z from "zod";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import {
  ORDER_TYPE,
  RESPONSE_KINDS,
  SIDE,
  type closePositionPayloadSchema,
  type EVENT_KINDS,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type { OrderService } from "../services/order.service";
import { mapErrorToResponse } from "../utils/mapErrorToResponse";
import { deriveOrderStatus } from "../utils/order.util";
import { calculateRealizedPnl } from "../utils/pnl.util";
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
      const {
        fills,
        depthDelta,
        market,
        closeOrder,
        positionBeforeClose,
        indexPrice,
      } = this.orderService.closePosition(event);

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

      const orderFills = fills.filter(
        (fill) => fill.takerOrderId === closeOrder.id,
      );
      const filledQty = orderFills.reduce(
        (sum, fill) => sum + fill.filledQty,
        0,
      );

      let closedPosition = null;

      if (positionBeforeClose) {
        const closedQty = Math.abs(positionBeforeClose.size);
        const finalPnl = calculateRealizedPnl({
          markPrice: indexPrice,
          averageEntryPrice: positionBeforeClose.averageEntryPrice,
          closedQty,
          signedPositionSizeBeforeClose: positionBeforeClose.size,
        });

        closedPosition = {
          positionId: positionBeforeClose.id,
          userId: positionBeforeClose.userId,
          market: positionBeforeClose.market,
          openingOrderId: positionBeforeClose.orderId,
          side: positionBeforeClose.size > 0 ? SIDE.LONG : SIDE.SHORT,
          size: closedQty,
          averageEntryPrice: positionBeforeClose.averageEntryPrice,
          realizedPnl: positionBeforeClose.realizedPnl + finalPnl,
          openedAt: positionBeforeClose.createdAt.getTime(),
          closedAt: Date.now(),
        };
      }

      return {
        requestId: event.requestId,
        kind: RESPONSE_KINDS.CLOSE_POSITION_RESPONSE,
        data: {
          success: true,
          message,
          data: fills,
          order: {
            orderId: closeOrder.id,
            userId: closeOrder.userId,
            market: closeOrder.market,
            side: closeOrder.side,
            orderType: ORDER_TYPE.MARKET_ORDER,
            qty: closeOrder.qty,
            filledQty,
            price: closeOrder.price,
            status: deriveOrderStatus(
              ORDER_TYPE.MARKET_ORDER,
              closeOrder.qty,
              filledQty,
            ),
            placedAt: Date.now(),
          },
          closedPosition,
        },
      } as TradeEngineResponse;
    } catch (error) {
      return mapErrorToResponse(
        error,
        RESPONSE_KINDS.CLOSE_POSITION_RESPONSE,
        event.requestId,
      );
    }
  }
}
