export function RegisterLeftPanel() {
  return (
    <section className="flex-2">
      <div className="flex flex-col gap-14">
        <div className="gap-4 flex flex-col">
          <div className="h-16 w-1 bg-accent" />
          <div className="display-lg md:display-xl text-foreground uppercase tracking-tighter">
            <h1 className="font-extrabold">
              JOIN THE <br />
              <span className="text-accent">ELITE</span>
            </h1>
          </div>
          <p className="text-negative max-w-md">
            Create your account and start trading perpetuals with millisecond
            execution and institutional-grade liquidity.
          </p>
        </div>
        <div className="hidden lg:flex gap-4 items-center">
          <div className="h-px w-12 bg-foreground-muted" />
          <p className="mono-label text-negative">
            SECURE / ENCRYPTED / DIRECT
          </p>
        </div>
      </div>
    </section>
  );
}
