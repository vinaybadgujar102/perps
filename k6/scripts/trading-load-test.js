/**
 * Load test for trading endpoints: POST/GET/DELETE /order
 *
 * Matching: by default 70% of orders are market/crossing takers that hit
 * sim-user liquidity from simulate:orderbook (passive bids never match).
 *
 * Prerequisites:
 *   bun run dev --filter=trade-engine
 *   bun run dev --filter=api
 *   bun run dev --filter=db-poller
 *   bun run dev --filter=wsserver
 *   bun run simulate:orderbook   # keeps sim-user ask/bid liquidity
 *
 * Run:
 *   k6 run k6/scripts/trading-load-test.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import {
  BASE_URL,
  DEMO_EMAIL,
  MARKET,
  apiUrl,
  cancelOrder,
  ENGINE_USER_HINT,
  fetchOrderbook,
  getAccountState,
  getOpenOrders,
  login,
  planOrder,
  placeOrderFromPlan,
  verifyEngineUser,
} from './lib/helpers.js';

const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '5m';
const RAMP_UP = __ENV.RAMP_UP || '30s';
const THINK_TIME_MIN = Number(__ENV.THINK_TIME_MIN || 0.5);
const THINK_TIME_MAX = Number(__ENV.THINK_TIME_MAX || 1.5);
const CANCEL_RATIO = Number(__ENV.CANCEL_RATIO || 0.7);
/** Fraction of orders that cross the spread / use market type to match. */
const MATCH_RATIO = Number(__ENV.MATCH_RATIO || 0.7);

export const options = {
  scenarios: {
    trading_orders: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMP_UP, target: VUS },
        { duration: DURATION, target: VUS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<1200', 'p(99)<2000'],
    'http_req_duration{name:create_market_order}': ['p(95)<1500'],
    'http_req_duration{name:create_limit_order}': ['p(95)<1500'],
    'http_req_duration{name:open_orders}': ['p(95)<800'],
    'http_req_duration{name:cancel_order}': ['p(95)<1500'],
    order_fills: ['count>0'],
  },
  tags: {
    test: 'trading-load',
    market: MARKET,
  },
};

let session = null;

function thinkTime() {
  const span = THINK_TIME_MAX - THINK_TIME_MIN;
  return THINK_TIME_MIN + Math.random() * span;
}

function ensureSession() {
  if (session?.token) return session;
  session = login();
  return session;
}

export function setup() {
  const res = http.get(apiUrl('/ping'));
  const healthy = check(res, { 'API reachable': (r) => r.status === 200 });
  if (!healthy) {
    throw new Error(`API not reachable at ${BASE_URL}`);
  }

  const auth = login();
  if (!auth) {
    throw new Error(`Demo login failed for ${DEMO_EMAIL}. Run: bun run simulate:orderbook`);
  }

  if (!verifyEngineUser(auth.token, auth.userId)) {
    throw new Error(ENGINE_USER_HINT);
  }

  const orderbook = fetchOrderbook(MARKET);
  if (!orderbook?.bestBid || !orderbook?.bestAsk) {
    throw new Error('Orderbook empty — keep simulate:orderbook running for match liquidity');
  }

  return { startedAt: Date.now() };
}

export default function () {
  const auth = ensureSession();
  if (!auth) {
    sleep(1);
    return;
  }

  group('trading', () => {
    const account = getAccountState(auth.token, auth.userId);
    const orderbook = fetchOrderbook(MARKET);
    const side = Math.random() < 0.5 ? 'LONG' : 'SHORT';
    const shouldMatch = Math.random() < MATCH_RATIO;
    const plan = planOrder(account, orderbook, side, __VU, shouldMatch);

    if (!plan) {
      check(null, { 'plan skipped — no account or book': () => true });
      return;
    }

    if (!plan.affordable) {
      check(null, { 'order skipped — insufficient margin': () => true });
      return;
    }

    check(null, {
      'order within available margin': () => plan.requiredCollateral <= plan.available,
      'qty in configured range': () =>
        plan.qty >= Number(__ENV.ORDER_QTY_MIN || 1) &&
        plan.qty <= Number(__ENV.ORDER_QTY_MAX || 20),
    });

    placeOrderFromPlan(auth.token, plan);

    getOpenOrders(auth.token);

    if (Math.random() < CANCEL_RATIO) {
      const openOrders = getOpenOrders(auth.token);
      const cancellable = openOrders.find((o) => o.market === MARKET);
      if (cancellable?.id) {
        cancelOrder(auth.token, cancellable.id);
      }
    }
  });

  sleep(thinkTime());
}

export function teardown(data) {
  if (!data?.startedAt) return;
  const elapsedSec = ((Date.now() - data.startedAt) / 1000).toFixed(1);
  console.log(`Trading load test finished after ${elapsedSec}s`);
}

export function handleSummary(summary) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `k6/reports/trading-load-${stamp}`;

  return {
    [`${base}.html`]: htmlReport(summary, { title: 'Perps Trading Load Test' }),
    [`${base}.json`]: JSON.stringify(summary, null, 2),
    stdout: textSummary(summary, { indent: ' ', enableColors: true }),
  };
}
