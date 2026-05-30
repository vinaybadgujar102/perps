export interface WsData {
  subscriptions: Set<string>;
}

export interface WsClient {
  data: WsData;
  send(message: string): number;
}

const channels = new Map<string, Set<WsClient>>();

export function subscribe(ws: WsClient, channel: string) {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel)!.add(ws);
  ws.data.subscriptions.add(channel);
}

export function unsubscribe(ws: WsClient, channel: string) {
  channels.get(channel)?.delete(ws);
  ws.data.subscriptions.delete(channel);
}

export function removeClient(ws: WsClient) {
  for (const channel of ws.data.subscriptions) {
    channels.get(channel)?.delete(ws);
  }
  ws.data.subscriptions.clear();
}

export function broadcast(channel: string, message: string) {
  const subscribers = channels.get(channel);
  if (!subscribers) return;

  for (const ws of subscribers) {
    ws.send(message);
  }
}
