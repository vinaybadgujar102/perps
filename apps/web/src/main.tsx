import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "./context/auth-context";
import { router } from "./router";
import "./styles.css";

const queryClient = new QueryClient();

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root container not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} context={{ queryClient }} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
