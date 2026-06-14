import { XIcon } from "lucide-react";
import { toast as sonnerToast, type ExternalToast } from "sonner";
import { cn } from "#/lib/utils";

type TerminalToastVariant = "error" | "success";

export type TerminalToastOptions = Pick<ExternalToast, "position">;

type TerminalToastProps = {
  variant: TerminalToastVariant;
  title: string;
  message: string;
  onClose: () => void;
};

function TerminalToast({ variant, title, message, onClose }: TerminalToastProps) {
  const isError = variant === "error";

  return (
    <div
      className={cn(
        "relative flex w-[min(100vw-2rem,18rem)] overflow-hidden border border-border bg-surface-container",
        "font-mono",
      )}
    >
      <div
        className={cn(
          "w-0.5 shrink-0",
          isError ? "bg-accent" : "bg-foreground",
        )}
      />
      <div className="flex flex-1 items-start justify-between gap-2 px-2.5 py-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p
            className={cn(
              "mono-label text-[9px] leading-none tracking-widest",
              isError ? "text-accent" : "text-foreground-muted",
            )}
          >
            {title}
          </p>
          <p className="mono-label text-[9px] leading-snug tracking-[0.06em] text-foreground">
            {message}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className={cn(
              "flex size-3.5 items-center justify-center text-[9px] font-bold leading-none",
              isError
                ? "bg-accent text-background"
                : "border border-foreground text-foreground",
            )}
            style={{ borderRadius: "50%" }}
          >
            {isError ? "!" : "✓"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-input-label transition-colors hover:text-foreground focus:outline-none"
            aria-label="Close"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function showTerminalToast(
  variant: TerminalToastVariant,
  title: string,
  message: string,
  options?: TerminalToastOptions,
) {
  return sonnerToast.custom(
    (id) => (
      <TerminalToast
        variant={variant}
        title={title}
        message={message}
        onClose={() => sonnerToast.dismiss(id)}
      />
    ),
    { position: options?.position ?? "top-right" },
  );
}

const DEFAULT_ERROR_CODE = 500;
const DEFAULT_ERROR_MESSAGE = "SOMETHING_WENT_WRONG";

export const terminalToast = {
  error: (
    code: string | number = DEFAULT_ERROR_CODE,
    message: string = DEFAULT_ERROR_MESSAGE,
    options?: TerminalToastOptions,
  ) => showTerminalToast("error", `ERROR_CODE: ${code}`, message, options),
  success: (title: string, message: string, options?: TerminalToastOptions) =>
    showTerminalToast("success", title, message, options),
};
