import { ChartPanel } from "#/components/common/chart-panel";
import { MarketHeader } from "#/components/common/market-header";

export function ChartSection() {
  return (
    <section className="flex min-h-[24rem] min-w-0 flex-2 flex-col border-r border-border lg:min-h-[28rem]">
      <MarketHeader />
      <ChartPanel />
    </section>
  );
}
