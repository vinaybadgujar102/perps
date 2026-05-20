import { SYMBOLS } from "@repo/sharedtypes";
import { orderbooks, USERS } from "./inMemoryStates";

export const createUserHandle = (userId: number) => {
  USERS.set(userId, {
    userId: userId,
    balance: 0,
    lockedBalance: 0,
  });
};

export const handleIncomingTickPrice = (symbol: string, price: number) => {
  orderbooks[SYMBOLS.BTC_USDC];
};
