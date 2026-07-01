import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3003/api/v1';
export const MARKET = __ENV.MARKET || 'BTC';
export const DEMO_EMAIL = __ENV.DEMO_EMAIL || 'demo@perps.local';
export const DEMO_PASSWORD = __ENV.DEMO_PASSWORD || 'demo1234';
export const LEVERAGE = Number(__ENV.LEVERAGE || 20);
export const ORDER_QTY_MIN = Number(__ENV.ORDER_QTY_MIN || 1);
export const ORDER_QTY_MAX = Number(__ENV.ORDER_QTY_MAX || 20);
/** Match simulate-orderbook SIM_PRICE_STEP so resting orders land in visible levels. */
export const PRICE_STEP = Number(__ENV.PRICE_STEP || 500);

/** BTC market scales — mirrors packages/sharedTypes AssetConfig.BTC */
const MARKET_SCALES = { priceScale: 2, quantityScale: 2, maxLeverage: 20 };

export const engineErrors = new Counter('engine_errors');
export const orderFills = new Counter('order_fills');

export const ENGINE_USER_HINT =
  'Demo user exists in Postgres but not in trade-engine. ' +
  'Start trade-engine first, then run: bun run simulate:orderbook ' +
  '(re-run simulate:orderbook after every trade-engine restart).';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function apiUrl(path) {
  return `${BASE_URL}${path}`;
}

export function authHeaders(token) {
  return {
    ...JSON_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}

export function parseJson(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

export function unscalePrice(apiPrice) {
  return apiPrice / 10 ** MARKET_SCALES.priceScale;
}

export function unscaleQty(apiQty) {
  return apiQty / 10 ** MARKET_SCALES.quantityScale;
}

/** Random API qty in [ORDER_QTY_MIN, ORDER_QTY_MAX] (e.g. 0.01–0.20 BTC). */
export function randomApiQty() {
  const span = ORDER_QTY_MAX - ORDER_QTY_MIN + 1;
  return ORDER_QTY_MIN + Math.floor(Math.random() * span);
}

/**
 * Display USD collateral — matches frontend estimateCollateral().
 * required = (displayPrice × displayQty) / leverage
 */
export function requiredCollateralDisplay(apiPrice, apiQty, leverage = LEVERAGE) {
  const displayPrice = unscalePrice(apiPrice);
  const displayQty = unscaleQty(apiQty);
  return (displayPrice * displayQty) / leverage;
}

/** Largest API qty that fits available display margin at a given price. */
export function maxApiQtyForMargin(availableMarginUsd, apiPrice, leverage = LEVERAGE) {
  const displayPrice = unscalePrice(apiPrice);
  if (!displayPrice || displayPrice <= 0 || !availableMarginUsd || leverage <= 0) {
    return 0;
  }
  const maxDisplayQty = (availableMarginUsd * leverage) / displayPrice;
  return Math.max(0, Math.floor(maxDisplayQty * 10 ** MARKET_SCALES.quantityScale));
}

/**
 * Aggressive price that crosses the spread and matches against sim-user liquidity.
 * LONG lifts the best ask; SHORT hits the best bid.
 */
export function crossingPrice(orderbook, side) {
  const bestBid = orderbook?.bestBid?.price;
  const bestAsk = orderbook?.bestAsk?.price;

  if (side === 'LONG') {
    return bestAsk ?? null;
  }

  return bestBid ?? null;
}

/**
 * Passive price near the touch (rests on book, visible depth, no immediate match).
 */
export function nearTouchLimitPrice(orderbook, side = 'LONG', vu = 1) {
  const bestBid = orderbook?.bestBid?.price;
  const bestAsk = orderbook?.bestAsk?.price;
  const levelOffset = (vu % 3) * PRICE_STEP;

  if (side === 'LONG') {
    if (!bestBid) return 6_099_500;
    const price = bestBid - levelOffset;
    if (bestAsk && price >= bestAsk) return bestBid;
    return Math.max(1, price);
  }

  if (!bestAsk) return 6_100_500;
  const price = bestAsk + levelOffset;
  if (bestBid && price <= bestBid) return bestAsk;
  return price;
}

/**
 * Plan an order sized to available margin with random qty.
 * @param {boolean} match - when true, use market/crossing order to take liquidity
 */
export function planOrder(account, orderbook, side, vu = 1, match = false) {
  const available = account?.availableMarginUsd;
  if (available == null || available <= 0) {
    return null;
  }

  const price = match ? crossingPrice(orderbook, side) : nearTouchLimitPrice(orderbook, side, vu);
  if (!price) {
    return null;
  }

  const maxQty = maxApiQtyForMargin(available, price, LEVERAGE);
  if (maxQty < ORDER_QTY_MIN) {
    return null;
  }

  const qty = Math.min(randomApiQty(), maxQty);
  const orderType = match ? 'market_order' : 'LIMIT_ORDER';
  const requiredCollateral = requiredCollateralDisplay(price, qty, LEVERAGE);

  return {
    affordable: requiredCollateral <= available,
    side,
    price,
    qty,
    orderType,
    matching: match,
    leverage: LEVERAGE,
    requiredCollateral,
    available,
  };
}

/** Nested trade-engine payload inside the API envelope (`body.data`). */
export function enginePayload(res) {
  return parseJson(res)?.data ?? null;
}

/** Inner business data from a trade-engine response (`body.data.data`). */
export function engineData(res) {
  const engine = enginePayload(res);
  return engine?.success ? engine.data : null;
}

export function assertEnvelope(res, name) {
  const body = parseJson(res);
  return check(res, {
    [`${name} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${name} success envelope`]: () => body?.success === true,
  });
}

/** For routes that proxy to trade-engine (account, orders, orderbook, …). */
export function assertEngineEnvelope(res, name) {
  const body = parseJson(res);
  const engine = enginePayload(res);
  const engineMessage = engine?.message ?? 'engine error';

  if (engine && !engine.success) {
    engineErrors.add(1, { endpoint: name, message: engineMessage });
  }

  return check(res, {
    [`${name} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${name} api envelope`]: () => body?.success === true,
    [`${name} engine ok`]: () => engine?.success === true,
    [`${name} engine message`]: () => {
      if (engine?.success) return true;
      if (engineMessage === 'USER_NOT_FOUND') {
        console.warn(`${name}: USER_NOT_FOUND — ${ENGINE_USER_HINT}`);
      }
      return false;
    },
  });
}

export function login(email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  const res = http.post(
    apiUrl('/auth/login'),
    JSON.stringify({ email, password }),
    { tags: { name: 'auth_login' }, headers: JSON_HEADERS },
  );

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login returns token': (r) => {
      const body = parseJson(res);
      return Boolean(body?.success && body?.data?.token);
    },
  });

  if (!ok) {
    return null;
  }

  const body = parseJson(res);
  return {
    token: body.data.token,
    userId: body.data.user.id,
  };
}

export function verifyEngineUser(token, userId) {
  const res = http.get(apiUrl(`/account/${userId}`), {
    headers: authHeaders(token),
    tags: { name: 'setup_engine_user' },
  });

  const engine = enginePayload(res);
  if (engine?.success) {
    return true;
  }

  console.error(
    `Engine user check failed for userId ${userId}: ${engine?.message ?? 'unknown'}`,
  );
  console.error(ENGINE_USER_HINT);
  return false;
}

export function getAccountState(token, userId) {
  const res = http.get(apiUrl(`/account/${userId}`), {
    headers: authHeaders(token),
    tags: { name: 'account' },
  });

  const engine = enginePayload(res);
  if (!engine?.success) {
    return null;
  }

  return engine.data;
}

export function fetchOrderbook(market = MARKET) {
  const res = http.get(apiUrl(`/orderbook/${market}`), {
    tags: { name: 'orderbook' },
  });
  assertEngineEnvelope(res, 'orderbook');
  return engineData(res);
}

export function createOrder(
  token,
  { side = 'LONG', price, qty, orderType = 'LIMIT_ORDER' } = {},
) {
  const payload = {
    market: MARKET,
    side,
    qty,
    orderType,
    price,
    leverage: LEVERAGE,
  };

  const tagName =
    orderType === 'market_order' ? 'create_market_order' : 'create_limit_order';

  const res = http.post(apiUrl('/order'), JSON.stringify(payload), {
    headers: authHeaders(token),
    tags: { name: tagName },
  });

  assertEngineEnvelope(res, 'create_order');
  return engineData(res);
}

/** @deprecated use createOrder */
export function createLimitOrder(token, params) {
  return createOrder(token, { ...params, orderType: 'LIMIT_ORDER' });
}

export function placeOrderFromPlan(token, plan) {
  const fills = createOrder(token, {
    side: plan.side,
    price: plan.price,
    qty: plan.qty,
    orderType: plan.orderType,
  });

  const fillCount = Array.isArray(fills) ? fills.length : 0;
  if (fillCount > 0) {
    orderFills.add(fillCount, { side: plan.side, orderType: plan.orderType });
  }

  if (plan.matching) {
    check(null, {
      'taker order produced fills': () => fillCount > 0,
    });
  }

  return fills;
}

export function placeRestingLimitOrder(token, userId, orderbook, side = 'LONG') {
  const account = getAccountState(token, userId);
  const plan = planOrder(account, orderbook, side, __VU, false);
  if (!plan?.affordable) {
    return null;
  }

  return placeOrderFromPlan(token, plan);
}

export function getOpenOrders(token) {
  const res = http.get(apiUrl('/order'), {
    headers: authHeaders(token),
    tags: { name: 'open_orders' },
  });

  assertEngineEnvelope(res, 'open_orders');
  const orders = engineData(res);
  return Array.isArray(orders) ? orders : [];
}

export function cancelOrder(token, orderId) {
  const res = http.del(apiUrl(`/order/${orderId}`), null, {
    headers: authHeaders(token),
    tags: { name: 'cancel_order' },
  });

  assertEngineEnvelope(res, 'cancel_order');
  return engineData(res);
}
