import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="flex h-24 shrink-0 px-6 p-2 items-center gap-8 border-b-border border-b">
      <div className="text-foreground max-w-fit flex items-center gap-2 flex-none headline-nm">
        <div className="w-6 h-6 bg-accent" />
        PERPS.IO
      </div>
      <nav className="flex-2 font-bold">
        <Link to={"/"}>TRADE</Link>
      </nav>
      <div className="flex items-center w-fit">
        {/* */}
        <Link
          to="/login"
          className="px-4 py-2 bg-transparent text-negative hover:text-foreground tracking-widest text-base"
        >
          LOGIN
        </Link>
        <Link
          to="/register"
          className="px-5 py-2 border border-accent bg-transparent text-negative hover:text-foreground tracking-widest text-base w-fit"
        >
          SIGN UP
        </Link>
      </div>
    </header>
  );
}
