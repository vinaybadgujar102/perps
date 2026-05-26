import { USERS } from "../utils/user.util";

export const handleCreateUserEvent = (userId: number) => {
  USERS.addUser(userId);
};
