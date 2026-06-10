export class UserNotFoundError extends Error {
  constructor() {
    super("USER_NOT_FOUND");
    this.name = "UserNotFoundError";
  }
}

export class InsufficientMarginError extends Error {
  constructor() {
    super("INSUFFICIENT_MARGIN");
    this.name = "InsufficientMarginError";
  }
}

export class OrderbookNotFoundError extends Error {
  constructor(_market: string) {
    super("Orderbook not found");
    this.name = "OrderbookNotFoundError";
  }
}
