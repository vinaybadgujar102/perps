import { depthPushSchema, depthRoom, indexPricePushSchema, indexPriceRoom } from "@repo/sharedtypes";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { OrderbookData } from "#/api/orderbook.api";
import { useWebSocket } from "#/hooks/useWebSocket";
import { mergeDepthDelta } from "#/lib/merge-depth-delta";
import { queryKeys } from "#/lib/query-keys";
import { WS_URL } from "#/lib/ws-config";

export type TickerData = {
  market: string;
  indexPrice: number;
  timestamp: number;
};

function roomsForMarket(market: string) {
  return [depthRoom(market), indexPriceRoom(market)];
}

export function useMarketSubscriptions(market: string) {
  const queryClient = useQueryClient();
  const marketRef = useRef(market);
  marketRef.current = market;

  const { send } = useWebSocket(WS_URL, {
    onOpen: () => {
      if (!marketRef.current) return;
      send({
        method: "SUBSCRIBE",
        params: roomsForMarket(marketRef.current),
      });
    },
    onMessage: (data) => {
      if (!data) return;

      const message = data as { stream?: string };
      const eventType = message.stream?.split(".")[0];
      if (!eventType) return;

      const activeMarket = marketRef.current;

      switch (eventType) {
        case "depth": {
          const push = depthPushSchema.safeParse(data);
          if (!push.success || push.data.data.market !== activeMarket) return;

          queryClient.setQueryData<OrderbookData | undefined>(
            queryKeys.orderbook(activeMarket),
            (current) => mergeDepthDelta(current, push.data.data),
          );
          break;
        }
        case "indexPrice": {
          const push = indexPricePushSchema.safeParse(data);
          if (!push.success || push.data.data.market !== activeMarket) return;

          queryClient.setQueryData<TickerData>(
            queryKeys.ticker(activeMarket),
            push.data.data,
          );
          break;
        }
      }
    },
  });

  useEffect(() => {
    if (!market) return;

    send({
      method: "SUBSCRIBE",
      params: roomsForMarket(market),
    });

    return () => {
      send({
        method: "UNSUBSCRIBE",
        params: roomsForMarket(market),
      });
    };
  }, [market]);
}
