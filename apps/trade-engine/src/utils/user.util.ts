import type { Position } from "@repo/sharedtypes";
import type { User } from "../types";

export function createUserManager() {
  const users = new Map<number, User>();

  function userFactory(userId: number): User {
    return {
      userId,
      balance: 0,
      lockedBalance: 0,
      activePositions: new Map(),
    };
  }

  return {
    addUser(userId: number) {
      if (users.has(userId)) {
        throw new Error("User already exists");
      }

      const newUser = userFactory(userId);
      users.set(userId, newUser);

      return newUser;
    },

    getUser(userId: number) {
      return users.get(userId);
    },

    getPosition(userId: number, orderId: string) {
      const user = users.get(userId);
      if (!user) return null;

      return user.activePositions.get(orderId);
    },

    addPosition(userId: number, position: Position) {
      const user = users.get(userId);
      if (!user) return null;

      const userPosition = user.activePositions.get(position.orderId);
      if (userPosition) {
        return userPosition;
      }
      const newPosition = user.activePositions.set(position.orderId, position);
      return newPosition;
    },
  };
}

export const USERS = createUserManager();
