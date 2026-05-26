import type { Position } from "@repo/sharedtypes";
import type { User } from "../types";

export function createUserManager() {
  const users = new Map<number, User>();

  function userFactory(userId: number): User {
    return {
      userId,
      balance: 0,
      lockedBalance: 0,
      activePositions: [],
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

    addPosition(userId: number, position: Position) {
      const user = users.get(userId);
      if (!user) return null;
      user.activePositions.push(position);
    },
  };
}

export const USERS = createUserManager();
