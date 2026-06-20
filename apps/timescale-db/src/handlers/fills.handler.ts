import type { Fill } from "@repo/sharedtypes";
import { insertTrade } from "../db.utils";
import { unscalePrice } from "../utils/price";

export async function persistFills(fills: Fill[]) {
  await Promise.all(
    fills.map((fill) =>
      insertTrade(
        fill.id,
        fill.market,
        unscalePrice(fill.market, fill.price),
        new Date(fill.timestamp),
      ),
    ),
  );
}
