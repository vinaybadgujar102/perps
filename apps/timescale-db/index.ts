import { startConsumer } from "./src/consumer";

try {
  await startConsumer();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
