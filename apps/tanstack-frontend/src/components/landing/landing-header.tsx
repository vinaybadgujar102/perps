import { Link, useMatchRoute } from "@tanstack/react-router";
import { HeaderUserMenu } from "#/components/common/header-user-menu";
import { useUser } from "#/context/user-context";
import { cn } from "#/lib/utils";

const NAV_LINKS = [
  { label: "Trade", to: "/dashboard" as const },
  { label: "Markets", to: "/dashboard" as const },
  { label: "Leaderboard", to: "/" as const },
] as const;

export function LandingHeader() {
  const { isAuthenticated, isLoading } = useUser();
  const matchRoute = useMatchRoute();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-background px-10 py-4 max-md:px-4">
      <Link
        to="/"
        className="headline-lg text-foreground uppercase tracking-tighter"
      >
        PERPS.IO
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((link) => {
          const isActive = Boolean(matchRoute({ to: link.to, fuzzy: false }));

          return (
            <Link
              key={link.label}
              to={link.to}
              className={cn(
                "mono-label text-foreground-muted transition-colors hover:text-foreground",
                isActive && "border-b-2 border-accent pb-1 text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        {isLoading ? null : isAuthenticated ? (
          <HeaderUserMenu />
        ) : (
          <Link
            to="/login"
            className="mono-label border border-border px-4 py-2 text-foreground transition-colors hover:border-foreground"
          >
            Connect Wallet
          </Link>
        )}
      </div>
    </header>
  );
}
