import type { Position } from "@repo/sharedtypes";
import type { UserManager } from "./utils/UserManager.class";

export let POSITIONS: Map<string, Position>;
export let USERMANAGER: UserManager;

export function initializeAppState(
  positions: Map<string, Position>,
  userManager: UserManager,
) {
  POSITIONS = positions;
  USERMANAGER = userManager;
}
