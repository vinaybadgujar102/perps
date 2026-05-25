import { beforeEach, describe, expect, test } from "bun:test";
import { AssetConfig } from "@repo/sharedtypes";
import type { User } from "../types";

/** Mirrors collateral logic in src/index.ts CREATE_ORDER handler. */
function computeRequiredCollateral(
  price: number,
  qty: number,
  maxLeverage: number,
): number {
  return (price * qty) / maxLeverage;
}

function getAvailableBalance(user: User): number {
  return user.balance - user.lockedBalance;
}

type CollateralResult =
  | { ok: true; requiredCollateral: number }
  | { ok: false; reason: "user_not_found" }
  | { ok: false; reason: "insufficient_collateral" };

/** Mirrors src/index.ts order of checks after requiredCollateral is computed. */
function applyCreateOrderCollateral(
  user: User | undefined,
  market: string,
  price: number,
  qty: number,
): CollateralResult {
  const assetConfig = AssetConfig[market]!;
  const requiredCollateral = computeRequiredCollateral(
    price,
    qty,
    assetConfig.maxLeverage,
  );

  if (!user) {
    return { ok: false, reason: "user_not_found" };
  }

  if (getAvailableBalance(user) < requiredCollateral) {
    return { ok: false, reason: "insufficient_collateral" };
  }

  user.lockedBalance += requiredCollateral;
  return { ok: true, requiredCollateral };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    userId: 1,
    balance: 10_000,
    lockedBalance: 0,
    ...overrides,
  };
}

describe("computeRequiredCollateral", () => {
  test("uses positional value divided by max leverage", () => {
    expect(computeRequiredCollateral(50_000, 2, 20)).toBe(5_000);
  });

  test("scales linearly with notional size", () => {
    const halfNotional = computeRequiredCollateral(25_000, 2, 20);
    const fullNotional = computeRequiredCollateral(50_000, 2, 20);
    expect(fullNotional).toBe(halfNotional * 2);
  });

  test("matches BTC AssetConfig max leverage of 20", () => {
    const { maxLeverage } = AssetConfig.BTC;
    expect(computeRequiredCollateral(100, 10, maxLeverage)).toBe(50);
  });
});

describe("getAvailableBalance", () => {
  test("subtracts locked balance from total balance", () => {
    const user = makeUser({ balance: 10_000, lockedBalance: 3_000 });
    expect(getAvailableBalance(user)).toBe(7_000);
  });
});

describe("CREATE_ORDER collateral (mirrors index.ts)", () => {
  let user: User;

  beforeEach(() => {
    user = makeUser();
  });

  test("locks required collateral when user has sufficient free balance", () => {
    const result = applyCreateOrderCollateral(user, "BTC", 50_000, 2);

    expect(result).toEqual({ ok: true, requiredCollateral: 5_000 });
    expect(user.lockedBalance).toBe(5_000);
    expect(getAvailableBalance(user)).toBe(5_000);
  });

  test("rejects when free balance is below required collateral", () => {
    user.balance = 4_999;

    const result = applyCreateOrderCollateral(user, "BTC", 50_000, 2);

    expect(result).toEqual({ ok: false, reason: "insufficient_collateral" });
    expect(user.lockedBalance).toBe(0);
  });

  test("allows order when free balance exactly equals required collateral", () => {
    user.balance = 5_000;

    const result = applyCreateOrderCollateral(user, "BTC", 50_000, 2);

    expect(result.ok).toBe(true);
    expect(user.lockedBalance).toBe(5_000);
    expect(getAvailableBalance(user)).toBe(0);
  });

  test("accumulates locked balance across multiple orders", () => {
    const first = applyCreateOrderCollateral(user, "BTC", 50_000, 1);
    const second = applyCreateOrderCollateral(user, "BTC", 50_000, 1);

    expect(first).toEqual({ ok: true, requiredCollateral: 2_500 });
    expect(second).toEqual({ ok: true, requiredCollateral: 2_500 });
    expect(user.lockedBalance).toBe(5_000);
    expect(getAvailableBalance(user)).toBe(5_000);
  });

  test("rejects when existing locked balance reduces free margin below requirement", () => {
    user.balance = 10_000;
    user.lockedBalance = 6_000;

    const result = applyCreateOrderCollateral(user, "BTC", 50_000, 2);

    expect(result).toEqual({ ok: false, reason: "insufficient_collateral" });
    expect(user.lockedBalance).toBe(6_000);
  });

  test("rejects second order when combined collateral exceeds free balance", () => {
    user.balance = 6_000;
    applyCreateOrderCollateral(user, "BTC", 50_000, 1);

    const second = applyCreateOrderCollateral(user, "BTC", 50_000, 2);

    expect(second).toEqual({ ok: false, reason: "insufficient_collateral" });
    expect(user.lockedBalance).toBe(2_500);
  });

  test("rejects when user is undefined", () => {
    const result = applyCreateOrderCollateral(undefined, "BTC", 50_000, 2);

    expect(result).toEqual({ ok: false, reason: "user_not_found" });
  });

  test("throws when market is not in AssetConfig", () => {
    expect(() => applyCreateOrderCollateral(user, "ETH", 50_000, 2)).toThrow();
  });
});
