import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { router } from "./router";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const AuthHydrator = ({ children }: { children: React.ReactNode }) => {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
};

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root container not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthHydrator>
          <RouterProvider router={router} context={{ queryClient }} />
        </AuthHydrator>
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
