import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA_eXFgb4D6OelxF0uIbUJ29yNZiVW72LzQZJ8OEdlywESjbXINqValpkfGes4XFfNlrrQY0tT1xwIbaTSXDDvyUVurYKVTdAI407HjqCeYCyhizGl4J1f0UKd9KNb_Uj_6ej7IOiZtJf4eY8L5QvBgk4mlxJv5YvPp_OCJ0nfnYaLfaVqJf1JZ0Dl_IIClRRegHxmDuPKlRSeqABoMOixlHFBxW9JeawSdoVQ_t8C4tNFs0prjIdbfHUMZEL0w3ktStiNfBFQWDzI";

export function LandingHero() {
  const terminalRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!terminalRef.current) return;

      const moveX = (event.clientX - window.innerWidth / 2) * 0.01;
      const moveY = (event.clientY - window.innerHeight / 2) * 0.01;
      terminalRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <main className="relative flex h-screen w-full flex-col justify-center px-10 pt-16 max-md:px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden opacity-[0.03]"
      >
        <span
          ref={terminalRef}
          className="font-display text-[40vw] font-black leading-none tracking-tighter"
        >
          TERMINAL
        </span>
      </div>

      <div className="relative z-10 grid w-full grid-cols-12 gap-px">
        <div className="col-span-12 flex flex-col gap-6 md:col-span-9 lg:col-span-8">
          <div className="mb-2 inline-flex items-center gap-2 text-accent">
            <span className="h-2 w-2 bg-accent" />
            <span className="mono-label">LIVE MAINNET v4.0</span>
          </div>

          <h1 className="display-xl uppercase leading-[0.85] tracking-[-0.06em] text-foreground">
            THE FUTURE OF
            <br />
            PERPETUALS
          </h1>

          <p className="max-w-xl font-mono text-sm leading-5 tracking-tight text-foreground-muted">
            Institutional-grade liquidity for professional traders. Millisecond
            execution. Zero compromise. The first high-performance terminal
            built for the edge of finance.
          </p>

          <div className="mt-16 flex flex-wrap items-center gap-12">
            <Link
              to="/dashboard"
              className="landing-cta-underline headline-nm uppercase text-foreground"
            >
              START TRADING
            </Link>
            <Link
              to="/dashboard"
              className="headline-nm border border-foreground px-8 py-3 uppercase text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              VIEW MARKETS
            </Link>
          </div>
        </div>

        <div className="hidden flex-col items-end justify-center opacity-80 lg:col-span-4 lg:flex">
          <div className="relative aspect-square w-full border border-border p-4">
            <div className="absolute -top-3 -left-3 bg-background px-2 font-mono text-xs text-accent">
              L_01
            </div>
            <img
              alt="Abstract high-tech obsidian surface with vermillion data reflections"
              className="h-full w-full object-cover brightness-75 grayscale transition-all duration-700 hover:grayscale-0"
              src={HERO_IMAGE}
            />
            <div className="absolute -right-3 -bottom-3 bg-background px-2 font-mono text-xs text-foreground-muted">
              SYST_ACTV
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
