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
        "mono-label inline-flex shrink-0 items-center rounded border border-accent/50 bg-accent/15 px-2 py-0.5 text-[10px] font-medium tracking-widest text-accent uppercase",
        className,
      )}
    >
      {label}
    </span>
  );
}
