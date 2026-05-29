import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../context/auth-context";
import { createOnrampDeposit, fetchAccountState } from "../lib/api";
import { formatNumber } from "../lib/format";

const DEPOSIT_PRESETS = [100, 500, 1000];

export const TradePanel = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [amountInput, setAmountInput] = useState("");

  const accountQuery = useQuery({
    queryKey: ["account", user?.id],
    queryFn: () => fetchAccountState(user!.id),
    enabled: isAuthenticated && Boolean(user?.id),
  });

  const depositMutation = useMutation({
    mutationFn: (amountUsd: number) => createOnrampDeposit(amountUsd),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account", user?.id] });
      setShowDepositForm(false);
      setAmountInput("");
    },
  });

  const availableMarginUsd = accountQuery.data?.availableMarginUsd ?? 0;
  const hasBalance = availableMarginUsd > 0;

  const handleDeposit = () => {
    const amountUsd = Number(amountInput);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
    depositMutation.mutate(amountUsd);
  };

  return (
    <section className="panel trade-panel">
      <div className="panel-title-row trade-head">
        <h2>Spot / Perps</h2>
        {isAuthenticated && accountQuery.data && (
          <p className="trade-balance">
            Available: ${formatNumber(accountQuery.data.availableMarginUsd)}
          </p>
        )}
      </div>
      <div className="trade-tabs buy-sell">
        <button type="button" className="active buy">
          Buy
        </button>
        <button type="button" className="sell">Sell</button>
      </div>
      <div className="inline-tabs order-kind">
        <button type="button" className="is-active">Limit</button>
        <button type="button">Market</button>
        <button type="button">Stop Limit</button>
      </div>
      <div className="trade-form">
        <label htmlFor="priceInput">Price</label>
        <input id="priceInput" value="3748.20 USDT" readOnly />
        <label htmlFor="sizeInput">Amount</label>
        <input id="sizeInput" placeholder="0.00 ETH" disabled />
        <label htmlFor="levInput">Leverage</label>
        <input id="levInput" value="25x" readOnly />
        <button type="button" className="primary-button" disabled>
          Buy Long
        </button>
        {isAuthenticated ? (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowDepositForm((open) => !open)}
            >
              {showDepositForm ? "Cancel Deposit" : "Deposit"}
            </button>
            {showDepositForm && (
              <div className="deposit-form">
                <label htmlFor="depositAmount">Deposit amount (USD)</label>
                <input
                  id="depositAmount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter amount"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                />
                <div className="deposit-presets">
                  {DEPOSIT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="text-button"
                      onClick={() => setAmountInput(String(preset))}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={depositMutation.isPending || !amountInput}
                  onClick={handleDeposit}
                >
                  {depositMutation.isPending ? "Depositing..." : "Confirm Deposit"}
                </button>
                {depositMutation.error && (
                  <p className="trade-warning">{depositMutation.error.message}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <button type="button" className="secondary-button" disabled>
            Deposit
          </button>
        )}
        {!hasBalance && isAuthenticated && !showDepositForm && (
          <p className="trade-warning">Insufficient balance. Deposit to start trading.</p>
        )}
      </div>
    </section>
  );
};
