"use client";

import { TOKEN_SYMBOL } from "@/lib/config";
import { useVaultData } from "@/context/VaultDataContext";
import { useWallet } from "@/context/WalletContext";
import { useTxAction } from "@/hooks/useTxAction";
import { attoToToken, bpsToPercent, shortenAddress } from "@/lib/format";
import { updateApyFromMarket } from "@/lib/genlayer/contract";
import { Banner, Button, Card, Skeleton, Stat } from "./ui";

/** Protocol-wide dashboard: TVL, staker count, APY, pause state. */
export function ProtocolStats() {
  const { stats, statsLoading, error, refreshStats } = useVaultData();
  const { client } = useWallet();
  const { run, pending, txHash, error: apyError } = useTxAction();

  async function handleUpdateApy() {
    if (!client) return;
    await run(() => updateApyFromMarket(client), () => void refreshStats());
  }

  return (
    <Card
      title="Protocol Overview"
      subtitle="Live state of the SmartStakingOptimizer vault"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            loading={pending}
            disabled={!client || pending}
            onClick={() => void handleUpdateApy()}
          >
            {pending ? "Updating..." : "Update APY"}
          </Button>
          <Button variant="secondary" loading={statsLoading} onClick={() => void refreshStats()}>
            Refresh
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-3">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {apyError && (
        <div className="mb-3">
          <Banner tone="error">{apyError}</Banner>
        </div>
      )}
      {txHash && (
        <div className="mb-3">
          <Banner tone="success">APY updated. Tx: {shortenAddress(txHash)}</Banner>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {!stats && statsLoading ? (
          <>
            <Skeleton className="h-[68px]" />
            <Skeleton className="h-[68px]" />
            <Skeleton className="h-[68px]" />
            <Skeleton className="h-[68px]" />
          </>
        ) : (
          <>
            <Stat
              label="Total Staked"
              value={stats ? `${attoToToken(stats.totalStaked)} ${TOKEN_SYMBOL}` : "—"}
            />
            <Stat label="Stakers" value={stats ? stats.stakerCount.toString() : "—"} />
            <Stat label="Current APY" value={stats ? bpsToPercent(stats.apyBps) : "—"} />
            <Stat
              label="Status"
              value={stats ? (stats.paused ? "Paused" : "Active") : "—"}
            />
          </>
        )}
      </div>
    </Card>
  );
}
