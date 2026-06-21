import { cn } from "#/lib/utils";

type DemoDataBadgeProps = {
  className?: string;
  label?: string;
};

export function DemoDataBadge({
  className,
  label = "Demo",
}: DemoDataBadgeProps) {
  return (
    <span
      className={cn(
        "mono-label inline-flex shrink-0 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] tracking-widest text-accent",
        className,
      )}
    >
      {label}
    </span>
  );
}
