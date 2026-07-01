/**
 * Test 5 — Full production path (matching engine, no DB persistence).
 *
 * Measures what users experience through the live trading stack:
 *
 *   REST API → Authentication → Validation → Risk checks → Redis stream
 *            → Matching engine → Response
 *
 * Hot-path endpoints (no Postgres reads/writes per request):
 *   GET  /account/:userId   auth + validation + Redis + engine
 *   GET  /orderbook/:market validation + Redis + engine
 *   GET  /order             auth + Redis + engine (open orders)
 *   POST /order             auth + validation + Redis + engine + risk + matching
 *   DELETE /order/:id       auth + validation + Redis + engine
 *
 * Explicitly excluded (DB persistence / history):
 *   GET /order/history, GET /positions, GET /fills, db-poller
 *
 * Prerequisites:
 *   Redis running locally
 *   bun run dev --filter=trade-engine
 *   bun run dev --filter=api
 *   bun run simulate:orderbook        # engine user + sim liquidity for matches
 *
 * Do NOT start db-poller — orders are matched in-memory only.
 * Postgres is used once at setup for demo login (JWT); not on the hot path.
 *
 * Executor: ramping-arrival-rate (stress test — drives fixed req/s, no think time).
 *
 * Run:
 *   k6 run k6/scripts/production-path-test.js
 *
 * Push harder (find saturation):
 *   k6 run -e MAX_RPS=1000 -e RAMP_STEPS=8 -e STAGE_DURATION=1m k6/scripts/production-path-test.js
 *
 * Incremental steps — saturation probe (default: standard, 100→800 iter/s):
 *   k6 run -e MODE=step k6/scripts/production-path-test.js
 *
 * Heavier profiles:
 *   k6 run -e MODE=step -e STEP_PROFILE=aggressive k6/scripts/production-path-test.js
 *   k6 run -e MODE=step -e STEP_PROFILE=peak10k k6/scripts/production-path-test.js
 *
 * Step mode still drives real load: each plateau targets enough iterations, VUs
 * auto-scale to the peak rate, and the report flags dropped/under-delivered steps.
 *
 * Step profiles (override any field with explicit env vars):
 *   STEP_PROFILE=standard   100→800 iter/s   [default]
 *   STEP_PROFILE=aggressive 250→3000 iter/s
 *   STEP_PROFILE=extreme    500→5000 iter/s
 *   STEP_PROFILE=peak10k    1000→10000 iter/s
 *
 * Step mode env (saturation detection):
 *   STEP_PROFILE          standard | aggressive | extreme | peak10k
 *   STEP_BUDGET_SEC       total time budget incl. warmup
 *   STEP_WARMUP_DURATION  short warmup before plateaus (default 15s)
 *   STEP_WARMUP_RPS       warmup iteration rate (default 50)
 *   STEP_START_RPS        first plateau target
 *   STEP_INCREMENT_RPS    increase per plateau
 *   STEP_MAX_RPS          top plateau target (falls back to MAX_RPS)
 *   STEP_DURATION         preferred hold per plateau (default 20s; auto-shrinks to fit budget)
 *   STEP_DURATION_MIN_SEC minimum hold when auto-shrinking (default 15s)
 *   MIN_ITERATIONS_PER_STEP min iterations each plateau must attempt
 *   STEP_ITER_MS_ESTIMATE expected iter duration for VU sizing (default 50ms)
 *   STEP_VU_HEADROOM      VU multiplier over theoretical minimum (default 2.5)
 *   STEP_MIN_VUS / STEP_MAX_VUS  VU pool floor/cap for step mode
 *   STEP_COUNT            fixed number of plateaus (overrides STEP_MAX_RPS ceiling)
 *   LATENCY_JUMP_FACTOR   p95 jump vs prior step (default 2×)
 *   LATENCY_JUMP_MS       absolute p95 jump (default 500ms)
 *   THROUGHPUT_PLATEAU_PCT  achieved growth vs target growth (default 10%)
 *   FAIL_RATE_KNEE        fail-rate threshold (default 0.5%)
 *   ENGINE_TIMEOUT_MS     flag max near API dispatch timeout (default 10000)
 *
 * Steady-state at fixed iteration rate (measure true peak delivery):
 *   k6 run -e MODE=constant -e TARGET_RPS=1000 -e DURATION=2m k6/scripts/production-path-test.js
 *
 * Heavier matching load:
 *   k6 run -e MATCH_RATIO=0.9 -e WRITE_RATIO=0.5 k6/scripts/production-path-test.js
 *
 * Live dashboard:
 *   K6_WEB_DASHBOARD=true k6 run k6/scripts/production-path-test.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import {
  BASE_URL,
  DEMO_EMAIL,
  MARKET,
  apiUrl,
  assertEngineEnvelope,
  authHeaders,
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

const MODE = (__ENV.MODE || 'ramp').toLowerCase();
const DURATION = __ENV.DURATION || '3m';
const WRITE_RATIO = Number(__ENV.WRITE_RATIO || 0.35);
const MATCH_RATIO = Number(__ENV.MATCH_RATIO || 0.7);
const CANCEL_RATIO = Number(__ENV.CANCEL_RATIO || 0.5);

const WARMUP_RPS = Number(__ENV.WARMUP_RPS || 10);
const WARMUP_DURATION = __ENV.WARMUP_DURATION || '30s';
const MAX_RPS = Number(__ENV.MAX_RPS || 500);
const STAGE_DURATION = __ENV.STAGE_DURATION || '1m';
const RAMP_STEPS = Number(__ENV.RAMP_STEPS || 5);
const TARGET_RPS = Number(__ENV.TARGET_RPS || 200);
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 100);
const MAX_VUS = Number(__ENV.MAX_VUS || 1000);

/** MODE=step — sequential plateaus to find saturation knee. */
const STEP_PROFILE = (__ENV.STEP_PROFILE || 'standard').toLowerCase();

const STEP_PROFILES = {
  standard: {
    budgetSec: 280,
    warmupRps: 25,
    startRps: 100,
    incrementRps: 100,
    maxRps: 800,
    minIterations: 1000,
    iterMsEstimate: 40,
    vuHeadroom: 2,
    minVus: 100,
    maxVus: 2000,
  },
  aggressive: {
    budgetSec: 360,
    warmupRps: 50,
    startRps: 250,
    incrementRps: 275,
    maxRps: 3000,
    minIterations: 2000,
    iterMsEstimate: 50,
    vuHeadroom: 2.5,
    minVus: 200,
    maxVus: 5000,
  },
  extreme: {
    budgetSec: 420,
    warmupRps: 100,
    startRps: 500,
    incrementRps: 500,
    maxRps: 5000,
    minIterations: 2500,
    iterMsEstimate: 60,
    vuHeadroom: 3,
    minVus: 400,
    maxVus: 8000,
  },
  peak10k: {
    budgetSec: 480,
    warmupRps: 150,
    startRps: 1000,
    incrementRps: 1000,
    maxRps: 10_000,
    minIterations: 3000,
    iterMsEstimate: 80,
    vuHeadroom: 3,
    minVus: 800,
    maxVus: 20_000,
  },
};

const activeStepProfile = STEP_PROFILES[STEP_PROFILE] ?? STEP_PROFILES.standard;

const STEP_BUDGET_SEC = Number(__ENV.STEP_BUDGET_SEC || activeStepProfile.budgetSec);
const STEP_WARMUP_DURATION = __ENV.STEP_WARMUP_DURATION || '15s';
const STEP_WARMUP_RPS = Number(__ENV.STEP_WARMUP_RPS || activeStepProfile.warmupRps);
const STEP_START_RPS = Number(__ENV.STEP_START_RPS || activeStepProfile.startRps);
const STEP_INCREMENT_RPS = Number(__ENV.STEP_INCREMENT_RPS || activeStepProfile.incrementRps);
const STEP_MAX_RPS = Number(
  __ENV.STEP_MAX_RPS || __ENV.MAX_RPS || activeStepProfile.maxRps,
);
const STEP_DURATION = __ENV.STEP_DURATION || '20s';
const STEP_DURATION_MIN_SEC = Number(__ENV.STEP_DURATION_MIN_SEC || 15);
const MIN_ITERATIONS_PER_STEP = Number(
  __ENV.MIN_ITERATIONS_PER_STEP || activeStepProfile.minIterations,
);
const STEP_ITER_MS_ESTIMATE = Number(
  __ENV.STEP_ITER_MS_ESTIMATE || activeStepProfile.iterMsEstimate,
);
const STEP_VU_HEADROOM = Number(__ENV.STEP_VU_HEADROOM || activeStepProfile.vuHeadroom);
const STEP_MIN_VUS = Number(__ENV.STEP_MIN_VUS || activeStepProfile.minVus);
const STEP_MAX_VUS = Number(
  __ENV.STEP_MAX_VUS || Math.max(MAX_VUS, activeStepProfile.maxVus),
);
const STEP_COUNT = Number(__ENV.STEP_COUNT || 0);
const LATENCY_JUMP_FACTOR = Number(__ENV.LATENCY_JUMP_FACTOR || 2);
const LATENCY_JUMP_MS = Number(__ENV.LATENCY_JUMP_MS || 500);
const THROUGHPUT_PLATEAU_PCT = Number(__ENV.THROUGHPUT_PLATEAU_PCT || 10);
const FAIL_RATE_KNEE = Number(__ENV.FAIL_RATE_KNEE || 0.005);
const ENGINE_TIMEOUT_MS = Number(__ENV.ENGINE_TIMEOUT_MS || 10_000);

/** End-to-end latency for POST /order (auth → match → response). */
const createOrderPath = new Trend('production_create_order_path', true);
/** Read path through engine (account + orderbook + open orders). */
const engineReadPath = new Trend('production_engine_read_path', true);

function buildRampStages() {
  const stages = [{ duration: WARMUP_DURATION, target: WARMUP_RPS }];
  for (let step = 1; step <= RAMP_STEPS; step += 1) {
    const target = Math.round(WARMUP_RPS + ((MAX_RPS - WARMUP_RPS) * step) / RAMP_STEPS);
    stages.push({ duration: STAGE_DURATION, target });
  }
  stages.push({ duration: '30s', target: 0 });
  return stages;
}

function buildStepTargets() {
  const targets = [];
  if (STEP_COUNT > 0) {
    for (let i = 0; i < STEP_COUNT; i += 1) {
      targets.push(STEP_START_RPS + i * STEP_INCREMENT_RPS);
    }
    return targets;
  }

  for (let rps = STEP_START_RPS; rps <= STEP_MAX_RPS; rps += STEP_INCREMENT_RPS) {
    targets.push(rps);
  }
  return targets;
}

function thinStepTargets(targets, maxSteps) {
  if (targets.length <= maxSteps) {
    return targets;
  }
  if (maxSteps <= 1) {
    return [targets[targets.length - 1]];
  }

  const thinned = [];
  for (let i = 0; i < maxSteps; i += 1) {
    const index = Math.round((i * (targets.length - 1)) / (maxSteps - 1));
    thinned.push(targets[index]);
  }
  return thinned;
}

function formatDurationSec(totalSec) {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function resolveStepVuPool(peakTargetRps) {
  const requiredVus = Math.ceil(
    peakTargetRps * (STEP_ITER_MS_ESTIMATE / 1000) * STEP_VU_HEADROOM,
  );
  const preAllocatedVUs = Math.min(
    STEP_MAX_VUS,
    Math.max(PRE_ALLOCATED_VUS, STEP_MIN_VUS, requiredVus),
  );
  const maxVUs = Math.min(
    STEP_MAX_VUS,
    Math.max(preAllocatedVUs, requiredVus * 4, Math.ceil(peakTargetRps * 2)),
  );

  return { preAllocatedVUs, maxVUs, requiredVus };
}

function resolvePlateauDurationSec(targetRps, baseDurationSec) {
  const minForLoad = Math.ceil(MIN_ITERATIONS_PER_STEP / targetRps);
  return Math.max(baseDurationSec, minForLoad, STEP_DURATION_MIN_SEC);
}

function resolveStepPlanTiming(targets) {
  const warmupSec = parseDurationSeconds(STEP_WARMUP_DURATION);
  const preferredStepSec = parseDurationSeconds(STEP_DURATION);
  const availableForPlateaus = Math.max(0, STEP_BUDGET_SEC - warmupSec);
  const loadFloorSec = Math.ceil(MIN_ITERATIONS_PER_STEP / STEP_START_RPS);
  const minStepSec = Math.max(STEP_DURATION_MIN_SEC, loadFloorSec);

  let stepDurationSec = Math.max(preferredStepSec, minStepSec);
  let adjustedTargets = targets;

  if (adjustedTargets.length * stepDurationSec > availableForPlateaus) {
    stepDurationSec = Math.max(
      minStepSec,
      Math.floor(availableForPlateaus / adjustedTargets.length),
    );
  }

  if (adjustedTargets.length * stepDurationSec > availableForPlateaus) {
    const maxSteps = Math.max(1, Math.floor(availableForPlateaus / minStepSec));
    adjustedTargets = thinStepTargets(adjustedTargets, maxSteps);
    stepDurationSec = Math.max(
      minStepSec,
      Math.floor(availableForPlateaus / adjustedTargets.length),
    );
  }

  const plateaus = adjustedTargets.map((targetRps) => {
    const durationSec = resolvePlateauDurationSec(targetRps, stepDurationSec);
    return {
      targetRps,
      durationSec,
      durationLabel: `${durationSec}s`,
      expectedIterations: targetRps * durationSec,
    };
  });

  const totalPlateauSec = plateaus.reduce((sum, step) => sum + step.durationSec, 0);
  const totalDurationSec = warmupSec + totalPlateauSec;

  return {
    targets: adjustedTargets,
    plateaus,
    stepDurationSec,
    stepDurationLabel: `${stepDurationSec}s`,
    warmupSec,
    warmupDurationLabel: STEP_WARMUP_DURATION,
    totalDurationSec,
    totalDurationLabel: formatDurationSec(totalDurationSec),
    budgetSec: STEP_BUDGET_SEC,
    preferredStepSec,
    loadFloorSec,
    minIterationsPerStep: MIN_ITERATIONS_PER_STEP,
    thinned: adjustedTargets.length < targets.length,
    originalTargetCount: targets.length,
    exceedsBudget: totalDurationSec > STEP_BUDGET_SEC,
  };
}

function buildStepPlan() {
  const timing = resolveStepPlanTiming(buildStepTargets());
  const { plateaus, warmupSec, warmupDurationLabel } = timing;
  const peakTargetRps =
    plateaus.length > 0 ? plateaus[plateaus.length - 1].targetRps : STEP_MAX_RPS;
  const vuPool = resolveStepVuPool(peakTargetRps);
  let startSec = 0;
  const scenarios = {};

  scenarios.production_warmup = {
    executor: 'constant-arrival-rate',
    rate: STEP_WARMUP_RPS,
    timeUnit: '1s',
    duration: warmupDurationLabel,
    preAllocatedVUs: vuPool.preAllocatedVUs,
    maxVUs: vuPool.maxVUs,
    exec: 'productionPath',
    startTime: '0s',
    tags: { step_target_rps: String(STEP_WARMUP_RPS), step_kind: 'warmup' },
  };
  startSec += warmupSec;

  for (const plateau of plateaus) {
    const scenarioName = `step_${plateau.targetRps}`;
    scenarios[scenarioName] = {
      executor: 'constant-arrival-rate',
      rate: plateau.targetRps,
      timeUnit: '1s',
      duration: plateau.durationLabel,
      preAllocatedVUs: vuPool.preAllocatedVUs,
      maxVUs: vuPool.maxVUs,
      exec: 'productionPath',
      startTime: `${startSec}s`,
      tags: { step_target_rps: String(plateau.targetRps), step_kind: 'plateau' },
    };
    startSec += plateau.durationSec;
  }

  return {
    scenarios,
    targets: plateaus.map((step) => step.targetRps),
    plateaus,
    stepDurationSec: timing.stepDurationSec,
    stepDurationLabel: timing.stepDurationLabel,
    warmupSec,
    totalDurationSec: timing.totalDurationSec,
    totalDurationLabel: timing.totalDurationLabel,
    budgetSec: timing.budgetSec,
    exceedsBudget: timing.exceedsBudget,
    thinned: timing.thinned,
    originalTargetCount: timing.originalTargetCount,
    preferredStepSec: timing.preferredStepSec,
    loadFloorSec: timing.loadFloorSec,
    minIterationsPerStep: timing.minIterationsPerStep,
    vuPool,
    peakTargetRps,
  };
}

function scheduledStepAvgIterRate(plan) {
  const warmupSec = plan.warmupSec;
  let scheduledIterations = STEP_WARMUP_RPS * warmupSec;
  let totalSeconds = warmupSec;

  for (const plateau of plan.plateaus ?? []) {
    scheduledIterations += plateau.targetRps * plateau.durationSec;
    totalSeconds += plateau.durationSec;
  }

  return {
    avgRate: totalSeconds > 0 ? scheduledIterations / totalSeconds : 0,
    peakTarget: plan.peakTargetRps ?? STEP_MAX_RPS,
  };
}

function scenarioMetric(metrics, metricName, scenarioName) {
  return metrics?.[`${metricName}{scenario:${scenarioName}}`]?.values ?? null;
}

/** Time-weighted mean iteration rate if k6 hits every stage target exactly. */
function scheduledAvgIterRate() {
  const stageSeconds = parseDurationSeconds(STAGE_DURATION);
  const warmupSeconds = parseDurationSeconds(WARMUP_DURATION);
  const rampDownSeconds = 30;
  const stages = buildRampStages();

  let scheduledIterations = 0;
  let totalSeconds = 0;
  for (const stage of stages) {
    const seconds = parseDurationSeconds(stage.duration);
    scheduledIterations += stage.target * seconds;
    totalSeconds += seconds;
  }

  return {
    iterations: scheduledIterations,
    seconds: totalSeconds,
    avgRate: totalSeconds > 0 ? scheduledIterations / totalSeconds : 0,
    peakTarget: stages.length > 1 ? stages[stages.length - 2].target : MAX_RPS,
    warmupSeconds,
    stageSeconds,
    rampDownSeconds,
  };
}

function parseDurationSeconds(duration) {
  const match = String(duration).match(/^(\d+)(s|m|h)$/);
  if (!match) {
    return 60;
  }
  const value = Number(match[1]);
  if (match[2] === 'm') return value * 60;
  if (match[2] === 'h') return value * 3600;
  return value;
}

const stepPlan = MODE === 'step' ? buildStepPlan() : null;

function buildScenarios() {
  if (MODE === 'constant') {
    return {
      production_constant: {
        executor: 'constant-arrival-rate',
        rate: TARGET_RPS,
        timeUnit: '1s',
        duration: DURATION,
        preAllocatedVUs: PRE_ALLOCATED_VUS,
        maxVUs: MAX_VUS,
        exec: 'productionPath',
      },
    };
  }

  if (MODE === 'step') {
    return stepPlan.scenarios;
  }

  return {
    production_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: WARMUP_RPS,
      timeUnit: '1s',
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
      stages: buildRampStages(),
      exec: 'productionPath',
    },
  };
}

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: buildScenarios(),
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.03', abortOnFail: false }],
    checks: [{ threshold: 'rate>0.90', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(99)<3000', abortOnFail: false }],
    production_create_order_path: [{ threshold: 'p(99)<2500', abortOnFail: false }],
    production_engine_read_path: [{ threshold: 'p(99)<1500', abortOnFail: false }],
    'http_req_duration{name:create_market_order}': [{ threshold: 'p(99)<2500', abortOnFail: false }],
    'http_req_duration{name:create_limit_order}': [{ threshold: 'p(99)<2500', abortOnFail: false }],
    'http_req_duration{name:account}': [{ threshold: 'p(99)<1200', abortOnFail: false }],
    'http_req_duration{name:orderbook}': [{ threshold: 'p(99)<1200', abortOnFail: false }],
    order_fills: [{ threshold: 'count>0', abortOnFail: false }],
  },
  tags: {
    test: 'production-path',
    market: MARKET,
    db_persistence: 'disabled',
  },
};

let session = null;

function ensureSession() {
  if (session?.token) {
    return session;
  }
  session = login();
  return session;
}

function runEngineReads(auth) {
  const readStart = Date.now();

  const accountRes = http.get(apiUrl(`/account/${auth.userId}`), {
    headers: authHeaders(auth.token),
    tags: { name: 'account', path: 'engine_read' },
  });
  assertEngineEnvelope(accountRes, 'account');

  fetchOrderbook(MARKET);

  const openOrdersRes = http.get(apiUrl('/order'), {
    headers: authHeaders(auth.token),
    tags: { name: 'open_orders', path: 'engine_read' },
  });
  assertEngineEnvelope(openOrdersRes, 'open_orders');

  engineReadPath.add(Date.now() - readStart);
}

function runOrderWrite(auth) {
  const account = getAccountState(auth.token, auth.userId);
  const orderbook = fetchOrderbook(MARKET);
  const side = Math.random() < 0.5 ? 'LONG' : 'SHORT';
  const shouldMatch = Math.random() < MATCH_RATIO;
  const plan = planOrder(account, orderbook, side, __VU, shouldMatch);

  if (!plan?.affordable) {
    check(null, { 'write skipped — insufficient margin': () => true });
    return;
  }

  const writeStart = Date.now();
  placeOrderFromPlan(auth.token, plan);
  createOrderPath.add(Date.now() - writeStart);

  getOpenOrders(auth.token);

  if (Math.random() < CANCEL_RATIO) {
    const openOrders = getOpenOrders(auth.token);
    const cancellable = openOrders.find((o) => o.market === MARKET);
    if (cancellable?.id) {
      cancelOrder(auth.token, cancellable.id);
    }
  }
}

export function setup() {
  const res = http.get(apiUrl('/ping'), { tags: { name: 'health_ping' } });
  const healthy = check(res, { 'API reachable': (r) => r.status === 200 });
  if (!healthy) {
    throw new Error(`API not reachable at ${BASE_URL}`);
  }

  const auth = login();
  if (!auth) {
    throw new Error(
      `Demo login failed for ${DEMO_EMAIL}. Ensure Postgres is up and run: bun run simulate:orderbook`,
    );
  }

  if (!verifyEngineUser(auth.token, auth.userId)) {
    throw new Error(ENGINE_USER_HINT);
  }

  const orderbook = fetchOrderbook(MARKET);
  if (!orderbook?.bestBid || !orderbook?.bestAsk) {
    throw new Error(
      'Orderbook empty — run simulate:orderbook for sim-user liquidity (required for matching).',
    );
  }

  const setupData = {
    startedAt: Date.now(),
    mode: MODE,
    dbPersistence: false,
  };

  if (MODE === 'constant') {
    setupData.maxRps = TARGET_RPS;
    setupData.scheduledAvgIterRate = TARGET_RPS;
    setupData.peakIterTarget = TARGET_RPS;
  } else if (MODE === 'step' && stepPlan) {
    const stepSchedule = scheduledStepAvgIterRate(stepPlan);
    setupData.maxRps = stepSchedule.peakTarget;
    setupData.scheduledAvgIterRate = stepSchedule.avgRate;
    setupData.peakIterTarget = stepSchedule.peakTarget;
    setupData.stepTargets = stepPlan.targets;
    setupData.stepDurationSec = stepPlan.stepDurationSec;
    setupData.stepCount = stepPlan.targets.length;
    setupData.plannedDurationSec = stepPlan.totalDurationSec;
    setupData.plannedDurationLabel = stepPlan.totalDurationLabel;
    setupData.stepBudgetSec = stepPlan.budgetSec;
    setupData.stepExceedsBudget = stepPlan.exceedsBudget;
    setupData.stepThinned = stepPlan.thinned;
    setupData.minIterationsPerStep = stepPlan.minIterationsPerStep;
    setupData.stepPlateaus = stepPlan.plateaus;
    setupData.vuPool = stepPlan.vuPool;
    setupData.peakTargetRps = stepPlan.peakTargetRps;
    setupData.stepProfile = STEP_PROFILE;
    setupData.saturationThresholds = {
      latencyJumpFactor: LATENCY_JUMP_FACTOR,
      latencyJumpMs: LATENCY_JUMP_MS,
      throughputPlateauPct: THROUGHPUT_PLATEAU_PCT,
      failRateKnee: FAIL_RATE_KNEE,
      engineTimeoutMs: ENGINE_TIMEOUT_MS,
    };
  } else {
    const rampSchedule = scheduledAvgIterRate();
    setupData.maxRps = MAX_RPS;
    setupData.scheduledAvgIterRate = rampSchedule.avgRate;
    setupData.peakIterTarget = rampSchedule.peakTarget;
  }

  return setupData;
}

export function productionPath() {
  const auth = ensureSession();
  if (!auth) {
    sleep(1);
    return;
  }

  group('production_path', () => {
    group('engine_reads', () => {
      runEngineReads(auth);
    });

    if (Math.random() < WRITE_RATIO) {
      group('engine_writes', () => {
        runOrderWrite(auth);
      });
    }
  });
}

export default productionPath;

function metricValue(metrics, name, key) {
  return metrics?.[name]?.values?.[key] ?? null;
}

function formatMs(value) {
  if (value == null || Number.isNaN(value)) {
    return 'n/a';
  }
  return `${value.toFixed(2)}ms`;
}

function latencyBlock(metrics, label, metricName) {
  const values = metrics?.[metricName]?.values;
  if (!values) {
    return [`  ${label}: n/a`];
  }
  return [
    `  ${label}:`,
    `    p50: ${formatMs(values.med ?? values['p(50)'])}`,
    `    p95: ${formatMs(values['p(95)'])}`,
    `    p99: ${formatMs(values['p(99)'])}`,
    `    max: ${formatMs(values.max)}`,
  ];
}

function collectStepSnapshot(metrics, targetRps, stepDurationSec, expectedIterations) {
  const scenarioName = `step_${targetRps}`;
  const iterCount = scenarioMetric(metrics, 'iterations', scenarioName)?.count ?? null;
  const httpCount = scenarioMetric(metrics, 'http_reqs', scenarioName)?.count ?? null;
  const achievedIterRate = iterCount != null ? iterCount / stepDurationSec : null;
  const achievedHttpRate = httpCount != null ? httpCount / stepDurationSec : null;
  const deliveryPct =
    achievedIterRate != null ? (achievedIterRate / targetRps) * 100 : null;
  const iterationCoveragePct =
    iterCount != null && expectedIterations > 0
      ? (iterCount / expectedIterations) * 100
      : null;

  const httpDuration = scenarioMetric(metrics, 'http_req_duration', scenarioName);
  const readPath = scenarioMetric(metrics, 'production_engine_read_path', scenarioName);
  const writePath = scenarioMetric(metrics, 'production_create_order_path', scenarioName);
  const failRate = scenarioMetric(metrics, 'http_req_failed', scenarioName)?.rate ?? 0;
  const dropped = scenarioMetric(metrics, 'dropped_iterations', scenarioName)?.count ?? 0;
  const peakVus = scenarioMetric(metrics, 'vus', scenarioName)?.max ?? null;

  return {
    scenarioName,
    targetRps,
    stepDurationSec,
    expectedIterations,
    achievedIterations: iterCount,
    iterationCoveragePct,
    achievedIterRate,
    achievedHttpRate,
    deliveryPct,
    dropped,
    peakVus,
    failRate,
    httpP95: httpDuration?.['p(95)'] ?? null,
    httpP99: httpDuration?.['p(99)'] ?? null,
    httpMax: httpDuration?.max ?? null,
    readP95: readPath?.['p(95)'] ?? null,
    readP99: readPath?.['p(99)'] ?? null,
    writeP95: writePath?.['p(95)'] ?? null,
    loadDelivered:
      dropped === 0 &&
      (deliveryPct == null || deliveryPct >= 100 - THROUGHPUT_PLATEAU_PCT) &&
      (iterationCoveragePct == null || iterationCoveragePct >= 100 - THROUGHPUT_PLATEAU_PCT),
  };
}

function analyzeSaturationKnee(steps, thresholds) {
  if (!steps?.length) {
    return { kneeTargetRps: null, reasons: [], healthyCeilingRps: null };
  }

  const reasons = [];
  let kneeTargetRps = null;
  let healthyCeilingRps = steps[0].targetRps;

  for (let i = 1; i < steps.length; i += 1) {
    const prev = steps[i - 1];
    const curr = steps[i];
    const stepReasons = [];

    if (prev.httpP95 != null && curr.httpP95 != null) {
      const latencyDelta = curr.httpP95 - prev.httpP95;
      if (
        curr.httpP95 >= prev.httpP95 * thresholds.latencyJumpFactor ||
        latencyDelta >= thresholds.latencyJumpMs
      ) {
        stepReasons.push(
          `p95 jumped ${formatMs(prev.httpP95)} → ${formatMs(curr.httpP95)}`,
        );
      }
    }

    if (prev.achievedIterRate != null && curr.achievedIterRate != null) {
      const targetGrowthPct =
        ((curr.targetRps - prev.targetRps) / prev.targetRps) * 100;
      const achievedGrowthPct =
        ((curr.achievedIterRate - prev.achievedIterRate) / prev.achievedIterRate) * 100;
      if (
        targetGrowthPct > 0 &&
        achievedGrowthPct < (targetGrowthPct * thresholds.throughputPlateauPct) / 100
      ) {
        stepReasons.push(
          `throughput plateaued (${achievedGrowthPct.toFixed(1)}% iter/s gain vs ${targetGrowthPct.toFixed(1)}% target increase)`,
        );
      }
    }

    if (curr.deliveryPct != null && curr.deliveryPct < 100 - thresholds.throughputPlateauPct) {
      stepReasons.push(`delivery ${curr.deliveryPct.toFixed(1)}% of target`);
    }

    if (!curr.loadDelivered) {
      stepReasons.push('load not fully delivered (dropped iterations or under target rate)');
    }

    if (curr.failRate > thresholds.failRateKnee) {
      stepReasons.push(`fail rate ${(curr.failRate * 100).toFixed(3)}%`);
    }

    if (curr.dropped > 0) {
      stepReasons.push(`${curr.dropped} dropped iterations`);
    }

    if (curr.httpMax != null && curr.httpMax >= thresholds.engineTimeoutMs * 0.9) {
      stepReasons.push(`max latency ${formatMs(curr.httpMax)} (engine dispatch timeout)`);
    }

    if (stepReasons.length > 0) {
      kneeTargetRps = curr.targetRps;
      reasons.push({ targetRps: curr.targetRps, signals: stepReasons });
      break;
    }

    if (curr.loadDelivered) {
      healthyCeilingRps = curr.targetRps;
    }
  }

  return { kneeTargetRps, reasons, healthyCeilingRps };
}

function buildStepSaturationReport(data) {
  const plateauPlan = data.setup_data?.stepPlateaus ?? [];
  const targets =
    plateauPlan.length > 0
      ? plateauPlan.map((step) => step.targetRps)
      : data.setup_data?.stepTargets ?? buildStepTargets();
  const thresholds = data.setup_data?.saturationThresholds ?? {
    latencyJumpFactor: LATENCY_JUMP_FACTOR,
    latencyJumpMs: LATENCY_JUMP_MS,
    throughputPlateauPct: THROUGHPUT_PLATEAU_PCT,
    failRateKnee: FAIL_RATE_KNEE,
    engineTimeoutMs: ENGINE_TIMEOUT_MS,
  };
  const vuPool = data.setup_data?.vuPool;

  const steps = targets.map((targetRps, index) => {
    const plateau = plateauPlan[index];
    const stepDurationSec =
      plateau?.durationSec ?? data.setup_data?.stepDurationSec ?? parseDurationSeconds(STEP_DURATION);
    const expectedIterations =
      plateau?.expectedIterations ?? targetRps * stepDurationSec;
    return collectStepSnapshot(
      data.metrics,
      targetRps,
      stepDurationSec,
      expectedIterations,
    );
  });
  const { kneeTargetRps, reasons, healthyCeilingRps } = analyzeSaturationKnee(
    steps,
    thresholds,
  );

  const lines = [
    '',
    '  Step plateaus (each holds fixed iteration rate before the next):',
    '  target | hold | achieved iter/s | delivery | iters | http p95 | read p95 | fail% | dropped | max',
  ];

  for (const step of steps) {
    lines.push(
      [
        `  ${String(step.targetRps).padStart(6)}`,
        `| ${String(step.stepDurationSec).padStart(4)}s`,
        `| ${step.achievedIterRate != null ? step.achievedIterRate.toFixed(1).padStart(14) : '           n/a'}`,
        `| ${step.deliveryPct != null ? `${step.deliveryPct.toFixed(1)}%`.padStart(8) : '     n/a'}`,
        `| ${step.achievedIterations != null ? String(step.achievedIterations).padStart(5) : '  n/a'}`,
        `| ${formatMs(step.httpP95).padStart(8)}`,
        `| ${formatMs(step.readP95).padStart(8)}`,
        `| ${(step.failRate * 100).toFixed(3).padStart(5)}`,
        `| ${String(step.dropped).padStart(7)}`,
        `| ${formatMs(step.httpMax)}`,
      ].join(' '),
    );
  }

  lines.push('');
  if (kneeTargetRps != null) {
    lines.push(`  Saturation knee:     ~${kneeTargetRps} iter/s (first step with sharp degradation)`);
    lines.push(`  Healthy ceiling:     ~${healthyCeilingRps} iter/s (last step before knee)`);
    for (const reason of reasons) {
      lines.push(`    @ ${reason.targetRps} iter/s: ${reason.signals.join('; ')}`);
    }
  } else {
    lines.push(`  Saturation knee:     not detected through ${targets[targets.length - 1]} iter/s`);
    lines.push(`  Healthy ceiling:     ≥ ${healthyCeilingRps} iter/s — raise STEP_MAX_RPS or STEP_COUNT`);
  }

  lines.push('');
  if (vuPool) {
    lines.push(
      `  VU pool:             preAllocated=${vuPool.preAllocatedVUs}, max=${vuPool.maxVus} (required≈${vuPool.requiredVus} for ${data.setup_data?.peakTargetRps ?? STEP_MAX_RPS} iter/s)`,
    );
  }
  lines.push(
    `  Load floor:          ≥${data.setup_data?.minIterationsPerStep ?? MIN_ITERATIONS_PER_STEP} iterations per plateau`,
  );
  lines.push(
    `  Step profile:        ${data.setup_data?.stepProfile ?? STEP_PROFILE} (peak target ${data.setup_data?.peakTargetRps ?? STEP_MAX_RPS} iter/s)`,
  );
  lines.push(
    `  Planned duration:    ${data.setup_data?.plannedDurationLabel ?? formatDurationSec(stepPlan?.totalDurationSec ?? 0)} (budget ${data.setup_data?.stepBudgetSec ?? STEP_BUDGET_SEC}s)`,
  );
  if (data.setup_data?.stepExceedsBudget) {
    lines.push(
      '  Note:                exceeds time budget slightly to preserve minimum load per plateau',
    );
  }
  if (data.setup_data?.stepThinned) {
    lines.push(
      `  Note:                thinned to ${steps.length} plateaus to stay within time budget`,
    );
  }
  lines.push(
    `  Step config: start=${STEP_START_RPS}, increment=${STEP_INCREMENT_RPS}, top=${targets[targets.length - 1]} iter/s`,
  );

  return { lines: lines.join('\n'), steps, kneeTargetRps, healthyCeilingRps, reasons };
}

function buildProductionReport(data) {
  const { metrics } = data;
  const achievedIterRate = metricValue(metrics, 'iterations', 'rate');
  const achievedHttpRate = metricValue(metrics, 'http_reqs', 'rate');
  const httpPerIter =
    achievedIterRate > 0 && achievedHttpRate != null
      ? achievedHttpRate / achievedIterRate
      : null;
  const fillCount = metricValue(metrics, 'order_fills', 'count');
  const engineErrorCount = metricValue(metrics, 'engine_errors', 'count');
  const droppedIterations = metricValue(metrics, 'dropped_iterations', 'count');
  const vusMax = metricValue(metrics, 'vus_max', 'max');
  const peakActiveVus = metricValue(metrics, 'vus', 'max');

  const peakTarget = data.setup_data?.peakIterTarget ?? MAX_RPS;
  const scheduledAvg = data.setup_data?.scheduledAvgIterRate ?? scheduledAvgIterRate().avgRate;
  const deliveryPct =
    scheduledAvg > 0 && achievedIterRate != null
      ? ((achievedIterRate / scheduledAvg) * 100).toFixed(1)
      : 'n/a';

  const reportMode = data.setup_data?.mode ?? MODE;
  const executorLabel =
    reportMode === 'constant'
      ? 'constant-arrival-rate'
      : reportMode === 'step'
        ? 'stepped constant-arrival-rate (saturation probe)'
        : 'ramping-arrival-rate';
  const stepReport =
    reportMode === 'step' ? buildStepSaturationReport(data) : null;

  const lines = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '  TEST 5 — FULL PRODUCTION PATH (no DB persistence)',
    '═══════════════════════════════════════════════════════════════',
    '',
    '  Path: API → Auth → Validation → Risk → Redis → Matching → Response',
    '  DB:   login only (setup); db-poller OFF — orders not persisted',
    '',
    `  Executor:              ${executorLabel}`,
    '',
    '  Iteration rate (arrival executor target is iterations/s, not HTTP/s):',
    `    Peak stage target:   ${peakTarget} iter/s  (final ramp stage only)`,
    `    Scheduled avg:       ${scheduledAvg.toFixed(1)} iter/s  (time-weighted across all stages)`,
    `    Achieved avg:        ${achievedIterRate != null ? achievedIterRate.toFixed(1) : 'n/a'} iter/s  (${deliveryPct}% of scheduled)`,
    `    Dropped iterations:  ${droppedIterations ?? 0}`,
    '',
    '  HTTP throughput (each iteration ≈ 3 reads + optional writes):',
    `    Achieved HTTP rate:  ${achievedHttpRate != null ? achievedHttpRate.toFixed(1) : 'n/a'} req/s`,
    `    HTTP per iteration:  ${httpPerIter != null ? httpPerIter.toFixed(2) : 'n/a'}`,
    '',
    `  VU allocation:       max=${vusMax ?? 'n/a'}, peak active=${peakActiveVus ?? 'n/a'}`,
    `  Failed rate:         ${metricValue(metrics, 'http_req_failed', 'rate') != null ? `${(metricValue(metrics, 'http_req_failed', 'rate') * 100).toFixed(3)}%` : 'n/a'}`,
    `  Matching fills:      ${fillCount ?? 0}`,
    `  Engine errors:       ${engineErrorCount ?? 0}`,
    '',
    '  Latency — full write path (POST /order):',
    ...latencyBlock(metrics, '', 'production_create_order_path'),
    '',
    '  Latency — engine read bundle (account + book + open orders):',
    ...latencyBlock(metrics, '', 'production_engine_read_path'),
    '',
    '  Per-endpoint p99:',
    `    account:           ${formatMs(metricValue(metrics, 'http_req_duration{name:account}', 'p(99)'))}`,
    `    orderbook:         ${formatMs(metricValue(metrics, 'http_req_duration{name:orderbook}', 'p(99)'))}`,
    `    create_market:     ${formatMs(metricValue(metrics, 'http_req_duration{name:create_market_order}', 'p(99)'))}`,
    `    create_limit:      ${formatMs(metricValue(metrics, 'http_req_duration{name:create_limit_order}', 'p(99)'))}`,
    `    cancel_order:      ${formatMs(metricValue(metrics, 'http_req_duration{name:cancel_order}', 'p(99)'))}`,
    '',
  ];

  if (stepReport) {
    lines.push(stepReport.lines);
  }

  lines.push(
    '  Monitor API + trade-engine CPU/RSS separately during the run.',
    '',
    '═══════════════════════════════════════════════════════════════',
    '',
  );

  return { text: lines.join('\n'), stepReport };
}

export function teardown(data) {
  if (!data?.startedAt) return;
  const elapsedSec = ((Date.now() - data.startedAt) / 1000).toFixed(1);
  console.log(`Production path test finished after ${elapsedSec}s (db-poller was not required).`);
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `k6/reports/production-path-${stamp}`;
  const { text: report, stepReport } = buildProductionReport(data);

  const summaryPayload = {
    test: 'production-path',
    dbPersistence: false,
    mode: data.setup_data?.mode ?? MODE,
    peakIterTarget: data.setup_data?.peakIterTarget ?? MAX_RPS,
    scheduledAvgIterRate: data.setup_data?.scheduledAvgIterRate ?? scheduledAvgIterRate().avgRate,
    achievedIterRate: metricValue(data.metrics, 'iterations', 'rate'),
    achievedHttpRate: metricValue(data.metrics, 'http_reqs', 'rate'),
    httpPerIteration:
      metricValue(data.metrics, 'iterations', 'rate') > 0
        ? metricValue(data.metrics, 'http_reqs', 'rate') /
          metricValue(data.metrics, 'iterations', 'rate')
        : null,
    droppedIterations: metricValue(data.metrics, 'dropped_iterations', 'count'),
    vusMax: metricValue(data.metrics, 'vus_max', 'max'),
    peakActiveVus: metricValue(data.metrics, 'vus', 'max'),
    matchingFills: metricValue(data.metrics, 'order_fills', 'count'),
    engineErrors: metricValue(data.metrics, 'engine_errors', 'count'),
    createOrderPath: data.metrics.production_create_order_path?.values,
    engineReadPath: data.metrics.production_engine_read_path?.values,
    saturation:
      stepReport != null
        ? {
            plannedDurationSec: data.setup_data?.plannedDurationSec,
            plannedDurationLabel: data.setup_data?.plannedDurationLabel,
            stepBudgetSec: data.setup_data?.stepBudgetSec,
            minIterationsPerStep: data.setup_data?.minIterationsPerStep,
            vuPool: data.setup_data?.vuPool,
            stepProfile: data.setup_data?.stepProfile,
            peakTargetRps: data.setup_data?.peakTargetRps,
            kneeTargetRps: stepReport.kneeTargetRps,
            healthyCeilingRps: stepReport.healthyCeilingRps,
            reasons: stepReport.reasons,
            steps: stepReport.steps,
          }
        : null,
  };

  return {
    [`${base}.html`]: htmlReport(data, { title: 'Full Production Path Load Test' }),
    [`${base}.json`]: JSON.stringify({ ...data, productionSummary: summaryPayload }, null, 2),
    stdout: report + textSummary(data, { indent: ' ', enableColors: true }),
  };
}
