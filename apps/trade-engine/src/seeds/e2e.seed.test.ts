import { beforeEach, describe, expect, test } from "bun:test";
import { orderbooks } from "../inMemoryStates";
import { calculateRealizedPnl } from "../utils/pnl.util";
import { USERS } from "../utils/user.util";
import {
  E2E_MARK_PRICE,
  getPosition,
  resetE2EState,
  runE2ESeed,
} from "./e2e.seed";

describe("e2e seed", () => {
  beforeEach(() => {
    resetE2EState(0);
    for (const userId of [101, 202, 303]) {
      if (!USERS.getUser(userId)) {
        USERS.addUser(userId);
      }
      const user = USERS.getUser(userId)!;
      user.balance = 1_000_000;
      user.lockedBalance = 0;
    }
  });

  test("sets BTC mark price before position updates", () => {
    runE2ESeed(50_250);
    expect(orderbooks.BTC.indexPrice).toBe(50_250);
  });

  test("partial close books mark-based realized PnL on taker position and balance", () => {
    const markPrice = E2E_MARK_PRICE;
    const beforeBalance = USERS.getUser(202)!.balance;

    const { taker202 } = runE2ESeed(markPrice);

    expect(taker202).toBeDefined();
    expect(taker202!.size).toBe(3);
    expect(taker202!.realizedPnl).toBeGreaterThan(0);

    const expectedSlicePnl = calculateRealizedPnl({
      markPrice,
      averageEntryPrice: taker202!.averageEntryPrice,
      closedQty: 1,
      signedPositionSizeBeforeClose: 4,
    });

    expect(taker202!.realizedPnl).toBeCloseTo(expectedSlicePnl, 5);
    expect(USERS.getUser(202)!.balance).toBeCloseTo(
      beforeBalance + expectedSlicePnl,
      5,
    );
  });

  test("maker with only increasing short exposure keeps zero realized PnL", () => {
    const { positions } = runE2ESeed();
    const maker303 = positions.find((p) => p.userId === 303);

    expect(maker303?.size).toBe(-1.5);
    expect(maker303?.realizedPnl).toBe(0);
  });

  test("taker position snapshot matches in-memory state", () => {
    runE2ESeed();
    const fromMap = getPosition(202);

    expect(fromMap?.size).toBe(3);
    expect(fromMap?.realizedPnl).toBeGreaterThan(0);
  });

  test("locks margin on open positions in seed path", () => {
    const { taker202 } = runE2ESeed();
    const user = USERS.getUser(202)!;

    expect(taker202?.collateralUser).toBeGreaterThan(0);
    expect(user.lockedBalance).toBeCloseTo(taker202!.collateralUser, 5);
  });
});
