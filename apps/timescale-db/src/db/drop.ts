import { dropTradesTable } from "./schema";

export async function dropDb() {
  await dropTradesTable();
}
