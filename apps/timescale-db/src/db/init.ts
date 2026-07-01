import { createOneMinCandle, createFiveMinCandle } from "./candles";
import { ensureTimescaleExtension } from "./extension";
import { addRetentionPolicy } from "./retention";
import { createTradesTable } from "./schema";

export async function initDb() {
  await ensureTimescaleExtension();
  await createTradesTable();
  await createOneMinCandle();
  await createFiveMinCandle();
  await addRetentionPolicy();
}
