/**
 * TypeScript shapes that mirror the SmartStakingOptimizer ABI
 * (see `src/abi/abi.json` and `docs/ARCHITECTURE.md`).
 * All money fields are atto-scale (`value * 10 ** 18`).
 */

export interface AccountPosition {
  exists: boolean;
  /** Settled principal (excludes unsettled pending yield). */
  principal: bigint;
  /** Yield that would be compounded right now. */
  pendingYield: bigint;
  /** principal + pendingYield, i.e. the amount withdrawable now. */
  totalBalance: bigint;
  /** Unix seconds of the last settle/compound. */
  lastAccrualTs: bigint;
  totalCompounded: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
}

export interface ProtocolStats {
  totalStaked: bigint;
  stakerCount: bigint;
  apyBps: bigint;
  paused: boolean;
  owner: string;
}

export const EMPTY_POSITION: AccountPosition = {
  exists: false,
  principal: 0n,
  pendingYield: 0n,
  totalBalance: 0n,
  lastAccrualTs: 0n,
  totalCompounded: 0n,
  totalDeposited: 0n,
  totalWithdrawn: 0n,
};
