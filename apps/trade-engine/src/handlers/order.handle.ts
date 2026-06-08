// Legacy handler — replaced by CreateOrderHandler + OrderService.
// import {
//   AssetConfig,
//   RESPONSE_KINDS,
//   type createOrderPayloadSchema,
//   type TradeEngineResponse,
// } from "@repo/sharedtypes";
// import type z from "zod";
// import { createPosition } from "../entity/position.util";
// import type { Order } from "../types";
// import { createOrder } from "../utils/order.util";
// import { USERMANAGER } from "../inMemoryStates";
//
// export const normalizeOrder = (
//   payload: z.infer<typeof createOrderPayloadSchema.shape.payload>,
//   userId: number,
// ): Order => {
//   return {
//     id: payload.id,
//     market: payload.market,
//     qty: payload.qty,
//     filledQty: 0,
//     price: payload.price,
//     userId: userId,
//     side: payload.side,
//     orderType: payload.orderType,
//     timestamp: Date.now(),
//   };
// };
//
// export const handleCreateOrderEvent = (
//   data: z.infer<typeof createOrderPayloadSchema>,
// ): TradeEngineResponse | undefined => {
//   const { price, qty } = data.payload;
//
//   const assetConfig = AssetConfig[data.payload.market]!;
//   const maxLeverage = assetConfig.maxLeverage;
//   const positionalValue = price * qty;
//   const requiredCollateral = positionalValue / maxLeverage;
//
//   const user = USERMANAGER.getUser(data.userId);
//   if (!user) {
//     console.log("User not found");
//     return {
//       requestId: data.requestId,
//       kind: RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
//       data: {
//         success: false,
//         message: "User not found",
//         data: null,
//       },
//     };
//   }
//
//   if (user.balance - user.lockedBalanece < requiredCollateral) {
//     console.log("No margin available for this trade");
//     return {
//       requestId: data.requestId,
//       kind: RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
//       data: {
//         success: false,
//         message: "Insufficient margin",
//         data: null,
//       },
//     };
//   }
//
//   const order = normalizeOrder(data.payload, data.userId);
//   const res = createOrder(order);
//
//   const response: TradeEngineResponse = {
//     requestId: data.requestId,
//     kind: RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
//     data: res,
//   };
//
//   const fills = res.data;
//
//   if (!fills || fills.length === 0) {
//     return response;
//   }
//
//   for (const fill of fills) {
//     createPosition({
//       userId: fill.takerId,
//       orderId: fill.takerOrderId,
//       market: fill.market,
//       side: fill.takerSide,
//       filledQty: fill.filledQty,
//       fillPrice: fill.price,
//     });
//
//     createPosition({
//       userId: fill.makerId,
//       orderId: fill.makerOrderId,
//       market: fill.market,
//       side: fill.makerSide,
//       filledQty: fill.filledQty,
//       fillPrice: fill.price,
//     });
//   }
//
//   return response;
// };
