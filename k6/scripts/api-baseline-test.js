/**
 * API baseline throughput test — measures raw HTTP handling capacity.
 *
 * Target: GET /api/v1/ping
 *   Request → Express routing → successResponse → 200
 *   No auth, no Redis, no PostgreSQL, no trade-engine per request.
 *
 * Answers:
 *   - Max RPS the API process can sustain
 *   - p50 / p95 / p99 latency under load
 *   - (Server-side) CPU & memory — monitor the API process separately (see below)
 *
 * Prerequisites:
 *   bun run dev --filter=api
 *   Downstream services (trade-engine, db-poller, Redis consumers) are NOT required
 *   for /ping, though the API process may still open Redis on startup.
 *
 * Run:
 *   k6 run k6/scripts/api-baseline-test.js
 *
 * Aggressive ramp (discover breaking point):
 *   k6 run -e MAX_RPS=10000 -e STAGE_DURATION=1m -e RAMP_STEPS=8 k6/scripts/api-baseline-test.js
 *
 * Steady-state at a fixed rate:
 *   k6 run -e MODE=constant -e TARGET_RPS=2000 -e DURATION=3m k6/scripts/api-baseline-test.js
 *
 * Monitor API server CPU & RSS while the test runs (separate terminal):
 *   pidstat -p $(pgrep -f "apps/api" | head -1) 1
 *   # or: top -pid $(pgrep -f "apps/api" | head -1)
 *
 * Live k6 dashboard:
 *   K6_WEB_DASHBOARD=true k6 run k6/scripts/api-baseline-test.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { BASE_URL, apiUrl } from './lib/helpers.js';

const MODE = (__ENV.MODE || 'ramp').toLowerCase();
const WARMUP_RPS = Number(__ENV.WARMUP_RPS || 50);
const WARMUP_DURATION = __ENV.WARMUP_DURATION || '30s';
const MAX_RPS = Number(__ENV.MAX_RPS || 3000);
const TARGET_RPS = Number(__ENV.TARGET_RPS || 1000);
const STAGE_DURATION = __ENV.STAGE_DURATION || '1m';
const RAMP_STEPS = Number(__ENV.RAMP_STEPS || 5);
const DURATION = __ENV.DURATION || '3m';
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 100);
const MAX_VUS = Number(__ENV.MAX_VUS || 1000);

function buildRampStages() {
  const stages = [{ duration: WARMUP_DURATION, target: WARMUP_RPS }];

  for (let step = 1; step <= RAMP_STEPS; step += 1) {
    const target = Math.round(WARMUP_RPS + ((MAX_RPS - WARMUP_RPS) * step) / RAMP_STEPS);
    stages.push({ duration: STAGE_DURATION, target });
  }

  stages.push({ duration: '30s', target: 0 });
  return stages;
}

function buildScenarios() {
  if (MODE === 'constant') {
    return {
      ping_constant: {
        executor: 'constant-arrival-rate',
        rate: TARGET_RPS,
        timeUnit: '1s',
        duration: DURATION,
        preAllocatedVUs: PRE_ALLOCATED_VUS,
        maxVUs: MAX_VUS,
        exec: 'ping',
      },
    };
  }

  return {
    ping_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: WARMUP_RPS,
      timeUnit: '1s',
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
      stages: buildRampStages(),
      exec: 'ping',
    },
  };
}

export const options = {
  discardResponseBodies: true,
  scenarios: buildScenarios(),
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: false }],
    checks: [{ threshold: 'rate>0.99', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(99)<2000', abortOnFail: false }],
    'http_req_duration{name:ping}': [{ threshold: 'p(99)<2000', abortOnFail: false }],
  },
  tags: {
    test: 'api-baseline',
    endpoint: 'ping',
  },
};

export function setup() {
  const res = http.get(apiUrl('/ping'), { tags: { name: 'ping_setup' } });
  const healthy = check(res, {
    'API reachable': (r) => r.status === 200,
  });

  if (!healthy) {
    throw new Error(
      `API not reachable at ${BASE_URL}. Start with: bun run dev --filter=api`,
    );
  }

  return {
    startedAt: Date.now(),
    mode: MODE,
    maxRps: MODE === 'constant' ? TARGET_RPS : MAX_RPS,
  };
}

export function ping() {
  const res = http.get(apiUrl('/ping'), { tags: { name: 'ping' } });

  check(res, {
    'ping status 200': (r) => r.status === 200,
  });
}

export default ping;

function metricValue(metrics, name, key) {
  return metrics?.[name]?.values?.[key] ?? null;
}

function formatMs(value) {
  if (value == null || Number.isNaN(value)) {
    return 'n/a';
  }
  return `${value.toFixed(2)}ms`;
}

function buildBaselineReport(data) {
  const { metrics } = data;
  const achievedRps = metricValue(metrics, 'http_reqs', 'rate');
  const failedRate = metricValue(metrics, 'http_req_failed', 'rate');
  const pingDuration = metrics['http_req_duration{name:ping}']?.values ?? metrics.http_req_duration?.values;

  const lines = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '  API BASELINE SUMMARY  (GET /api/v1/ping)',
    '═══════════════════════════════════════════════════════════════',
    '',
    `  Mode:              ${data.setup_data?.mode ?? MODE}`,
    `  Target max RPS:    ${data.setup_data?.maxRps ?? MAX_RPS}`,
    `  Achieved RPS:      ${achievedRps != null ? achievedRps.toFixed(1) : 'n/a'} req/s`,
    `  Total requests:    ${metricValue(metrics, 'http_reqs', 'count') ?? 'n/a'}`,
    `  Failed rate:       ${failedRate != null ? `${(failedRate * 100).toFixed(3)}%` : 'n/a'}`,
    '',
    '  Latency (ping):',
    `    avg:  ${formatMs(pingDuration?.avg)}`,
    `    p50:  ${formatMs(pingDuration?.med ?? pingDuration?.['p(50)'])}`,
    `    p90:  ${formatMs(pingDuration?.['p(90)'])}`,
    `    p95:  ${formatMs(pingDuration?.['p(95)'])}`,
    `    p99:  ${formatMs(pingDuration?.['p(99)'])}`,
    `    max:  ${formatMs(pingDuration?.max)}`,
    '',
    '  Server CPU & memory are NOT measured by k6.',
    '  Re-run with pidstat/top on the API process during the test.',
    '',
    '  Interpretation:',
    '    • Achieved RPS ≈ target with low errors  → sustainable baseline',
    '    • Errors or p99 spike before target RPS  → API saturation point',
    '    • Compare RSS/CPU at start vs end of ramp → memory growth check',
    '',
    '═══════════════════════════════════════════════════════════════',
    '',
  ];

  return lines.join('\n');
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `k6/reports/api-baseline-${stamp}`;
  const baselineReport = buildBaselineReport(data);

  const summaryPayload = {
    test: 'api-baseline',
    endpoint: '/api/v1/ping',
    mode: data.setup_data?.mode ?? MODE,
    targetMaxRps: data.setup_data?.maxRps ?? MAX_RPS,
    achievedRps: metricValue(data.metrics, 'http_reqs', 'rate'),
    httpReqFailedRate: metricValue(data.metrics, 'http_req_failed', 'rate'),
    latency: data.metrics['http_req_duration{name:ping}']?.values
      ?? data.metrics.http_req_duration?.values,
    note: 'Monitor API process CPU/RSS separately with pidstat or top.',
  };

  return {
    [`${base}.html`]: htmlReport(data, { title: 'API Baseline Throughput Test' }),
    [`${base}.json`]: JSON.stringify({ ...data, baseline: summaryPayload }, null, 2),
    stdout: baselineReport + textSummary(data, { indent: ' ', enableColors: true }),
  };
}
