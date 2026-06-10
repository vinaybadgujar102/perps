import type { ResponseQueueMessage } from "@repo/sharedtypes";

type PubSubListener = (message: ResponseQueueMessage) => void | Promise<void>;

export class PubSub {
  private listeners: PubSubListener[] = [];

  subscribe(listener: PubSubListener) {
    this.listeners.push(listener);
  }

  async publish(message: ResponseQueueMessage) {
    for (const listener of this.listeners) {
      await listener(message);
    }
  }
}

export const pubsub = new PubSub();
