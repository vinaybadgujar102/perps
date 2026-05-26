import { AssetConfig, QUEUES, RESPONSE_KINDS, type createOrderPayloadSchema } from "@repo/sharedtypes";
import type z from "zod";
import { USERS } from "../utils/user.util";
import { positionFactory } from "../utils/position.util";
import type { Order } from "../types";
import { publisherRedis } from ".";
import { createOrder } from "../utils/order.util";

export const handleCreateOrderEvent = (data: z.infer<typeof createOrderPayloadSchema>) => {
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
    continue;
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
      type: payload.type,
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

  if (res.data && res.data.length === 0) {
    continue;
  }

  const totalCost = res.data!.reduce((acc, fill) => {
    return acc + fill.price * fill.;
  }, 0);

  const totalQty = res.data!.reduce((acc, fill) => {
    return acc + fill.qty;
  }, 0);

  const averageEntryPrice = totalCost / totalQty;

  // create position
 const newPosition = positionFactory(order, requiredCollateral, averageEntryPrice)
  USERS.addPosition(user.userId, newPosition)

}
