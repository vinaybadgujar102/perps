// Legacy user manager — replaced by UserManager + User classes.
// import type { Position } from "@repo/sharedtypes";
// import type { User } from "../types";
//
// export type CreditBalanceResult =
//   | {
//       success: true;
//       balanceUsd: number;
//       lockedMarginUsd: number;
//       availableMarginUsd: number;
//       creditedAmountUsd: number;
//     }
//   | {
//       success: false;
//       message: string;
//     };
//
// export function createUserManager() {
//   const users = new Map<number, User>();
//
//   function userFactory(userId: number): User {
//     return {
//       userId,
//       balance: 0,
//       lockedBalance: 0,
//       activePositions: new Map(),
//     };
//   }
//
//   function getBalanceSnapshot(
//     user: User,
//     creditedAmountUsd: number,
//   ): CreditBalanceResult {
//     return {
//       success: true,
//       balanceUsd: user.balance,
//       lockedMarginUsd: user.lockedBalance,
//       availableMarginUsd: user.balance - user.lockedBalance,
//       creditedAmountUsd,
//     };
//   }
//
//   return {
//     addUser(userId: number) {
//       if (users.has(userId)) {
//         throw new Error("User already exists");
//       }
//
//       const newUser = userFactory(userId);
//       users.set(userId, newUser);
//
//       return newUser;
//     },
//
//     getUser(userId: number) {
//       return users.get(userId);
//     },
//
//     getPosition(userId: number, orderId: string) {
//       const user = users.get(userId);
//       if (!user) return null;
//
//       return user.activePositions.get(orderId);
//     },
//
//     addPosition(userId: number, position: Position) {
//       const user = users.get(userId);
//       if (!user) return null;
//
//       const userPosition = user.activePositions.get(position.orderId);
//       if (userPosition) {
//         return userPosition;
//       }
//       const newPosition = user.activePositions.set(position.orderId, position);
//       return newPosition;
//     },
//
//     creditBalance(userId: number, amountUsd: number): CreditBalanceResult {
//       if (amountUsd <= 0) {
//         return { success: false, message: "INVALID_AMOUNT" };
//       }
//       const user = users.get(userId);
//       if (!user) {
//         return { success: false, message: "USER_NOT_FOUND" };
//       }
//       user.balance += amountUsd;
//       return getBalanceSnapshot(user, amountUsd);
//     },
//   };
// }
