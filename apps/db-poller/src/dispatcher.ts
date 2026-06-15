import { eventSchema } from "@repo/sharedtypes";
import type z from "zod";

export interface handler<T = z.infer<typeof eventSchema>> {
  handle(event: T): void | Promise<void>;
}
