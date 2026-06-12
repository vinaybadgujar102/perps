import type { ApiEnvelope } from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type OrderbookLevel = {
  price: number;
  qty: number;
};

export type OrderbookData = {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  bestBid: OrderbookLevel | null;
  bestAsk: OrderbookLevel | null;
};

type GetOrderbookData = {
  success: boolean;
  message: string | null;
  data: OrderbookData | null;
};

export async function getOrderbookApi(market: string): Promise<OrderbookData> {
  const result = await apiClient.get<ApiEnvelope<GetOrderbookData>>(
    `/orderbook/${market}`,
  );

  const engine = unwrapEngineResponse<OrderbookData>(result.data);

  if (!engine.data) {
    throw new Error(engine.message ?? "Orderbook unavailable");
  }

  return engine.data;
}
