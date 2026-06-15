import path from "node:path";
import { POSITIONS, USERMANAGER } from "../appState";
import { GLOBAL_ORDERBOOK } from "../inMemoryStates";
import {
  snapshotSchema,
  type Snapshot,
  type SnapshotOrder,
} from "../types";

export const SNAPSHOT_PATH = path.join(import.meta.dir, "../../snapshot.json");

interface SnapshotService {
  createSnapshot(): Promise<void>;
  loadSnapshotIfExists(): Promise<void>;
  applySnapshot(snapshotPath?: string): Promise<void>;
  getLatestSnapshot(): Snapshot;
  setLastProcessedId(lastId: string): void;
}

export class SnapshottingService implements SnapshotService {
  private latestSnapshot: Snapshot = {
    users: [],
    positions: [],
    orders: [],
    orderbooks: [],
    lastProcessedId: "",
  };

  setLastProcessedId(lastId: string) {
    this.latestSnapshot.lastProcessedId = lastId;
  }

  async createSnapshot() {
    const orders: SnapshotOrder[] = [];
    const seenOrderIds = new Set<string>();

    for (const market of GLOBAL_ORDERBOOK.getMarkets()) {
      const orderbook = GLOBAL_ORDERBOOK.getOrderbook(market);
      for (const levels of [orderbook.bids, orderbook.asks]) {
        for (const level of levels) {
          for (const order of level.orders) {
            if (seenOrderIds.has(order.id)) continue;
            if (!order.isLimitOrder() || order.getAvailableQty() <= 0) continue;
            seenOrderIds.add(order.id);
            orders.push({
              id: order.id,
              market: order.market,
              qty: order.qty,
              filledQty: order.filledQty,
              price: order.price,
              userId: order.userId,
              side: order.side,
              orderType: order.orderType as SnapshotOrder["orderType"],
              timestamp: order.timestamp,
            });
          }
        }
      }
    }

    const orderbooks = GLOBAL_ORDERBOOK.getMarkets().map((market) => {
      const book = GLOBAL_ORDERBOOK.getOrderbook(market);
      return {
        market,
        indexPrice: book.indexPrice,
        lastTradedPrice: book.lastTradedPrice,
      };
    });

    const users: Snapshot["users"] = USERMANAGER.getAllUsers().map(
      ([userId, user]) => [userId, { balance: user.balance, lockedBalance: user.lockedBalance }],
    );

    const snapshot: Snapshot = {
      users,
      positions: Array.from(POSITIONS.entries()),
      orders,
      orderbooks,
      lastProcessedId: this.latestSnapshot.lastProcessedId,
    };

    this.latestSnapshot = snapshot;
    await Bun.write(SNAPSHOT_PATH, JSON.stringify(snapshot));
  }

  async loadSnapshotIfExists() {
    if (!(await Bun.file(SNAPSHOT_PATH).exists())) return;

    try {
      await this.applySnapshot();
    } catch (error) {
      console.error("Failed to load snapshot, starting with empty state:", error);
    }
  }

  async applySnapshot(snapshotPath: string = SNAPSHOT_PATH) {
    const content = Bun.file(snapshotPath);
    const parsed = await content.json();
    this.latestSnapshot = snapshotSchema.parse(parsed) as unknown as Snapshot;
  }

  getLatestSnapshot() {
    return this.latestSnapshot;
  }
}

export const snapShotService = new SnapshottingService();
