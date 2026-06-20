"use client";

import { useState } from "react";
import { TOKEN_SYMBOL } from "@/lib/config";
import { useVaultData } from "@/context/VaultDataContext";
import { useWallet } from "@/context/WalletContext";
import { useTxAction } from "@/hooks/useTxAction";
import { shortenAddress, tokenToAtto } from "@/lib/format";
import { stake } from "@/lib/genlayer/contract";
import { AmountInput, Banner, Button, Card } from "./ui";

/** Stake tokens into the vault. */
export function StakePanel() {
  const { address, client } = useWallet();
  const { refreshAll } = useVaultData();
  const [amount, setAmount] = useState("");
  const { run, pending, txHash, error } = useTxAction();

  const amountAtto = tokenToAtto(amount);
  const disabled = !client || pending || amountAtto <= 0n;

  async function handleStake() {
    if (!client) return;
    await run(
      () => stake(client, amountAtto),
      () => {
        setAmount("");
        void refreshAll();
      },
    );
  }

  return (
    <Card title="Stake" subtitle="Deposit tokens and start earning yield">
      <div className="space-y-3">
        <AmountInput value={amount} onChange={setAmount} disabled={!address || pending} />
        <Button
          className="w-full"
          loading={pending}
          onClick={() => void handleStake()}
          disabled={disabled}
        >
          {pending ? "Submitting..." : `Stake ${TOKEN_SYMBOL}`}
        </Button>
        {!address && <Banner>Connect your wallet to stake.</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
        {txHash && <Banner tone="success">Staked. Tx: {shortenAddress(txHash)}</Banner>}
      </div>
    </Card>
  );
}
