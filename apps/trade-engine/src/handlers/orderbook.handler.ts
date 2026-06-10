import {
  RESPONSE_KINDS,
  type getOrderbookPayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { OrderbookNotFoundError } from "../errors";
import { GLOBAL_ORDERBOOK } from "../inMemoryStates";

const TOP_LEVELS_LIMIT = 10;

export const handleGetOrderbookEvent = (
  data: z.infer<typeof getOrderbookPayloadSchema>,
): TradeEngineResponse => {
  try {
    const marketBook = GLOBAL_ORDERBOOK.getOrderbook(data.payload.market);

    const bids = marketBook.bids
      .slice(0, TOP_LEVELS_LIMIT)
      .map((level) => ({ price: level.price, qty: level.availableQty }));
    const asks = marketBook.asks
      .slice(0, TOP_LEVELS_LIMIT)
      .map((level) => ({ price: level.price, qty: level.availableQty }));

    return {
      requestId: data.requestId,
      kind: RESPONSE_KINDS.GET_ORDERBOOK_RESPONSE,
      data: {
        success: true,
        message: null,
        data: {
          bids,
          asks,
          bestBid: bids[0] ?? null,
          bestAsk: asks[0] ?? null,
        },
      },
    };
  } catch (error) {
    if (error instanceof OrderbookNotFoundError) {
      return {
        requestId: data.requestId,
        kind: RESPONSE_KINDS.GET_ORDERBOOK_RESPONSE,
        data: {
          success: false,
          message: "MARKET_NOT_FOUND",
          data: null,
        },
      };
    }

    throw error;
  }
};
