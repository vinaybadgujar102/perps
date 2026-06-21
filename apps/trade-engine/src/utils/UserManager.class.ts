import {
  DEFAULT_BALANCE_MARKET,
  DEFAULT_NEW_USER_BALANCE_DISPLAY_USD,
  scaleDisplayUsdToEngine,
} from "@repo/sharedtypes";
import { UserNotFoundError } from "../errors";
import { User } from "./User.class";

export class UserManager {
  users: Map<number, User>;

  constructor(initialUser: Map<number, User>) {
    this.users = initialUser;
  }
  hasUser(userId: number): boolean {
    return this.users.has(userId);
  }

  getUser(userId: number): User {
    const user = this.users.get(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  createUser(userId: number) {
    const user = new User(userId);
    user.depositBalance(
      scaleDisplayUsdToEngine(
        DEFAULT_NEW_USER_BALANCE_DISPLAY_USD,
        DEFAULT_BALANCE_MARKET,
      ),
    );
    this.users.set(userId, user);
    return user;
  }

  getAllUsers(): [number, User][] {
    return Array.from(this.users.entries());
  }
}
