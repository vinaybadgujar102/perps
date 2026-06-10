// import type z from "zod";
// import {
//   indexPriceUpdateSchema,
//   RESPONSE_KINDS,
//   type IndexPriceUpdate,
//   type markPriceTickSchema,
// } from "@repo/sharedtypes";
// import { orderbooks } from "../inMemoryStates";
// import { liquidatePositions } from "../utils/liquidation.util";

// export function handleMarkPriceUpdateEvent(
//   data: z.infer<typeof markPriceTickSchema>,
// ): IndexPriceUpdate[] {
//   const updates: IndexPriceUpdate[] = [];

//   for (const [market, newPrice] of Object.entries(data.payload)) {
//     const book = orderbooks[market];
//     if (!book || newPrice === undefined) continue;
//     if (book.indexPrice === newPrice) continue;

//     book.indexPrice = newPrice;
//     liquidatePositions(newPrice);

//     updates.push(
//       indexPriceUpdateSchema.parse({
//         kind: RESPONSE_KINDS.INDEX_PRICE_UPDATE,
//         payload: {
//           market,
//           indexPrice: newPrice,
//           timestamp: Date.now(),
//         },
//       }),
//     );
//   }

//   return updates;
// }
