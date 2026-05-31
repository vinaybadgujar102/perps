import { AppShell } from "@/components/layout/app-shell";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMarket } from "@/hooks/queries/use-market";
import { fetchMarkets } from "@/hooks/queries/use-markets";
import { queryKeys } from "@/lib/query-keys";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { LoginScreen } from "./screens/login-screen";
import { SignupScreen } from "./screens/signup-screen";
import { TradeRouteView } from "./screens/trade-screen";
import { MarketsRouteView } from "./screens/markets-screen";

type RouterContext = {
  queryClient: QueryClient;
};

const RootLayout = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <AppShell header={<TopNav />}>
      <Outlet />
    </AppShell>
  );
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ error, reset }) => (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Failed to load trading data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button type="button" onClick={reset}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </main>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/trade/$symbol", params: { symbol: "BTC" } });
  },
});

const tradeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trade/$symbol",
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.markets,
      queryFn: fetchMarkets,
    });

    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.market(params.symbol),
      queryFn: () => fetchMarket(params.symbol),
    });
  },
  component: TradeRouteView.Component,
});

const marketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/markets",
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.markets,
      queryFn: fetchMarkets,
    });
  },
  component: MarketsRouteView.Component,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: z.object({
    registered: z.string().optional(),
  }),
  component: LoginScreen,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  tradeRoute,
  marketsRoute,
  loginRoute,
  signupRoute,
]);

export const router = createRouter({
  routeTree,
  context: { queryClient: undefined as unknown as QueryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
