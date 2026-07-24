/**
 * Interval ms for snapshotting.
 * Default 1 hour; override with SNAPSHOTING_INTERVAL_MS.
 */
export const SNAPSHOTING_INTERVAL_MS = Number(
  process.env.SNAPSHOTING_INTERVAL_MS ?? 1000 * 60 * 60,
);
