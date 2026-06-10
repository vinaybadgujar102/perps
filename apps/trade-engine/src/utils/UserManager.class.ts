import { UserNotFoundError } from "../errors";
import { User } from "./User.class";

export class UserManager {
  private users = new Map<number, User>();

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
    this.users.set(userId, user);
    return user;
  }
}
