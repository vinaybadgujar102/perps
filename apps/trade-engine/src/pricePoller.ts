import WebSocket from "ws";
import { CONSTANTS } from "./constants";
import { BinanceMarkPriceResponseSchema } from "./types";

import { AssetConfig } from "@repo/sharedtypes";
import { orderbooks } from "./inMemoryStates";

export async function pricePoller() {
  const ws = new WebSocket(CONSTANTS.BACKPACK_URL);

  const subscriptionPayload = {
    method: "SUBSCRIBE",
    params: ["markPrice.BTC_USDC_PERP"],
  };

  ws.on("open", () => {
    console.log("client connected");

    ws.send(JSON.stringify(subscriptionPayload));
  });

  ws.on("message", (incomingData) => {
    const res = JSON.parse(incomingData.toString());
    const { data } = BinanceMarkPriceResponseSchema.parse(res);
    const symbol = data.s.split("_")[0] as string;
    const symbolOrderbook = orderbooks[symbol];
    if (!symbolOrderbook) return;

    const assetConfig = AssetConfig[symbol];
    if (!assetConfig) return;

    symbolOrderbook.indexPrice = Number(data.p) * 10 ** assetConfig.priceScale;
    console.log(orderbooks);
  });
}
