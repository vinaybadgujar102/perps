import { z } from "zod";

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: z.string().nullable(),
  });

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const networkError = new Error(
  "Unable to reach backend API. Start the API server and check VITE_API_BASE_URL.",
);

export const requestJson = async <T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T>> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw networkError;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const parsed = schema.parse(json);

  if (!response.ok) {
    const envelope = parsed as { error?: string | null };
    throw new Error(envelope.error ?? `Request failed with status ${response.status}`);
  }

  return parsed;
};

export const get = async <T extends z.ZodTypeAny>(path: string, schema: T): Promise<z.infer<T>> =>
  requestJson(path, schema);

export const post = async <T extends z.ZodTypeAny>(
  path: string,
  body: unknown,
  schema: T,
): Promise<z.infer<T>> =>
  requestJson(path, schema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
