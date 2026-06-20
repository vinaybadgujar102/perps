import WebSocket from "ws";
import { CONSTANTS } from "./constants";

import {
  AssetConfig,
  markPriceTickSchema,
  QUEUES,
  TICK_KINDS,
} from "@repo/sharedtypes";
import { BinanceMarkPriceResponseSchema } from "./types";
import { marketPriceState } from "./inMemoryState";
import { createClient } from "redis";
import type z from "zod";

const redis = await createClient().connect();

export async function pricePoller() {
  const ws = new WebSocket(CONSTANTS.BACKPACK_URL);

  const subscriptionPayload = {
    method: "SUBSCRIBE",
    params: Object.keys(AssetConfig).map((s) => `markPrice.${s}_USDC_PERP`),
  };

  ws.on("open", () => {
    console.log("client connected");

    ws.send(JSON.stringify(subscriptionPayload));
  });

  ws.on("message", (incomingData) => {
    const res = JSON.parse(incomingData.toString());
    const { data } = BinanceMarkPriceResponseSchema.parse(res);
    const symbol = data.s.split("_")[0] as string;
    const assetConfig = AssetConfig[symbol];
    if (!assetConfig) return;

    marketPriceState[assetConfig.symbol] =
      Number(data.p) * 10 ** assetConfig.priceScale;
  });
}

setInterval(() => {
  const payload: z.infer<typeof markPriceTickSchema> = {
    kind: TICK_KINDS.MARK_PRICE,
    payload: marketPriceState,
  };

  redis
    .xAdd(QUEUES.SEND_QUEUE, "*", {
      data: JSON.stringify(payload),
    })
    .then(() => {
      console.log(
        "price update successfully pushed to the send stream",
        payload,
      );
    });
}, 5000);

await pricePoller();
