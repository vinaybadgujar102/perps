import { createFileRoute } from "@tanstack/react-router";
import { ChartSection } from "#/components/common/chart-section";
import { OrderbookPanel } from "#/components/common/orderbook-panel";
import { SiteHeader } from "#/components/common/site-header";
import { TradingFooter } from "#/components/common/trading-footer";
import { TradingPanel } from "#/components/common/trading-panel";
import { useMarketSubscriptions } from "#/hooks/use-market-subscriptions";
import { useUserEvents } from "#/hooks/use-user-events";
import { usePaymentFlashToast } from "#/lib/payment-flash";

const MARKET = "BTC";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  useMarketSubscriptions(MARKET);
  useUserEvents();
  usePaymentFlashToast();

  return (
    <div className="text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <section className="flex min-h-[32rem] flex-1 flex-col lg:flex-row">
        <ChartSection />
        <OrderbookPanel />
        <TradingPanel />
      </section>
      <footer className="flex h-64 shrink-0 flex-col overflow-hidden border-t border-border lg:h-72">
        <TradingFooter />
      </footer>
    </div>
  );
}
