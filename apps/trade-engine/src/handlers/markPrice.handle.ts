import type z from "zod";
import { orderbooks } from "../inMemoryStates";
import type { markPriceTickSchema } from "@repo/sharedtypes";
import { liquidatePositions } from "../utils/liquidation.util";

export function handleMarkPriceUpdateEvent(
  data: z.infer<typeof markPriceTickSchema>,
) {
  for (const [key, data1] of Object.entries(orderbooks)) {
    const market = orderbooks[key];
    if (!market) continue;
    if (market.indexPrice === data.payload[key]) {
      continue;
    }
    // update price
    market.indexPrice = data.payload[key]!;
    // call liquidations
    liquidatePositions(data.payload[key]!);
  }
}
