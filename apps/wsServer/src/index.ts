import {
  AssetConfig,
  indexPriceChannel,
  wsClientMessageSchema,
} from "@repo/sharedtypes";
import { startRedisConsumer } from "./redisConsumer";
import {
  removeClient,
  subscribe,
  unsubscribe,
  type WsData,
} from "./subscriptions";

const port = Number(process.env.WS_PORT ?? 8081);

const validChannels = new Set(
  Object.keys(AssetConfig).map((market) => indexPriceChannel(market)),
);

function isValidChannel(channel: string) {
  return validChannels.has(channel);
}

void startRedisConsumer();

Bun.serve<WsData>({
  port,
  fetch(req, server) {
    if (
      server.upgrade(req, {
        data: { subscriptions: new Set<string>() },
      })
    ) {
      return;
    }

    return new Response("WebSocket server", { status: 200 });
  },
  websocket: {
    open(ws) {
      console.log("client connected");
    },
    message(ws, message) {
      try {
        const parsed = wsClientMessageSchema.parse(
          JSON.parse(message.toString()),
        );

        for (const channel of parsed.params) {
          if (!isValidChannel(channel)) continue;

          if (parsed.method === "SUBSCRIBE") {
            subscribe(ws, channel);
          } else {
            unsubscribe(ws, channel);
          }
        }
      } catch (error) {
        console.error("invalid message", error);
      }
    },
    close(ws) {
      removeClient(ws);
    },
  },
});

console.log(`wsServer listening on port ${port}`);
