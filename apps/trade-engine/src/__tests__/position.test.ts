// Tests temporarily disabled
// import { beforeEach, describe, expect, test } from "bun:test";
// import { orderbooks, POSITIONS } from "../inMemoryStates";
// import { calculateLiquidationPrice } from "../utils/liquidation.util";
// import { createPosition, generatePositionKey } from "../entity/position.util";
// import { USERS } from "../utils/user.util";
// 
// function getPosition(userId: number, market = "BTC") {
//   return POSITIONS.get(generatePositionKey(userId.toString(), market));
// }
// 
// function ensureUser(userId: number, balance = 100_000) {
//   if (!USERS.getUser(userId)) {
//     USERS.addUser(userId);
//   }
//   USERS.getUser(userId)!.balance = balance;
// }
// 
// function expectEstimatedLiquidationPrice(
//   position: { estimatedLiquidationPrice: number } | undefined,
//   side: "LONG" | "SHORT",
//   qty: number,
//   averageEntryPrice: number,
//   collateral: number,
// ) {
//   expect(position?.estimatedLiquidationPrice).toBeCloseTo(
//     calculateLiquidationPrice(side, {
//       qty,
//       averageEntryPrice,
//       collateral,
//     }),
//     10,
//   );
// }
// 
// describe("createPosition", () => {
//   beforeEach(() => {
//     POSITIONS.clear();
//     orderbooks.BTC.indexPrice = 0;
//     orderbooks.SOL.indexPrice = 0;
//   });
// 
//   test("creates a new LONG position when none exists", () => {
//     createPosition({
//       userId: 1,
//       orderId: "order-1",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 2,
//       fillPrice: 50_000,
//     });
// 
//     const position = getPosition(1);
//     expect(position).toBeDefined();
//     expect(position?.size).toBe(2);
//     expect(position?.averageEntryPrice).toBe(50_000);
//     expect(position?.collateralUser).toBe(5_000);
//     expect(position?.orderId).toBe("order-1");
//     expect(position?.realizedPnl).toBe(0);
//     expectEstimatedLiquidationPrice(position, "LONG", 2, 50_000, 5_000);
//   });
// 
//   test("creates a new SHORT position when none exists", () => {
//     createPosition({
//       userId: 10,
//       orderId: "order-short",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 2,
//       fillPrice: 50_000,
//     });
// 
//     const position = getPosition(10);
//     expect(position?.size).toBe(-2);
//     expect(position?.collateralUser).toBe(5_000);
//     expect(position?.realizedPnl).toBe(0);
//     expectEstimatedLiquidationPrice(position, "SHORT", 2, 50_000, 5_000);
//   });
// 
//   test("increases same-direction position with weighted average entry", () => {
//     createPosition({
//       userId: 2,
//       orderId: "order-a",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 2,
//       fillPrice: 50_000,
//     });
//     createPosition({
//       userId: 2,
//       orderId: "order-b",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 1,
//       fillPrice: 51_000,
//     });
// 
//     const position = getPosition(2);
//     const weightedEntry = (2 * 50_000 + 1 * 51_000) / 3;
// 
//     expect(position?.size).toBe(3);
//     expect(position?.averageEntryPrice).toBe(weightedEntry);
//     expect(position?.collateralUser).toBe(7_550);
//     expect(position?.orderId).toBe("order-a");
//     expect(position?.realizedPnl).toBe(0);
//     expectEstimatedLiquidationPrice(position, "LONG", 3, weightedEntry, 7_550);
//   });
// 
//   test("reduces LONG on opposite-side partial close using position side, not fill side", () => {
//     ensureUser(3);
//     orderbooks.BTC.indexPrice = 51_000;
// 
//     createPosition({
//       userId: 3,
//       orderId: "order-long",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 4,
//       fillPrice: 50_000,
//     });
//     createPosition({
//       userId: 3,
//       orderId: "order-short-close",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 1.5,
//       fillPrice: 52_000,
//     });
// 
//     const position = getPosition(3);
// 
//     expect(position?.size).toBe(2.5);
//     expect(position?.realizedPnl).toBe(1_500);
//     expect(position?.averageEntryPrice).toBe(50_000);
//     expect(position?.collateralUser).toBe(6_250);
// 
//     expectEstimatedLiquidationPrice(position, "LONG", 2.5, 50_000, 6_250);
// 
//     const wrongSideFromFillOrderType = calculateLiquidationPrice("SHORT", {
//       qty: 2.5,
//       averageEntryPrice: 50_000,
//       collateral: 6_250,
//     });
//     expect(position?.estimatedLiquidationPrice).not.toBeCloseTo(
//       wrongSideFromFillOrderType,
//       10,
//     );
//   });
// 
//   test("reduces SHORT on opposite-side partial close using position side, not fill side", () => {
//     ensureUser(6);
//     orderbooks.BTC.indexPrice = 49_000;
// 
//     createPosition({
//       userId: 6,
//       orderId: "open-short",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 4,
//       fillPrice: 50_000,
//     });
//     createPosition({
//       userId: 6,
//       orderId: "close-partial-long",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 1.5,
//       fillPrice: 48_000,
//     });
// 
//     const position = getPosition(6);
// 
//     expect(position?.size).toBe(-2.5);
//     expect(position?.realizedPnl).toBe(1_500);
//     expect(position?.averageEntryPrice).toBe(50_000);
//     expect(position?.collateralUser).toBe(6_250);
// 
//     expectEstimatedLiquidationPrice(position, "SHORT", 2.5, 50_000, 6_250);
// 
//     const wrongSideFromFillOrderType = calculateLiquidationPrice("LONG", {
//       qty: 2.5,
//       averageEntryPrice: 50_000,
//       collateral: 6_250,
//     });
//     expect(position?.estimatedLiquidationPrice).not.toBeCloseTo(
//       wrongSideFromFillOrderType,
//       10,
//     );
//   });
// 
//   test("deletes position when opposite fill fully closes size", () => {
//     ensureUser(4, 10_000);
//     const user = USERS.getUser(4)!;
//     orderbooks.BTC.indexPrice = 49_000;
// 
//     createPosition({
//       userId: 4,
//       orderId: "open-short",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 3,
//       fillPrice: 50_000,
//     });
//     expect(user.lockedBalance).toBe(7_500);
//     createPosition({
//       userId: 4,
//       orderId: "close-short",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 3,
//       fillPrice: 49_000,
//     });
// 
//     expect(getPosition(4)).toBeUndefined();
//     expect(user.balance).toBe(13_000);
//     expect(user.lockedBalance).toBe(0);
//   });
// 
//   test("settles realized PnL at mark on partial long close", () => {
//     ensureUser(20, 100_000);
//     const user = USERS.getUser(20)!;
//     orderbooks.BTC.indexPrice = 51_000;
// 
//     createPosition({
//       userId: 20,
//       orderId: "open-long",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 4,
//       fillPrice: 50_000,
//     });
//     expect(user.lockedBalance).toBe(10_000);
// 
//     createPosition({
//       userId: 20,
//       orderId: "close-partial",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 1.5,
//       fillPrice: 52_000,
//     });
// 
//     expect(user.balance).toBe(101_500);
//     expect(user.lockedBalance).toBe(6_250);
//     expect(getPosition(20)?.realizedPnl).toBe(1_500);
//     expect(getPosition(20)?.collateralUser).toBe(6_250);
//   });
// 
//   test("settles realized PnL at mark on full close", () => {
//     ensureUser(21, 50_000);
//     const user = USERS.getUser(21)!;
//     orderbooks.BTC.indexPrice = 49_000;
// 
//     createPosition({
//       userId: 21,
//       orderId: "open-short",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 3,
//       fillPrice: 50_000,
//     });
//     expect(user.lockedBalance).toBe(7_500);
// 
//     createPosition({
//       userId: 21,
//       orderId: "close-full",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 3,
//       fillPrice: 48_500,
//     });
// 
//     expect(user.balance).toBe(53_000);
//     expect(user.lockedBalance).toBe(0);
//     expect(getPosition(21)).toBeUndefined();
//   });
// 
//   test("settles only closed leg at mark on flip", () => {
//     ensureUser(22, 10_000);
//     const user = USERS.getUser(22)!;
//     orderbooks.BTC.indexPrice = 50_500;
// 
//     createPosition({
//       userId: 22,
//       orderId: "open-long",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 2,
//       fillPrice: 50_000,
//     });
//     expect(user.lockedBalance).toBe(5_000);
// 
//     createPosition({
//       userId: 22,
//       orderId: "flip",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 3,
//       fillPrice: 51_000,
//     });
// 
//     expect(user.balance).toBe(11_000);
//     expect(user.lockedBalance).toBe(2_550);
//     expect(getPosition(22)?.size).toBe(-1);
//     expect(getPosition(22)?.realizedPnl).toBe(1_000);
//   });
// 
//   test("keeps liquidation price when entry and collateral scale down proportionally", () => {
//     ensureUser(8);
//     orderbooks.BTC.indexPrice = 51_000;
// 
//     createPosition({
//       userId: 8,
//       orderId: "open",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 4,
//       fillPrice: 50_000,
//     });
// 
//     const liqBefore = getPosition(8)!.estimatedLiquidationPrice;
// 
//     createPosition({
//       userId: 8,
//       orderId: "close",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 1,
//       fillPrice: 52_000,
//     });
// 
//     const after = getPosition(8)!;
//     expect(after.size).toBe(3);
//     expect(after.averageEntryPrice).toBe(50_000);
//     expect(after.estimatedLiquidationPrice).toBeCloseTo(liqBefore, 10);
//   });
// 
//   test("flips position direction and resets entry to flip price", () => {
//     ensureUser(5);
//     orderbooks.BTC.indexPrice = 50_500;
// 
//     createPosition({
//       userId: 5,
//       orderId: "open-long",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 2,
//       fillPrice: 50_000,
//     });
//     createPosition({
//       userId: 5,
//       orderId: "flip-to-short",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 3,
//       fillPrice: 51_000,
//     });
// 
//     const position = getPosition(5);
// 
//     expect(position?.size).toBe(-1);
//     expect(position?.averageEntryPrice).toBe(51_000);
//     expect(position?.collateralUser).toBe(2_550);
//     expect(position?.realizedPnl).toBe(1_000);
//     expect(position?.orderId).toBe("open-long");
//     expectEstimatedLiquidationPrice(position, "SHORT", 1, 51_000, 2_550);
//   });
// 
//   test("does not change realized PnL when mark is missing on close", () => {
//     orderbooks.BTC.indexPrice = 0;
// 
//     createPosition({
//       userId: 7,
//       orderId: "open-long",
//       market: "BTC",
//       side: "LONG",
//       filledQty: 2,
//       fillPrice: 50_000,
//     });
//     createPosition({
//       userId: 7,
//       orderId: "close-no-mark",
//       market: "BTC",
//       side: "SHORT",
//       filledQty: 1,
//       fillPrice: 51_000,
//     });
// 
//     expect(getPosition(7)?.size).toBe(1);
//     expect(getPosition(7)?.realizedPnl).toBe(0);
//   });
// });
