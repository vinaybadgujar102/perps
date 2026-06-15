import type { Position } from "@repo/sharedtypes";
import { initializeAppState } from "./appState";
import { snapShotService } from "./services/snapshotting.service";
import { User } from "./utils/User.class";
import { UserManager } from "./utils/UserManager.class";

await snapShotService.loadSnapshotIfExists();

const snapshot = snapShotService.getLatestSnapshot();

const positions = new Map<string, Position>(snapshot.positions);
const userManager = new UserManager(
  new Map(
    snapshot.users.map(([userId, userData]) => {
      const user = new User(userId);
      user.balance = userData.balance;
      user.lockedBalance = userData.lockedBalance;
      return [userId, user] as const;
    }),
  ),
);

initializeAppState(positions, userManager);
