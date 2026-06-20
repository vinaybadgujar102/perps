import { RESPONSE_KINDS } from "@repo/sharedtypes";
import { POSITIONS } from "../appState";
import type { OrderService } from "../services/order.service";
import type { PubSub } from "../pubsub/pubsub";
import { publishTradeUpdates } from "./publishTradeUpdates";

export const liquidatePositions = (
  market: string,
  indexPrice: number,
  orderService: OrderService,
  pubsub: PubSub,
) => {
  const positionsToLiquidate = [...POSITIONS.values()].filter((position) => {
    if (position.size === 0 || position.market !== market) return false;

    const isLong = position.size > 0;
    return isLong
      ? indexPrice <= position.estimatedLiquidationPrice
      : indexPrice >= position.estimatedLiquidationPrice;
  });

  for (const position of positionsToLiquidate) {
    const { fills, depthDelta } = orderService.liquidatePosition(
      position,
      indexPrice,
    );

    if (depthDelta.bids.length > 0 || depthDelta.asks.length > 0) {
      pubsub.publish({
        kind: RESPONSE_KINDS.DEPTH_UPDATE,
        payload: {
          market,
          timestamp: Date.now(),
          bids: depthDelta.bids,
          asks: depthDelta.asks,
        },
      });
    }

    if (fills.length > 0) {
      publishTradeUpdates(pubsub, fills);
      pubsub.publish({
        kind: RESPONSE_KINDS.USER_EVENT,
        payload: {
          type: "LIQUIDATION",
          userId: position.userId,
          market,
          liquidationPrice: indexPrice,
          timestamp: Date.now(),
        },
      });
    }
  }
};
