"use client";

import { useState } from "react";
import { TOKEN_SYMBOL } from "@/lib/config";
import { useVaultData } from "@/context/VaultDataContext";
import { useWallet } from "@/context/WalletContext";
import { useTxAction } from "@/hooks/useTxAction";
import { attoToToken, shortenAddress, tokenToAtto } from "@/lib/format";
import { withdraw, withdrawMax } from "@/lib/genlayer/contract";
import { AmountInput, Banner, Button, Card } from "./ui";

/** Withdraw principal + compounded rewards — partial or maximum. */
export function WithdrawPanel() {
  const { address, client } = useWallet();
  const { position, refreshAll } = useVaultData();
  const [amount, setAmount] = useState("");
  const { run, pending, txHash, error } = useTxAction();

  const onSuccess = () => {
    setAmount("");
    void refreshAll();
  };

  async function handleWithdraw() {
    if (!client) return;
    await run(() => withdraw(client, tokenToAtto(amount)), onSuccess);
  }

  async function handleWithdrawMax() {
    if (!client) return;
    await run(() => withdrawMax(client), onSuccess);
  }

  const partialDisabled = !client || pending || tokenToAtto(amount) <= 0n;
  const maxDisabled = !client || pending || position.totalBalance <= 0n;

  return (
    <Card title="Withdraw" subtitle="Withdraw principal plus compounded rewards">
      <div className="space-y-3">
        <p className="text-sm text-vault-muted">
          Available:{" "}
          <span className="font-semibold text-vault-text">
            {attoToToken(position.totalBalance)} {TOKEN_SYMBOL}
          </span>
        </p>
        <AmountInput value={amount} onChange={setAmount} disabled={!address || pending} />
        <div className="flex gap-3">
          <Button
            className="flex-1"
            loading={pending}
            onClick={() => void handleWithdraw()}
            disabled={partialDisabled}
          >
            Withdraw
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => void handleWithdrawMax()}
            disabled={maxDisabled}
          >
            Withdraw Max
          </Button>
        </div>
        {!address && <Banner>Connect your wallet to withdraw.</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
        {txHash && <Banner tone="success">Withdrawn. Tx: {shortenAddress(txHash)}</Banner>}
      </div>
    </Card>
  );
}
