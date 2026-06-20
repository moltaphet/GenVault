"use client";

import { TOKEN_SYMBOL } from "@/lib/config";
import { useVaultData } from "@/context/VaultDataContext";
import { attoToToken, bpsToPercent } from "@/lib/format";
import { Banner, Button, Card, Skeleton, Stat } from "./ui";

/** Protocol-wide dashboard: TVL, staker count, APY, pause state. */
export function ProtocolStats() {
  const { stats, statsLoading, error, refreshStats } = useVaultData();

  return (
    <Card
      title="Protocol Overview"
      subtitle="Live state of the SmartStakingOptimizer vault"
      action={
        <Button variant="secondary" loading={statsLoading} onClick={() => void refreshStats()}>
          Refresh
        </Button>
      }
    >
      {error && (
        <div className="mb-3">
          <Banner tone="error">{error}</Banner>
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
