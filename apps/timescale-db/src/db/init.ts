import { createOneMinCandle, createFiveMinCandle } from "./candles";
import { addRetentionPolicy } from "./retention";
import { createTradesTable } from "./schema";

export async function initDb() {
  await createTradesTable();
  await createOneMinCandle();
  await createFiveMinCandle();
  await addRetentionPolicy();
}
