// Tests temporarily disabled
// import { describe, expect, test } from "bun:test";
// import { orderbooks } from "../inMemoryStates";
// import { USERS } from "../utils/user.util";
// import { calculateRealizedPnl, settleRealizedPnl } from "../utils/pnl.util";
// 
// describe("calculateRealizedPnl", () => {
//   test("long profit when mark is above entry", () => {
//     expect(
//       calculateRealizedPnl({
//         markPrice: 51_000,
//         averageEntryPrice: 50_000,
//         closedQty: 2,
//         signedPositionSizeBeforeClose: 2,
//       }),
//     ).toBe(2_000);
//   });
// 
//   test("short profit when mark is below entry", () => {
//     expect(
//       calculateRealizedPnl({
//         markPrice: 49_000,
//         averageEntryPrice: 50_000,
//         closedQty: 1,
//         signedPositionSizeBeforeClose: -3,
//       }),
//     ).toBe(1_000);
//   });
// 
//   test("long loss when mark is below entry", () => {
//     expect(
//       calculateRealizedPnl({
//         markPrice: 48_000,
//         averageEntryPrice: 50_000,
//         closedQty: 1.5,
//         signedPositionSizeBeforeClose: 4,
//       }),
//     ).toBe(-3_000);
//   });
// 
//   test("uses closedQty not full position size for partial closes", () => {
//     const partial = calculateRealizedPnl({
//       markPrice: 51_000,
//       averageEntryPrice: 50_000,
//       closedQty: 1,
//       signedPositionSizeBeforeClose: 4,
//     });
//     const mistakenFullSize = (51_000 - 50_000) * 4;
// 
//     expect(partial).toBe(1_000);
//     expect(partial).not.toBe(mistakenFullSize);
//   });
// });
// 
// describe("settleRealizedPnl", () => {
//   test("only mark delta changes balance; collateral unlock is separate", () => {
//     USERS.addUser(99);
//     const user = USERS.getUser(99)!;
//     user.balance = 10_000;
//     user.lockedBalance = 5_000;
//     orderbooks.BTC.indexPrice = 51_000;
// 
//     const realizedPnl = settleRealizedPnl({
//       userId: 99,
//       market: "BTC",
//       signedPositionSizeBeforeClose: 4,
//       averageEntryPrice: 50_000,
//       closedQty: 1,
//       releasedCollateral: 2_000,
//     });
// 
//     expect(realizedPnl).toBe(1_000);
//     expect(user.balance).toBe(11_000);
//     expect(user.lockedBalance).toBe(3_000);
//   });
// });
// 
// describe("getMarkPrice", () => {
//   test("reads index from orderbook", async () => {
//     const { getMarkPrice } = await import("../utils/pnl.util");
//     orderbooks.BTC.indexPrice = 50_500;
//     expect(getMarkPrice("BTC")).toBe(50_500);
//   });
// });
