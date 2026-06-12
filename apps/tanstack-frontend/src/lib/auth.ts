import { loadSession } from "#/lib/auth-storage";

export function getAuthToken() {
  return loadSession()?.token ?? null;
}
