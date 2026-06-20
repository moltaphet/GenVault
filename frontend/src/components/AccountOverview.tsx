"use client";

import { TOKEN_SYMBOL } from "@/lib/config";
import { useVaultData } from "@/context/VaultDataContext";
import { useWallet } from "@/context/WalletContext";
import { attoToToken, formatTimestamp } from "@/lib/format";
import { Banner, Button, Card, Skeleton, Stat } from "./ui";

/**
 * Shows the connected account's live position. The shared data context polls
 * every 15s so accruing pending yield updates without a manual refresh.
 */
export function AccountOverview() {
  const { address } = useWallet();
  const { position, positionLoading, refreshPosition } = useVaultData();

  if (!address) {
    return (
      <Card title="Your Position">
        <Banner>Connect your wallet to view your staking position.</Banner>
      </Card>
    );
  }

  return (
    <Card
      title="Your Position"
      subtitle="Principal, accruing yield, and lifetime activity"
      action={
        <Button
          variant="secondary"
          loading={positionLoading}
          onClick={() => void refreshPosition()}
        >
          Refresh
        </Button>
      }
    >
      {!position.exists && positionLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Principal"
            value={`${attoToToken(position.principal)} ${TOKEN_SYMBOL}`}
          />
          <Stat
            label="Pending Yield"
            value={`${attoToToken(position.pendingYield)} ${TOKEN_SYMBOL}`}
            hint="Compoundable now"
          />
          <Stat
            label="Total Balance"
            value={`${attoToToken(position.totalBalance)} ${TOKEN_SYMBOL}`}
            hint="Withdrawable now"
          />
          <Stat
            label="Total Compounded"
            value={`${attoToToken(position.totalCompounded)} ${TOKEN_SYMBOL}`}
          />
          <Stat
            label="Total Deposited"
            value={`${attoToToken(position.totalDeposited)} ${TOKEN_SYMBOL}`}
          />
          <Stat label="Last Accrual" value={formatTimestamp(position.lastAccrualTs)} />
        </div>
      )}
    </Card>
  );
}
