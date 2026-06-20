#!/usr/bin/env bun
/**
 * One-shot Postgres seed for the demo: markets + sim users (+ optional login user).
 * The orderbook simulator runs this automatically; use this if you only need DB rows.
 *
 * Usage:
 *   bun run demo:seed
 *
 * Requires DATABASE_URL (Bun loads .env from repo root).
 */

import {
  ensureDemoLoginUserInDb,
  seedDemoDatabase,
} from "./lib/demo-db-seed";

const SIM_USER_BASE = Number(process.env.SIM_USER_BASE ?? 9001);
const SIM_USER_COUNT = Number(process.env.SIM_USER_COUNT ?? 5);
const DEMO_SEED_LOGIN_USER = process.env.DEMO_SEED_LOGIN_USER !== "false";

const simUserIds = Array.from(
  { length: SIM_USER_COUNT },
  (_, i) => SIM_USER_BASE + i,
);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  await seedDemoDatabase(simUserIds);
  console.log(`Seeded markets + sim users: ${simUserIds.join(", ")}`);

  if (DEMO_SEED_LOGIN_USER) {
    const demoUser = await ensureDemoLoginUserInDb();
    console.log(
      `Demo login account: ${demoUser.email} / ${demoUser.password} (userId ${demoUser.userId})`,
    );
    console.log(
      "Run simulate:orderbook (or sign up) to create the matching trade-engine user.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
