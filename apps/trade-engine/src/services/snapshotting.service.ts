import path from "node:path";
import { POSITIONS, USERMANAGER } from "../appState";
import type { Snapshot } from "../types";

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
    lastProcessedId: "",
  };

  setLastProcessedId(lastId: string) {
    this.latestSnapshot.lastProcessedId = lastId;
  }

  async createSnapshot() {
    const snapshot: Snapshot = {
      users: USERMANAGER.getAllUsers(),
      positions: Array.from(POSITIONS.entries()),
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
    const snapshot = (await content.json()) as Snapshot;
    this.latestSnapshot = snapshot;
  }

  getLatestSnapshot() {
    return this.latestSnapshot;
  }
}

export const snapShotService = new SnapshottingService();
