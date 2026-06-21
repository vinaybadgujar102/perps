import { DemoDataBadge } from "#/components/common/demo-data-badge";

const STATS = [
  { label: "24H VOLUME", value: "$1,284,942,001", accent: true },
  { label: "OPEN INTEREST", value: "$450,210,559" },
  { label: "TRADES/SEC", value: "14,204" },
] as const;

export function LandingStatsStrip() {
  return (
    <section className="border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-10 py-2 max-md:px-4">
        <span className="mono-label text-[10px] text-foreground-muted">
          Platform metrics
        </span>
        <DemoDataBadge label="Demo data" />
      </div>
      <div className="flex divide-x divide-border overflow-x-auto">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-60 shrink-0 flex-col gap-1 px-10 py-6 max-md:px-4"
          >
            <span className="mono-label text-foreground-muted">{stat.label}</span>
            <span
              className={
                "accent" in stat && stat.accent
                  ? "font-mono text-2xl font-bold tracking-tight text-accent"
                  : "font-mono text-2xl font-bold tracking-tight text-foreground"
              }
            >
              {stat.value}
            </span>
          </div>
        ))}

        <div className="flex min-w-60 grow flex-col gap-1 px-10 py-6 max-md:px-4">
          <span className="mono-label text-foreground-muted">SYSTEM STATUS</span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse bg-trading-green" />
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
