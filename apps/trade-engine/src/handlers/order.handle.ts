import {
  AssetConfig,
  QUEUES,
  RESPONSE_KINDS,
  type createOrderPayloadSchema,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERS } from "../utils/user.util";
import { createPosition } from "../utils/position.util";
import type { Order } from "../types";
import { publisherRedis } from ".";
import { createOrder } from "../utils/order.util";

export const handleCreateOrderEvent = async (
  data: z.infer<typeof createOrderPayloadSchema>,
) => {
  const { price, qty } = data.payload;

  const assetConfig = AssetConfig[data.payload.market]!;
  const maxLeverage = assetConfig.maxLeverage;
  const positionalValue = price * qty;
  const requiredCollateral = positionalValue / maxLeverage;

  const user = USERS.getUser(data.userId);
  if (!user) {
    console.log("User not found");
    return;
  }

  if (user.balance - user.lockedBalance < requiredCollateral) {
    console.log("No margin available for this trade");
    return;
  }

  user.lockedBalance += requiredCollateral;

  const normalizeOrder = (
    payload: z.infer<typeof createOrderPayloadSchema.shape.payload>,
    userId: number,
  ): Order => {
    return {
      id: payload.id,
      market: payload.market,
      qty: payload.qty,
      filledQty: 0,
      price: payload.price,
      userId: userId,
      side: payload.side,
      orderType: payload.orderType,
      timestamp: Date.now(),
    };
  };
  const order = normalizeOrder(data.payload, data.userId);
  const res = createOrder(order);

  await publisherRedis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
    data: JSON.stringify({
      requestId: data.requestId,
      kind: RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
      data: res,
    }),
  });

  const fills = res.data;

  if (!fills || (fills && fills.length === 0)) {
    return;
  }

  for (const fill of fills) {
    // taker position
    createPosition({
      userId: fill.takerId,
      orderId: fill.takerOrderId,
      market: fill.market,

      side: fill.takerSide,

      filledQty: fill.filledQty,
      fillPrice: fill.price,
    });

    // maker position
    createPosition({
      userId: fill.makerId,
      orderId: fill.makerOrderId,
      market: fill.market,

      side: fill.makerSide,

      filledQty: fill.filledQty,
      fillPrice: fill.price,
    });
  }
};
