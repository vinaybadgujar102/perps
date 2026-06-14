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

export class OrderNotFoundError extends Error {
  constructor(_orderId: string) {
    super("ORDER_NOT_FOUND");
    this.name = "OrderNotFoundError";
  }
}

export class UnauthorizedOrderError extends Error {
  constructor() {
    super("UNAUTHORIZED_ORDER");
    this.name = "UnauthorizedOrderError";
  }
}

export class OrderNotCancellableError extends Error {
  constructor() {
    super("ORDER_NOT_CANCELLABLE");
    this.name = "OrderNotCancellableError";
  }
}

export class PositionNotFoundError extends Error {
  constructor(_market: string) {
    super("POSITION_NOT_FOUND");
    this.name = "PositionNotFoundError";
  }
}
