import type { AuthUser } from "@repo/sharedtypes";

const TOKEN_KEY = "auth-token";
const USER_KEY = "auth-user";

export type AuthSession = {
  token: string;
  user: AuthUser;
};

function parseUser(raw: string): AuthUser | null {
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (
      typeof parsed.id === "number" &&
      typeof parsed.email === "string" &&
      typeof parsed.name === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);

  if (!token || !userRaw) {
    return null;
  }

  const user = parseUser(userRaw);
  if (!user) {
    clearSession();
    return null;
  }

  return { token, user };
}

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
