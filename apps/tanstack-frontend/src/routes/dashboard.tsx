import { createFileRoute } from "@tanstack/react-router";
import { ChartSection } from "#/components/common/chart-section";
import { OrderbookPanel } from "#/components/common/orderbook-panel";
import { SiteHeader } from "#/components/common/site-header";
import { TradingFooter } from "#/components/common/trading-footer";
import { TradingPanel } from "#/components/common/trading-panel";
import { useMarketSubscriptions } from "#/hooks/use-market-subscriptions";
import { useUserEvents } from "#/hooks/use-user-events";

const MARKET = "BTC";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  useMarketSubscriptions(MARKET);
  useUserEvents();

  return (
    <div className="text-foreground h-screen flex flex-col">
      <SiteHeader />
      <section className="flex flex-1 overflow-hidden">
        <ChartSection />
        <OrderbookPanel />
        <TradingPanel />
      </section>
      <footer className="h-44 shrink-0 border-t border-border">
        <TradingFooter />
      </footer>
    </div>
  );
}
