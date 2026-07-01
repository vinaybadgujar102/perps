export const dbUrl = process.env.DB_URL;

export function requireDbUrl(): string {
  if (!dbUrl) {
    throw new Error(
      "DB_URL is required for timescale-db (e.g. postgresql://postgres:password@127.0.0.1:5433/postgres)",
    );
  }
  return dbUrl;
}
