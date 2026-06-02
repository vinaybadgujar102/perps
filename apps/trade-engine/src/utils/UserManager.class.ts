import { User } from "./User.class";

export class UserManager {
  private users = new Map<number, User>();

  getUser(userId: number) {
    return this.users.get(userId);
  }

  createUser(userId: number) {
    const user = new User(userId);
    this.users.set(userId, user);
    return user;
  }
}
