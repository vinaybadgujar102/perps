import { User } from "./User.class";

export class UserManager {
  private users = new Map<number, User>();

  getUser(userId: number): User {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found!");
    return user;
  }

  createUser(userId: number) {
    const user = new User(userId);
    this.users.set(userId, user);
    return user;
  }
}
