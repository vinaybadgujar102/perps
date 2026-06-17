import { useState } from "react";
import { XIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "radix-ui";
import { createPaymentOrder } from "#/api/onramp.api";
import { Dialog, DialogContent, DialogTitle } from "#/components/ui/dialog";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { formatUsd } from "#/lib/format";
import RenderRazorpay from "../payment/razorpayPop";

type DepositDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DepositDialog({ open, onOpenChange }: DepositDialogProps) {
  const { balanceUsd, isBalanceLoading, refreshBalance } = useUser();
  const [depositAmountInput, setDepositAmountInput] = useState("");

  const depositMutation = useMutation({
    mutationFn: createPaymentOrder,
    onSuccess: (result) => {
      setDepositAmountInput("");
    },
    onError: (error) => {
      terminalToast.error(
        "ERROR",
        error instanceof Error ? error.message : "Deposit failed",
      );
    },
  });

  const handleDeposit = () => {
    const amountUsd = Number(depositAmountInput);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      terminalToast.error("ERROR", "Enter a valid deposit amount.");
      return;
    }
    depositMutation.mutate(amountUsd);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDepositAmountInput("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-w-md flex-col gap-0 p-0"
      >
        <div className="flex items-center justify-between border-b border-border bg-surface/50 p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-2 bg-accent" />
            <DialogTitle className="nav-label text-sm font-bold tracking-widest text-white">
              Terminal Deposit
            </DialogTitle>
          </div>
          <DialogPrimitive.Close className="text-input-label transition-colors hover:text-foreground focus:outline-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>

        <div className="space-y-6 p-6">
          <div className="border border-border bg-surface/30 p-4">
            <div className="flex items-center justify-between">
              <span className="nav-label text-[10px] text-input-label">
                Current Balance
              </span>
              <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                {isBalanceLoading || balanceUsd === null
                  ? "—"
                  : `${formatUsd(balanceUsd)} USD`}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="depositAmount"
              className="nav-label text-[10px] text-input-label"
            >
              Deposit Amount
            </label>
            <div className="relative">
              <input
                id="depositAmount"
                type="number"
                min="1"
                step="1"
                placeholder="0.00"
                value={depositAmountInput}
                onChange={(event) => setDepositAmountInput(event.target.value)}
                className="w-full border border-border bg-surface p-3 pr-14 font-mono text-sm tabular-nums text-foreground outline-none placeholder:text-input-label focus:ring-1 focus:ring-accent"
              />
              <span className="nav-label absolute top-1/2 right-3 -translate-y-1/2 text-xs text-input-label">
                USD
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDeposit}
            disabled={depositMutation.isPending || !depositAmountInput}
            className="w-full bg-accent py-4 text-xs font-bold tracking-[0.2em] text-black uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {depositMutation.isPending ? "Depositing..." : "Deposit Funds"}
          </button>
          {depositMutation.isSuccess && depositMutation.data && (
            <RenderRazorpay
              amount={depositMutation.data.amount}
              orderId={depositMutation.data.id}
              keyId={"rzp_test_T2Rqr71c2I3V7o"}
              currency={depositMutation.data.currency}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
