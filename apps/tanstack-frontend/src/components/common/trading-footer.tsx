import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ClosedPositionsPanel } from "#/components/common/closed-positions-panel";
import { FillsPanel } from "#/components/common/fills-panel";
import { OpenOrdersPanel } from "#/components/common/open-orders-panel";
import { OpenPositionsPanel } from "#/components/common/open-positions-panel";
import { OrderHistoryPanel } from "#/components/common/order-history-panel";
import { cn } from "#/lib/utils";

type FooterTab =
  | "positions"
  | "orders"
  | "closed"
  | "orderHistory"
  | "fills";

const tabs: { id: FooterTab; label: string }[] = [
  { id: "positions", label: "Positions" },
  { id: "orders", label: "Orders" },
  { id: "closed", label: "Closed" },
  { id: "orderHistory", label: "Order History" },
  { id: "fills", label: "Fills" },
];

export function TradingFooter() {
  const [activeTab, setActiveTab] = useState<FooterTab>("positions");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-4 py-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            className={cn(
              "cursor-pointer shrink-0 rounded-none bg-transparent font-semibold tracking-wider underline-offset-4 hover:text-foreground",
              activeTab === tab.id
                ? "text-foreground underline decoration-accent underline-offset-8"
                : "text-input-label",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "positions" ? <OpenPositionsPanel /> : null}
        {activeTab === "orders" ? <OpenOrdersPanel /> : null}
        {activeTab === "closed" ? <ClosedPositionsPanel /> : null}
        {activeTab === "orderHistory" ? <OrderHistoryPanel /> : null}
        {activeTab === "fills" ? <FillsPanel /> : null}
      </div>
    </div>
  );
}
