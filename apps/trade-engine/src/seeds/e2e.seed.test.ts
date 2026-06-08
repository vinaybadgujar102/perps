// Tests temporarily disabled
// import { beforeEach, describe, expect, test } from "bun:test";
// import { ORDER_TYPE, SIDE } from "@repo/sharedtypes";
// import { orderbooks } from "../inMemoryStates";
// import { POSITIONS } from "../inMemoryStates";
// import { createOrder } from "../utils/order.util";
// import { calculateRealizedPnl } from "../utils/pnl.util";
// import { USERS } from "../utils/user.util";
// import { liquidatePositions } from "../utils/liquidation.util";
// import {
//   E2E_MARK_PRICE,
//   getPosition,
//   resetE2EState,
//   runE2ESeed,
// } from "./e2e.seed";
// 
// describe("e2e seed", () => {
//   beforeEach(() => {
//     resetE2EState(0);
//     for (const userId of [101, 202, 303]) {
//       if (!USERS.getUser(userId)) {
//         USERS.addUser(userId);
//       }
//       const user = USERS.getUser(userId)!;
//       user.balance = 1_000_000;
//       user.lockedBalance = 0;
//     }
//   });
// 
//   test("sets BTC mark price before position updates", () => {
//     runE2ESeed(50_250);
//     expect(orderbooks.BTC.indexPrice).toBe(50_250);
//   });
// 
//   test("partial close books mark-based realized PnL on taker position and balance", () => {
//     const markPrice = E2E_MARK_PRICE;
//     const beforeBalance = USERS.getUser(202)!.balance;
// 
//     const { taker202 } = runE2ESeed(markPrice);
// 
//     expect(taker202).toBeDefined();
//     expect(taker202!.size).toBe(3);
//     expect(taker202!.realizedPnl).toBeGreaterThan(0);
// 
//     const expectedSlicePnl = calculateRealizedPnl({
//       markPrice,
//       averageEntryPrice: taker202!.averageEntryPrice,
//       closedQty: 1,
//       signedPositionSizeBeforeClose: 4,
//     });
// 
//     expect(taker202!.realizedPnl).toBeCloseTo(expectedSlicePnl, 5);
//     expect(USERS.getUser(202)!.balance).toBeCloseTo(
//       beforeBalance + expectedSlicePnl,
//       5,
//     );
//   });
// 
//   test("maker with only increasing short exposure keeps zero realized PnL", () => {
//     const { positions } = runE2ESeed();
//     const maker303 = positions.find((p) => p.userId === 303);
// 
//     expect(maker303?.size).toBe(-1.5);
//     expect(maker303?.realizedPnl).toBe(0);
//   });
// 
//   test("taker position snapshot matches in-memory state", () => {
//     runE2ESeed();
//     const fromMap = getPosition(202);
// 
//     expect(fromMap?.size).toBe(3);
//     expect(fromMap?.realizedPnl).toBeGreaterThan(0);
//   });
// 
//   test("locks margin on open positions in seed path", () => {
//     const { taker202 } = runE2ESeed();
//     const user = USERS.getUser(202)!;
// 
//     expect(taker202?.collateralUser).toBeGreaterThan(0);
//     expect(user.lockedBalance).toBeCloseTo(taker202!.collateralUser, 5);
//   });
// });
// 
// describe("e2e liquidation behavior", () => {
//   beforeEach(() => {
//     resetE2EState(E2E_MARK_PRICE);
//     POSITIONS.clear();
//   });
// 
//   test("liquidates long at/below liquidation price with SHORT order", () => {
//     createOrder({
//       id: "resting-long-301",
//       market: "BTC",
//       qty: 5,
//       filledQty: 0,
//       price: 48_000,
//       userId: 401,
//       side: SIDE.LONG,
//       orderType: ORDER_TYPE.LIMIT_ORDER,
//       timestamp: Date.now(),
//     });
// 
//     POSITIONS.set("301_BTC", {
//       id: "position-long-301",
//       orderId: "order-long-301",
//       market: "BTC",
//       collateralUser: 2_500,
//       userId: 301,
//       size: 2,
//       averageEntryPrice: 50_000,
//       estimatedLiquidationPrice: 48_000,
//       realizedPnl: 0,
//       createdAt: new Date(),
//     });
// 
//     liquidatePositions(48_000);
// 
//     expect(orderbooks.BTC.bids).toHaveLength(1);
//     expect(orderbooks.BTC.bids[0]?.availableQty).toBe(3);
//     expect(orderbooks.BTC.asks).toHaveLength(0);
//   });
// 
//   test("liquidates short at/above liquidation price with LONG order", () => {
//     createOrder({
//       id: "resting-short-302",
//       market: "BTC",
//       qty: 5,
//       filledQty: 0,
//       price: 52_000,
//       userId: 402,
//       side: SIDE.SHORT,
//       orderType: ORDER_TYPE.LIMIT_ORDER,
//       timestamp: Date.now(),
//     });
// 
//     POSITIONS.set("302_BTC", {
//       id: "position-short-302",
//       orderId: "order-short-302",
//       market: "BTC",
//       collateralUser: 2_500,
//       userId: 302,
//       size: -3,
//       averageEntryPrice: 50_000,
//       estimatedLiquidationPrice: 52_000,
//       realizedPnl: 0,
//       createdAt: new Date(),
//     });
// 
//     liquidatePositions(52_000);
// 
//     expect(orderbooks.BTC.asks).toHaveLength(1);
//     expect(orderbooks.BTC.asks[0]?.availableQty).toBe(2);
//     expect(orderbooks.BTC.bids).toHaveLength(0);
//   });
// 
//   test("skips liquidation for zero-size positions", () => {
//     POSITIONS.set("303_BTC", {
//       id: "position-flat-303",
//       orderId: "order-flat-303",
//       market: "BTC",
//       collateralUser: 0,
//       userId: 303,
//       size: 0,
//       averageEntryPrice: 50_000,
//       estimatedLiquidationPrice: 50_000,
//       realizedPnl: 0,
//       createdAt: new Date(),
//     });
// 
//     liquidatePositions(50_000);
// 
//     expect(orderbooks.BTC.bids).toHaveLength(0);
//     expect(orderbooks.BTC.asks).toHaveLength(0);
//   });
// });
