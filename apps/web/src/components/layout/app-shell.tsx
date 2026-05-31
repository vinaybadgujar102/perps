import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
};

export const AppShell = ({ children, header }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-background">
      {header}
      {children}
    </div>
  );
};

export const BrandMark = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[#23e3ac] text-xs font-bold text-primary-foreground",
      className,
    )}
  >
    MM
  </span>
);
