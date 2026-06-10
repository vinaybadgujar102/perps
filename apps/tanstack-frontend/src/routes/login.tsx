import { Button } from "#/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-screen items-center justify-center m-4">
      <section className="flex-1">
        <div className="flex flex-col gap-14">
          <div className="gap-4 flex flex-col">
            <div>
              <h3 className="text-[#ff3d00] mono-label">TERMINAL.V2.0</h3>
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
          <div className="flex gap-4">
            <p className="mono-label text-negative">Liquidity Score: 99.8%</p>
            <span className="text-foreground">------</span>
            <p className="mono-label text-negative">Latency: 2MS</p>
          </div>
        </div>
      </section>

      <section className="bg-amber-200 flex-1">
        <Button></Button>
        <Button></Button>
      </section>
    </div>
  );
}
