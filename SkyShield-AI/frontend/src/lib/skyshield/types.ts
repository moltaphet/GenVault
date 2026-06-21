/**
 * TypeScript shapes mirroring the SkyShield AI ABI (`src/abi/skyshield-abi.json`).
 * All money fields are atto-scale (`value * 10 ** 18`).
 */

/** On-chain policy lifecycle states. */
export type PolicyStatus = "ACTIVE" | "RESOLVED" | "EXPIRED";

/**
 * Extended live status used by the real-time boarding-pass monitor. It adds the
 * transient "CHECKING_API" phase the UI shows while the autonomous resolver is
 * fetching live flight data, which has no on-chain equivalent.
 */
export type LiveStatus = "ACTIVE" | "CHECKING_API" | "RESOLVED" | "EXPIRED";

export interface Policy {
  policyId: number;
  passenger: string;
  flightCode: string;
  /** Scheduled departure, unix seconds. */
  departureTs: number;
  premiumPaid: bigint;
  maxPayout: bigint;
  payoutAmount: bigint;
  status: PolicyStatus;
  /** AI-assessed delay-risk score the premium was priced from (basis points). */
  riskBps: number;
  /** Observed delay at resolution (minutes). */
  delayMinutes: number;
  createdAt: number;
  resolvedAt: number;
}

export interface PoolStats {
  totalAssets: bigint;
  totalShares: bigint;
  lockedCoverage: bigint;
  availableLiquidity: bigint;
  lpCount: number;
  policyCount: number;
  totalPremiumsCollected: bigint;
  totalPayouts: bigint;
  totalYieldToLps: bigint;
  paused: boolean;
  owner: string;
}

export interface LpPosition {
  shares: bigint;
  redeemableValue: bigint;
  availableValue: bigint;
}

export const EMPTY_LP_POSITION: LpPosition = {
  shares: 0n,
  redeemableValue: 0n,
  availableValue: 0n,
};
