export function LoginLeftPanel() {
  return (
    <section className="flex-2">
      <div className="flex flex-col gap-14">
        <div className="gap-4 flex flex-col">
          <div>
            <h3 className="text-accent mono-label">TERMINAL.V2.0</h3>
          </div>
          <div className="display-xl text-foreground">
            <h1>ACCESS</h1>
            <h1>TERMINAL</h1>
          </div>
          <div className="text-negative mono-label text-2xl">
            <h4>Sign in to your high-performance trading dashboard. </h4>
            <h4> Absolute precision and security in every execution.</h4>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <p className="mono-label text-negative">Liquidity Score: 99.8%</p>
          <div className="h-px w-20 bg-foreground" />
          <p className="mono-label text-negative">Latency: 2MS</p>
        </div>
      </div>
    </section>
  );
}
