import { Link } from "@tanstack/react-router";
import { HeaderUserMenu } from "#/components/common/header-user-menu";
import { useUser } from "#/context/user-context";
import { cn } from "#/lib/utils";

type SiteHeaderProps = {
  fixed?: boolean;
};

export function SiteHeader({ fixed = false }: SiteHeaderProps) {
  const { isAuthenticated, isLoading } = useUser();

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-4 border-b border-b-border bg-background px-4 py-4",
        fixed && "fixed inset-x-0 top-0 z-40",
      )}
    >
      <Link
        to="/"
        className="flex max-w-fit flex-none items-center gap-2 text-sm font-bold tracking-tight text-foreground"
      >
        <div className="h-4 w-4 bg-accent" />
        PERPS.IO
      </Link>
      <nav className="flex-2 text-sm font-bold">
        <Link to="/dashboard">TRADE</Link>
      </nav>
      <div className="ml-auto flex w-fit items-center">
        {isLoading ? null : isAuthenticated ? (
          <HeaderUserMenu />
        ) : (
          <>
            <Link
              to="/login"
              className="bg-transparent px-3 py-1 text-xs tracking-widest text-negative hover:text-foreground"
            >
              LOGIN
            </Link>
            <Link
              to="/register"
              className="w-fit border border-accent bg-transparent px-3 py-1 text-xs tracking-widest text-negative hover:text-foreground"
            >
              SIGN UP
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
