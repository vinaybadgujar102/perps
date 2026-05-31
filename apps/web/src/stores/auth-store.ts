import * as authApi from "@/lib/auth-api";
import {
  clearSession,
  loadSession,
  saveSession,
  type AuthUser,
} from "@/lib/auth-storage";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  hydrate: () => {
    const session = loadSession();
    set({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      isLoading: false,
    });
  },

  login: async (email, password) => {
    const result = await authApi.login({ email, password });
    saveSession(result.token, result.user);
    set({
      user: result.user,
      token: result.token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    clearSession();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));

export const useAuth = () =>
  useAuthStore(
    useShallow((state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      login: state.login,
      logout: state.logout,
    })),
  );
