import { BrandMark } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/stores/auth-store";
import { Link } from "@tanstack/react-router";
import { BarChart3, TrendingUp } from "lucide-react";

export const TopNav = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  return (
    <nav
      className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4"
      aria-label="Primary"
    >
      <div className="flex items-center gap-3">
        <BrandMark />
        <span className="text-sm font-semibold tracking-tight">Market Maker</span>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/trade/$symbol" params={{ symbol: "BTC" }} className="gap-2">
            <TrendingUp className="size-4" aria-hidden="true" />
            Exchange
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/markets" className="gap-2">
            <BarChart3 className="size-4" aria-hidden="true" />
            Markets
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Loading...</span>
        ) : isAuthenticated && user ? (
          <>
            <span className="hidden text-sm text-muted-foreground sm:inline" title={user.email}>
              {user.name}
            </span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
};
