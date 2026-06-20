"use client";

import { TOKEN_SYMBOL } from "@/lib/config";
import { useVaultData } from "@/context/VaultDataContext";
import { useWallet } from "@/context/WalletContext";
import { useTxAction } from "@/hooks/useTxAction";
import { attoToToken, shortenAddress } from "@/lib/format";
import { compoundRewards } from "@/lib/genlayer/contract";
import { Banner, Button, Card } from "./ui";

/** Compound accrued yield back into principal (intelligent compounding). */
export function CompoundPanel() {
  const { address, client } = useWallet();
  const { position, refreshAll } = useVaultData();
  const { run, pending, txHash, error } = useTxAction();

  const hasYield = position.pendingYield > 0n;
  const disabled = !client || pending || !hasYield;

  async function handleCompound() {
    if (!client) return;
    await run(() => compoundRewards(client), () => void refreshAll());
  }

  return (
    <Card title="Compound" subtitle="Re-stake your accrued yield for compounding efficiency">
      <div className="space-y-3">
        <p className="text-sm text-vault-muted">
          Compoundable yield:{" "}
          <span className="font-semibold text-vault-text">
            {attoToToken(position.pendingYield)} {TOKEN_SYMBOL}
          </span>
        </p>
        <Button
          className="w-full"
          loading={pending}
          onClick={() => void handleCompound()}
          disabled={disabled}
        >
          {pending ? "Submitting..." : "Compound Rewards"}
        </Button>
        {!address && <Banner>Connect your wallet to compound.</Banner>}
        {address && !hasYield && <Banner>No yield available to compound yet.</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
        {txHash && <Banner tone="success">Compounded. Tx: {shortenAddress(txHash)}</Banner>}
      </div>
    </Card>
  );
}
