import { createClient } from "redis";

export const redis = await createClient(
  process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined,
).connect();
