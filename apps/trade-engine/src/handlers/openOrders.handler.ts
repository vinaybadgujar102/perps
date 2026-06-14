import {
  ORDER_TYPE,
  RESPONSE_KINDS,
  SIDE,
  type getOpenOrdersPayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERMANAGER } from "../inMemoryStates";
import { mapErrorToResponse } from "../utils/mapErrorToResponse";

export const handleGetOpenOrdersEvent = (
  data: z.infer<typeof getOpenOrdersPayloadSchema>,
): TradeEngineResponse => {
  try {
    const openOrders = USERMANAGER.getUser(data.payload.userId)
      .getOpenOrders()
      .map((order) => ({
        id: order.id,
        market: order.market,
        side: order.side as SIDE,
        orderType: order.orderType as ORDER_TYPE,
        price: order.price,
        qty: order.qty,
        filledQty: order.filledQty,
      }));

    return {
      requestId: data.requestId,
      kind: RESPONSE_KINDS.GET_OPEN_ORDERS_RESPONSE,
      data: {
        success: true,
        message: null,
        data: openOrders,
      },
    };
  } catch (error) {
    return mapErrorToResponse(
      error,
      RESPONSE_KINDS.GET_OPEN_ORDERS_RESPONSE,
      data.requestId,
    );
  }
};
