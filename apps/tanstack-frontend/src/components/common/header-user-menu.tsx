import { useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { DepositDialog } from "#/components/common/deposit-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useUser } from "#/context/user-context";
import { formatUsd } from "#/lib/format";

export function HeaderUserMenu() {
  const { user, balanceUsd, isBalanceLoading, logout } = useUser();
  const [depositOpen, setDepositOpen] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="mono-label text-input-label">Balance</span>
          <span className="font-mono text-sm font-bold tabular-nums text-foreground">
            {isBalanceLoading || balanceUsd === null
              ? "—"
              : `${formatUsd(balanceUsd)} USD`}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
            <span className="flex size-8 items-center justify-center border border-border bg-surface-container text-foreground-muted">
              <User className="size-4" aria-hidden="true" />
            </span>
            <span className="max-w-32 truncate text-sm font-medium text-foreground">
              {user.name}
            </span>
            <ChevronDown className="size-4 text-foreground-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDepositOpen(true)}>
              Deposit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
    </>
  );
}
