// import { ORDER_TYPE, SIDE } from "@repo/sharedtypes";
// import { orderbooks } from "../inMemoryStates";
// import type { Fill, Order, PriceLevel } from "../types";

// const getOrderbook = (market: string) => {
//   return orderbooks[market];
// };

// type TradeEngingResponse<T> = {
//   success: boolean;
//   data: T | null;
//   message: string | null;
// };

// export const createOrder = (order: Order): TradeEngingResponse<Fill[]> => {
//   console.log("[createOrder] Handler: start", { orderId: order.id, order });
//   const orderbook = getOrderbook(order.market);

//   if (!orderbook) {
//     console.log("[createOrder] Handler: orderbook not found", {
//       market: order.market,
//     });
//     return {
//       success: false,
//       data: [],
//       message: "Orderbook not found",
//     };
//   }

//   const fills = matchOrder(order) ?? [];

//   const availableQty = order.qty - order.filledQty;

//   // handle market order
//   if (order.orderType === ORDER_TYPE.MARKET_ORDER) {
//     let responseMsg = "";
//     if (availableQty === order.qty) {
//       responseMsg = "Order not matched at all";
//     } else {
//       responseMsg = "Order fully/partially filled";
//     }
//     return {
//       success: true,
//       data: fills,
//       message: responseMsg,
//     };
//   }

//   console.log("[createOrder] Handler: matchOrder complete", {
//     orderId: order.id,
//     fillCount: fills.length,
//     filledQty: order.filledQty,
//     fills,
//   });

//   // handle limit order
//   if (availableQty === 0) {
//     console.log("[createOrder] Handler: order fully executed", {
//       orderId: order.id,
//     });
//     return {
//       success: true,
//       data: fills,
//       message: "Order fully executed",
//     };
//   }

//   const bookSide = order.side === SIDE.LONG ? orderbook.bids : orderbook.asks;

//   const priceLevel = bookSide.find(
//     (priceLevel) => priceLevel.price === order.price,
//   );
//   if (!priceLevel) {
//     const newPriceLevel: PriceLevel = {
//       price: order.price,
//       availableQty: availableQty,
//       orders: [],
//     };
//     newPriceLevel.orders.push(order);

//     if (order.side === SIDE.LONG) {
//       const index = orderbook.bids.findIndex(
//         (priceLevel) => order.price > priceLevel.price,
//       );

//       if (index === -1) {
//         orderbook.bids.push(newPriceLevel);
//       } else {
//         orderbook.bids.splice(index, 0, newPriceLevel);
//       }
//     } else {
//       const index = orderbook.asks.findIndex(
//         (priceLevel) => order.price < priceLevel.price,
//       );

//       if (index === -1) {
//         orderbook.asks.push(newPriceLevel);
//       } else {
//         orderbook.asks.splice(index, 0, newPriceLevel);
//       }
//     }
//   } else {
//     priceLevel.availableQty += availableQty;
//     priceLevel.orders.push(order);
//   }

//   console.log("[createOrder] Handler: remaining qty placed on book", {
//     orderId: order.id,
//     availableQty,
//     price: order.price,
//     side: order.side,
//   });
//   return {
//     success: true,
//     data: fills,
//     message: "order placed in orderbook",
//   };
// };

// const matchOrder = (order: Order): Fill[] | null => {
//   const orderbook = getOrderbook(order.market);
//   if (!orderbook) {
//     return null;
//   }
//   const fills: Fill[] = [];

//   if (order.side === SIDE.LONG) {
//     for (let i = 0; i < orderbook.asks.length; i++) {
//       const priceLevel = orderbook.asks[i];
//       if (!priceLevel) continue;

//       if (priceLevel.price > order.price || order.qty === order.filledQty)
//         return fills;

//       let totalFilledQty = 0;
//       for (const makerOrder of priceLevel.orders) {
//         if (order.qty === order.filledQty) break;

//         const filledQty = Math.min(
//           makerOrder.qty - makerOrder.filledQty,
//           order.qty - order.filledQty,
//         );
//         makerOrder.filledQty += filledQty;
//         order.filledQty += filledQty;
//         totalFilledQty += filledQty;
//         fills.push({
//           id: crypto.randomUUID(),
//           makerId: makerOrder.userId,
//           takerId: order.userId,
//           market: order.market,
//           takerSide: order.side,
//           makerSide: makerOrder.side,
//           timestamp: Date.now(),
//           takerOrderId: order.id,
//           makerOrderId: makerOrder.id,
//           filledQty: filledQty,
//           price: priceLevel.price,
//         });
//       }

//       priceLevel.orders = priceLevel.orders.filter(
//         (order) => order.filledQty != order.qty,
//       );
//       if (priceLevel.orders.length === 0) {
//         orderbook.asks.splice(i, 1);
//         i--;
//       } else {
//         priceLevel.availableQty -= totalFilledQty;
//       }
//     }
//   } else {
//     for (let i = 0; i < orderbook.bids.length; i++) {
//       const priceLevel = orderbook.bids[i];
//       if (!priceLevel) return fills;

//       if (priceLevel.price < order.price || order.qty === order.filledQty)
//         return fills;

//       let totalFilledQty = 0;
//       for (const makerOrder of priceLevel.orders) {
//         if (order.qty === order.filledQty) break;

//         const filledQty = Math.min(
//           makerOrder.qty - makerOrder.filledQty,
//           order.qty - order.filledQty,
//         );
//         makerOrder.filledQty += filledQty;
//         order.filledQty += filledQty;
//         totalFilledQty += filledQty;
//         fills.push({
//           id: crypto.randomUUID(),
//           makerId: makerOrder.userId,
//           takerId: order.userId,
//           market: order.market,
//           takerSide: order.side,
//           makerSide: makerOrder.side,
//           timestamp: Date.now(),
//           takerOrderId: order.id,
//           makerOrderId: makerOrder.id,
//           filledQty: filledQty,
//           price: priceLevel.price,
//         });
//       }

//       priceLevel.orders = priceLevel.orders.filter(
//         (order) => order.filledQty != order.qty,
//       );
//       if (priceLevel.orders.length === 0) {
//         orderbook.bids.splice(i, 1);
//         i--;
//       } else {
//         priceLevel.availableQty -= totalFilledQty;
//       }
//     }
//   }

//   return fills;
// };
