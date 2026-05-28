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
import { TopNav } from "./components/top-nav";
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
    <div className="app-shell">
      <TopNav />
      <Outlet />
    </div>
  );
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ error, reset }) => (
    <main className="screen-state error">
      <div className="panel error-panel">
        <h2>Failed to load trading data</h2>
        <p>{error.message}</p>
        <button type="button" className="primary-button" onClick={reset}>
          Retry
        </button>
      </div>
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
      queryKey: ["markets"],
      queryFn: TradeRouteView.fetchMarkets,
    });

    await context.queryClient.ensureQueryData({
      queryKey: ["market", params.symbol],
      queryFn: () => TradeRouteView.fetchMarket(params.symbol),
    });
  },
  component: TradeRouteView.Component,
});

const marketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/markets",
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["markets"],
      queryFn: MarketsRouteView.fetchMarkets,
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
