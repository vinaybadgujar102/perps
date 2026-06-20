import { redirect } from "@tanstack/react-router";
import { loadSession } from "#/lib/auth-storage";

export function requireAuth() {
  if (typeof window === "undefined") {
    return;
  }

  if (!loadSession()) {
    throw redirect({ to: "/login" });
  }
}

export function redirectIfAuthenticated() {
  if (typeof window === "undefined") {
    return;
  }

  if (loadSession()) {
    throw redirect({ to: "/dashboard" });
  }
}
