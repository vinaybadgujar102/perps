import { startConsumer } from "./src/consumer";

if (process.env.HOSTED_DEMO === "true") {
  console.log(
    "[timescale-db] HOSTED_DEMO=true — skipping Timescale consumer (charts use fake candles).",
  );
  // Keep process alive so turbo/dev doesn't restart-loop, but do not connect to DB_URL.
  await new Promise(() => {});
}

try {
  await startConsumer();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
