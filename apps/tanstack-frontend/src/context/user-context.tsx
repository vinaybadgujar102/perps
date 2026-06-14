import type { AuthUser } from "@repo/sharedtypes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
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
import { queryKeys } from "#/lib/query-keys";

type UserContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  balanceUsd: number | null;
  availableMarginUsd: number | null;
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

  const setSession = (nextSession: AuthSession) => {
    saveSession(nextSession.token, nextSession.user);
    setSessionState(nextSession);
  };

  const logout = () => {
    clearSession();
    setSessionState(null);
    queryClient.removeQueries({ queryKey: ["account"] });
  };

  const accountQuery = useQuery({
    queryKey: queryKeys.account(session?.user.id ?? 0),
    queryFn: () => getAccountApi(session!.user.id),
    enabled: Boolean(session?.user.id),
  });

  const refreshBalance = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.account(session?.user.id ?? 0),
    });
  };

  const value: UserContextValue = {
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: Boolean(session),
    isLoading,
    balanceUsd: accountQuery.data?.balanceUsd ?? null,
    availableMarginUsd: accountQuery.data?.availableMarginUsd ?? null,
    isBalanceLoading: accountQuery.isLoading,
    setSession,
    logout,
    refreshBalance,
  };

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
