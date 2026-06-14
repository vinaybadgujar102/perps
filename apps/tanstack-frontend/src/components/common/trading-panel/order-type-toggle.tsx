import { ORDER_TYPE } from "@repo/sharedtypes";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

type OrderTypeToggleProps = {
  orderType: ORDER_TYPE;
  isAuthenticated: boolean;
  onSelectLimit: () => void;
  onSelectMarket: () => void;
};

export function OrderTypeToggle({
  orderType,
  isAuthenticated,
  onSelectLimit,
  onSelectMarket,
}: OrderTypeToggleProps) {
  return (
    <div>
      <Button
        type="button"
        className={cn(
          "cursor-pointer rounded-none bg-transparent font-semibold tracking-wider underline-offset-4 hover:text-foreground",
          orderType === ORDER_TYPE.LIMIT_ORDER
            ? "text-foreground underline decoration-accent underline-offset-8"
            : "text-input-label",
        )}
        onClick={onSelectLimit}
        disabled={!isAuthenticated}
      >
        LIMIT
      </Button>
      <Button
        type="button"
        className={cn(
          "cursor-pointer rounded-none bg-transparent font-semibold tracking-wider underline-offset-4 hover:text-foreground",
          orderType === ORDER_TYPE.MARKET_ORDER
            ? "text-foreground underline decoration-accent underline-offset-8"
            : "text-input-label",
        )}
        onClick={onSelectMarket}
        disabled={!isAuthenticated}
      >
        MARKET
      </Button>
    </div>
  );
}
