export enum SYMBOLS {
  BTC = "BTC",
  SOL = "SOL",
}

export enum QUEUES {
  SEND_QUEUE = "send_queue",
  RESPONSE_QUEUE = "response_queue",
}

export enum EVENT_KINDS {
  CREATE_ORDER = "create_order",
  CREATE_USER = "create_user",
  GET_ACCOUNT_STATE = "get_account_state",
  GET_OPEN_POSITIONS = "get_open_positions",
  GET_OPEN_ORDERS = "get_open_orders",
  GET_ORDERBOOK = "get_orderbook",
  CREDIT_BALANCE = "credit_balance",
  CANCEL_ORDER = "cancel_order",
  CLOSE_POSITION = "close_position",
}

export enum RESPONSE_KINDS {
  CREATE_USER_RESPONSE = "create_user_response",
  CREATE_ORDER_RESPONSE = "create_order_response",
  GET_ACCOUNT_STATE_RESPONSE = "get_account_state_response",
  GET_OPEN_POSITIONS_RESPONSE = "get_open_positions_response",
  GET_OPEN_ORDERS_RESPONSE = "get_open_orders_response",
  GET_ORDERBOOK_RESPONSE = "get_orderbook_response",
  CREDIT_BALANCE_RESPONSE = "credit_balance_response",
  INDEX_PRICE_UPDATE = "index_price_update",
  DEPTH_UPDATE = "depth_update",
  CANCEL_ORDER_RESPONSE = "cancel_order_response",
  CLOSE_POSITION_RESPONSE = "close_position_response",
  USER_EVENT = "user_event",
  TRADE_UPDATE = "trade_update",
}

export enum TICK_KINDS {
  MARK_PRICE = "mark_price",
}

export enum ORDER_TYPE {
  MARKET_ORDER = "market_order",
  LIMIT_ORDER = "LIMIT_ORDER",
}

export enum SIDE {
  LONG = "LONG",
  SHORT = "SHORT",
}

export enum ORDER_STATUS {
  OPEN = "OPEN",
  PARTIALLY_FILLED = "PARTIALLY_FILLED",
  FILLED = "FILLED",
  CANCELLED = "CANCELLED",
}

export type Side = SIDE;
