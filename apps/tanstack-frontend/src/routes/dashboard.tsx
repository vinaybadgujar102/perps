import { createFileRoute } from "@tanstack/react-router";
import { ChartSection } from "#/components/common/chart-section";
import { SiteHeader } from "#/components/common/site-header";
import { TradingPanel } from "#/components/common/trading-panel";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="text-foreground h-screen flex flex-col">
      <SiteHeader />
      <section className="flex flex-1 overflow-hidden">
        <ChartSection />
        <div className="flex-1">First</div>
        <TradingPanel />
      </section>
      <footer className="h-10 shrink-0 border-t border-border">hi</footer>
    </div>
  );
}
