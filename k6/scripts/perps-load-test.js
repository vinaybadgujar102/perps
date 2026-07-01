/**
 * Perps platform API load test — 100 concurrent virtual users.
 *
 * Prerequisites (local):
 *   bun run dev --filter=trade-engine
 *   bun run dev --filter=api
 *   bun run dev --filter=db-poller
 *   bun run dev --filter=wsserver          # live orderbook depth in UI
 *   bun run simulate:orderbook
 *
 * Run:
 *   k6 run k6/scripts/perps-load-test.js
 *
 * Reports (written when the test finishes):
 *   k6/reports/perps-load-<timestamp>.html   — charts + threshold/check tables
 *   k6/reports/perps-load-<timestamp>.json   — machine-readable summary
 *   Terminal stdout                           — same text summary as default k6
 *
 * Optional built-in live dashboard (open while test runs):
 *   K6_WEB_DASHBOARD=true k6 run k6/scripts/perps-load-test.js
 *   # then visit http://127.0.0.1:5665
 *
 * Override:
 *   k6 run -e BASE_URL=http://localhost:3003/api/v1 -e VUS=100 -e DURATION=5m k6/scripts/perps-load-test.js
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
  assertEnvelope,
  assertEngineEnvelope,
  authHeaders,
  ENGINE_USER_HINT,
  fetchOrderbook,
  login,
  placeRestingLimitOrder,
  verifyEngineUser,
} from './lib/helpers.js';

const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '5m';
const RAMP_UP = __ENV.RAMP_UP || '30s';
const THINK_TIME_MIN = Number(__ENV.THINK_TIME_MIN || 1);
const THINK_TIME_MAX = Number(__ENV.THINK_TIME_MAX || 3);
const WRITE_RATIO = Number(__ENV.WRITE_RATIO || 0.1);

export const options = {
  scenarios: {
    trading_dashboard: {
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
    checks: ['rate>0.95'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    'http_req_duration{name:orderbook}': ['p(95)<600'],
    'http_req_duration{name:engine_dispatch}': ['p(95)<1200'],
    'http_req_duration{name:auth_login}': ['p(95)<500'],
  },
  tags: {
    test: 'perps-load',
    market: MARKET,
  },
};

/** Per-VU session state (each VU has its own JS runtime). */
let session = null;

function thinkTime() {
  const span = THINK_TIME_MAX - THINK_TIME_MIN;
  return THINK_TIME_MIN + Math.random() * span;
}

function ensureSession() {
  if (session?.token) {
    return session;
  }

  const auth = login();
  if (!auth) {
    return null;
  }

  session = auth;
  return session;
}

export function setup() {
  const res = http.get(apiUrl('/ping'), { tags: { name: 'health_ping' } });
  const healthy = check(res, {
    'API reachable': (r) => r.status === 200,
  });

  if (!healthy) {
    throw new Error(
      `API not reachable at ${BASE_URL}. Start api + trade-engine + simulate:orderbook first.`,
    );
  }

  const auth = login();
  if (!auth) {
    throw new Error(`Demo login failed for ${DEMO_EMAIL}. Run: bun run simulate:orderbook`);
  }

  if (!verifyEngineUser(auth.token, auth.userId)) {
    throw new Error(ENGINE_USER_HINT);
  }

  return { startedAt: Date.now() };
}

export default function () {
  group('public_reads', () => {
    const pingRes = http.get(apiUrl('/ping'), { tags: { name: 'health_ping' } });
    assertEnvelope(pingRes, 'ping');

    const marketsRes = http.get(apiUrl('/market'), { tags: { name: 'markets_list' } });
    assertEnvelope(marketsRes, 'markets');

    const marketRes = http.get(apiUrl(`/market/${MARKET}`), {
      tags: { name: 'market_detail' },
    });
    assertEnvelope(marketRes, 'market_detail');

    fetchOrderbook(MARKET);
  });

  sleep(thinkTime());

  const auth = ensureSession();
  if (!auth) {
    sleep(1);
    return;
  }

  group('authenticated_reads', () => {
    const accountRes = http.get(apiUrl(`/account/${auth.userId}`), {
      headers: authHeaders(auth.token),
      tags: { name: 'engine_dispatch', endpoint: 'account' },
    });
    assertEngineEnvelope(accountRes, 'account');

    const positionsRes = http.get(apiUrl('/positions'), {
      headers: authHeaders(auth.token),
      tags: { name: 'engine_dispatch', endpoint: 'positions' },
    });
    assertEngineEnvelope(positionsRes, 'positions');

    const openOrdersRes = http.get(apiUrl('/order'), {
      headers: authHeaders(auth.token),
      tags: { name: 'engine_dispatch', endpoint: 'open_orders' },
    });
    assertEngineEnvelope(openOrdersRes, 'open_orders');

    const historyRes = http.get(apiUrl('/order/history'), {
      headers: authHeaders(auth.token),
      tags: { name: 'order_history' },
    });
    assertEnvelope(historyRes, 'order_history');
  });

  sleep(thinkTime());

  if (Math.random() < WRITE_RATIO) {
    group('write_path', () => {
      const orderbook = fetchOrderbook(MARKET);
      placeRestingLimitOrder(auth.token, auth.userId, orderbook, 'LONG');
    });
  }

  sleep(thinkTime());
}

export function teardown(data) {
  if (!data?.startedAt) return;
  const elapsedSec = ((Date.now() - data.startedAt) / 1000).toFixed(1);
  console.log(`Load test finished after ${elapsedSec}s`);
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `k6/reports/perps-load-${stamp}`;

  return {
    [`${base}.html`]: htmlReport(data, { title: 'Perps Platform Load Test' }),
    [`${base}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
