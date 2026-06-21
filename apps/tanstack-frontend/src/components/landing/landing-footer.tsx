import { Globe } from "lucide-react";

const FOOTER_LINKS = ["Terms", "Privacy", "Risk Disclosure"] as const;

export function LandingFooter() {
  return (
    <footer className="flex items-center justify-between border-t border-border bg-background px-10 py-4 max-md:px-4">
      <p className="mono-label text-foreground-muted">
        © 2026 PERPS.IO. HIGH RISK TRADING.
      </p>

      <div className="hidden items-center gap-6 sm:flex">
        {FOOTER_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            className="mono-label text-foreground-muted transition-opacity hover:text-foreground hover:underline hover:decoration-accent"
          >
            {link}
          </a>
        ))}
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Globe className="h-3.5 w-3.5 text-foreground-muted" strokeWidth={1.5} />
        <span className="mono-label text-foreground-muted">
          GLOBAL SERVER: TOKYO-01
        </span>
      </div>
    </footer>
  );
}
