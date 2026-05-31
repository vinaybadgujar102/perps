import { useIndexPriceStore } from "@/stores/index-price-store";
import { indexPricePushSchema, indexPriceRoom } from "@repo/sharedtypes";
import { useEffect, useMemo } from "react";

const WS_URL = "ws://localhost:8081";

export function useIndexPriceSubscription(markets: string[]) {
  const setPrice = useIndexPriceStore((state) => state.setPrice);

  const watchedMarkets = useMemo(
    () => [...new Set(markets.filter(Boolean))].sort(),
    [markets],
  );
  const watchedMarketsKey = watchedMarkets.join(",");

  useEffect(() => {
    if (watchedMarkets.length === 0) return;

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket | undefined;

    const subscribe = (socket: WebSocket) => {
      socket.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: watchedMarkets.map((market) => indexPriceRoom(market)),
        }),
      );
    };

    const connect = () => {
      if (closed) return;

      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (ws?.readyState === WebSocket.OPEN) {
          subscribe(ws);
        }
      };

      ws.onmessage = (event) => {
        try {
          const push = indexPricePushSchema.parse(JSON.parse(String(event.data)));
          setPrice(push.data.market, push.data.indexPrice);
        } catch {
          // ignore invalid messages
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: watchedMarkets.map((market) => indexPriceRoom(market)),
          }),
        );
      }
      ws?.close();
    };
  }, [watchedMarketsKey, watchedMarkets, setPrice]);
}
