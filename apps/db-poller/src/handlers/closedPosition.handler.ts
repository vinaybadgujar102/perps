import type z from "zod";
import type { handler } from "../dispatcher";
import type { closePositionResponseSchema } from "@repo/sharedtypes";

export class ClosePositionEventHandler implements handler {
  async handle(
    _event: z.infer<typeof closePositionResponseSchema>,
  ): Promise<void> {
  }
}
