import type { AuthUser } from "@repo/sharedtypes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAccountApi } from "#/api/account.api";
import {
  clearSession,
  loadSession,
  saveSession,
  type AuthSession,
} from "#/lib/auth-storage";

type UserContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  balanceUsd: number | null;
  isBalanceLoading: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => void;
  refreshBalance: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSessionState(loadSession());
    setIsLoading(false);
  }, []);

  const setSession = useCallback((nextSession: AuthSession) => {
    saveSession(nextSession.token, nextSession.user);
    setSessionState(nextSession);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
    queryClient.removeQueries({ queryKey: ["account"] });
  }, [queryClient]);

  const accountQuery = useQuery({
    queryKey: ["account", session?.user.id],
    queryFn: () => getAccountApi(session!.user.id),
    enabled: Boolean(session?.user.id),
  });

  const refreshBalance = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["account", session?.user.id],
    });
  }, [queryClient, session?.user.id]);

  const value = useMemo<UserContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      isLoading,
      balanceUsd: accountQuery.data?.balanceUsd ?? null,
      isBalanceLoading: accountQuery.isLoading,
      setSession,
      logout,
      refreshBalance,
    }),
    [
      session,
      isLoading,
      accountQuery.data?.balanceUsd,
      accountQuery.isLoading,
      setSession,
      logout,
      refreshBalance,
    ],
  );

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
