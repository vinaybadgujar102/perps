import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { MoveRight } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import {  } from "@repo/sharedtypes"
export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const form = useForm({
    defaultValues: {
      
    },
    validators: {
      onSubmit: schema
    }
  });
  return (
    <div className="flex h-screen items-center justify-center m-8">
      {/* Left Part */}
      <section className="flex-2">
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
          <div className="flex gap-4 items-center">
            <p className="mono-label text-negative">Liquidity Score: 99.8%</p>
            <div className="h-px w-20 bg-foreground" />
            <p className="mono-label text-negative">Latency: 2MS</p>
          </div>
        </div>
      </section>

      {/* Form Part Right */}
      <section className="flex-1 border-l-foreground-muted border-l">
        {/* Form */}
        <div className="p-8 flex flex-col gap-4 grow-0">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-neutral-400 tracking-wider text-xs">EMAIL</p>
              <Input
                className="bg-foreground h-12 placeholder:text-gray-400"
                placeholder="USER@PERPS.IO"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-neutral-400 tracking-wider text-xs">
                PASSWORD
              </p>
              <Input
                className="bg-foreground h-12 placeholder:text-gray-400"
                placeholder="USER@PERPS.IO"
              />
            </div>
          </div>
          <Button className="pl-0! text-xl bg-transparent text-foreground tracking-widest font-extrabold w-fit cursor-pointer">
            LOGIN
            <MoveRight strokeWidth={4} size={5} />
          </Button>
        </div>

        {/* Bottom animating line */}
        <div className="relative w-full h-px overflow-hidden bg-border mb-4">
          <div className="absolute top-0 left-0 h-px w-24 bg-primary animate-shimmer" />
        </div>
      </section>
    </div>
  );
}
