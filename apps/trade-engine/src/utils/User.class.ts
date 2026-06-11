import { InsufficientMarginError } from "../errors";
import type { OrderEntity } from "../entity/order.entity";

// here user owns the state and it should be responsible for actually
// changing its state. when to change is depends on other service according to usecase
export class User {
  userId: number;
  balance: number = 0;
  lockedBalance: number = 0;
  openOrders = new Map<string, OrderEntity>();

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

  addOpenOrder(order: OrderEntity) {
    this.openOrders.set(order.id, order);
  }

  removeOpenOrder(orderId: string) {
    this.openOrders.delete(orderId);
  }

  getOpenOrder(orderId: string) {
    return this.openOrders.get(orderId);
  }

  getOpenOrders() {
    return [...this.openOrders.values()];
  }

  getBalanceSnapshot() {
    return {
      balance: this.balance,
      lockedBalance: this.lockedBalance,
    };
  }
}
