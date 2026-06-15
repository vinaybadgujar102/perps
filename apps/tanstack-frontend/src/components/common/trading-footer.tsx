import { useState } from "react";
import { Button } from "#/components/ui/button";
import { OpenOrdersPanel } from "#/components/common/open-orders-panel";
import { OpenPositionsPanel } from "#/components/common/open-positions-panel";
import { cn } from "#/lib/utils";

type FooterTab = "positions" | "orders";

export function TradingFooter() {
  const [activeTab, setActiveTab] = useState<FooterTab>("positions");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        <Button
          type="button"
          className={cn(
            "cursor-pointer rounded-none bg-transparent font-semibold tracking-wider underline-offset-4 hover:text-foreground",
            activeTab === "positions"
              ? "text-foreground underline decoration-accent underline-offset-8"
              : "text-input-label",
          )}
          onClick={() => setActiveTab("positions")}
        >
          Positions
        </Button>
        <Button
          type="button"
          className={cn(
            "cursor-pointer rounded-none bg-transparent font-semibold tracking-wider underline-offset-4 hover:text-foreground",
            activeTab === "orders"
              ? "text-foreground underline decoration-accent underline-offset-8"
              : "text-input-label",
          )}
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "positions" ? (
          <OpenPositionsPanel />
        ) : (
          <OpenOrdersPanel />
        )}
      </div>
    </div>
  );
}
