import { wsClientMessageSchema } from "@repo/sharedtypes";
import { WebSocketServer } from "ws";
import { startRedisConsumer } from "./redisConsumer";
import { removeClient, subscribe, unsubscribe } from "./subscriptions";

startRedisConsumer();

const wss = new WebSocketServer({ port: 8081 });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const parsed = wsClientMessageSchema.parse(
        JSON.parse(message.toString()),
      );

      for (const room of parsed.params) {
        if (parsed.method === "SUBSCRIBE") {
          subscribe(ws, room);
        } else {
          unsubscribe(ws, room);
        }
      }
    } catch (error) {
      console.error(error);
    }
  });

  ws.on("close", () => {
    removeClient(ws);
  });
});
