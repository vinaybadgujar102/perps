import type { DepthDelta, DepthLevelUpdate } from "../orderbook.types";

export class DepthDeltaCollector {
  private bidUpdates = new Map<number, number>();
  private askUpdates = new Map<number, number>();

  setBid(price: number, qty: number) {
    this.bidUpdates.set(price, qty);
  }

  setAsk(price: number, qty: number) {
    this.askUpdates.set(price, qty);
  }

  merge(other: DepthDelta) {
    for (const level of other.bids) {
      this.setBid(level.price, level.qty);
    }
    for (const level of other.asks) {
      this.setAsk(level.price, level.qty);
    }
  }

  mergeSide(side: "bids" | "asks", update: DepthLevelUpdate) {
    if (side === "bids") {
      this.setBid(update.price, update.qty);
    } else {
      this.setAsk(update.price, update.qty);
    }
  }

  toDelta(): DepthDelta {
    return {
      bids: [...this.bidUpdates.entries()].map(([price, qty]) => ({
        price,
        qty,
      })),
      asks: [...this.askUpdates.entries()].map(([price, qty]) => ({
        price,
        qty,
      })),
    };
  }

  hasChanges() {
    return this.bidUpdates.size > 0 || this.askUpdates.size > 0;
  }
}

export function emptyDepthDelta(): DepthDelta {
  return { bids: [], asks: [] };
}
