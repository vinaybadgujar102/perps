import { InsufficientMarginError } from "../errors";

// here user owns the state and it should be responsible for actually
// changing its state. when to change is depends on other service according to usecase
export class User {
  userId: number;
  balance: number = 0;
  lockedBalance: number = 0;

  constructor(userId: number) {
    this.userId = userId;
  }

  getAvailableBalance() {
    return this.balance - this.lockedBalance;
  }

  depositBalance(amount: number) {
    if (amount <= 0) {
      throw new Error("Invalid deposit amount.");
    }
    this.balance += amount;
    return amount;
  }

  lockFunds(amountToLock: number) {
    const availableBalance = this.getAvailableBalance();
    if (availableBalance < amountToLock) {
      throw new InsufficientMarginError();
    }
    this.lockedBalance += amountToLock;
  }

  unlockFunds(amount: number) {
    this.lockedBalance = Math.max(0, this.lockedBalance - amount);
  }

  applyRealizedPnl(amount: number) {
    this.balance += amount;
  }

  getBalanceSnapshot() {
    return {
      balance: this.balance,
      lockedBalance: this.lockedBalance,
    };
  }
}
