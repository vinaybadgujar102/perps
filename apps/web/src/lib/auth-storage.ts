const TOKEN_KEY = "perps_auth_token";
const USER_KEY = "perps_auth_user";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const parseUser = (raw: string): AuthUser | null => {
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
};

export const loadSession = (): AuthSession | null => {
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
};

export const saveSession = (token: string, user: AuthUser): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
