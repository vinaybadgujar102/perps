import type { ApiEnvelope } from "@repo/sharedtypes";

type EngineEnvelope<T> = {
  success: boolean;
  message: string | null;
  data: T | null;
};

export function unwrapEngineResponse<T>(
  envelope: ApiEnvelope<EngineEnvelope<T>>,
): { message: string | null; data: T | null } {
  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.message || "Request failed");
  }
  if (!envelope.data.success) {
    throw new Error(envelope.data.message || "Request failed");
  }
  return { message: envelope.data.message, data: envelope.data.data };
}
