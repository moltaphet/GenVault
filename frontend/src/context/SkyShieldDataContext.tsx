"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isSkyShieldConfigured, BASE_COVERAGE_ATTO, ATTO } from "@/lib/skyshield/config";
import {
  payoutBpsForDelay,
  quotePremiumAtto,
  simulateRiskBps,
} from "@/lib/skyshield/pricing";
import type { LiveStatus, Policy, PoolStats } from "@/lib/skyshield/types";
import { useWallet } from "./WalletContext";

/**
 * SkyShield dashboard data layer.
 *
 * Because the SkyShield contract is not yet deployed in every environment, this
 * provider runs a self-contained, deterministic *simulation* of the protocol so
 * every widget is fully alive out of the box: purchasing a policy moves real
 * (simulated) GEN into the pool, the autonomous resolver transitions boarding
 * passes through CHECKING_API -> RESOLVED/EXPIRED, payouts hit the claim ledger,
 * and LP share value reflects retained premiums.
 *
 * When NEXT_PUBLIC_SKYSHIELD_CONTRACT_ADDRESS is set, the same actions also
 * submit the corresponding on-chain transactions via the wallet client (the
 * simulation still drives the instant UI, since the contract exposes no policy
 * enumeration for a live board).
 */

export interface LivePolicy extends Policy {
  liveStatus: LiveStatus;
}

interface SkyShieldData {
  configured: boolean;
  stats: PoolStats;
  policies: LivePolicy[];
  lpShares: bigint;
  lpRedeemable: bigint;
  lpAvailable: bigint;
  claimable: bigint;
  purchasePolicy: (input: {
    flightCode: string;
    departureTs: number;
    coverageAtto: bigint;
  }) => Promise<void>;
  provideLiquidity: (amountAtto: bigint) => Promise<void>;
  withdrawLiquidity: (shares: bigint) => Promise<void>;
  claim: () => Promise<bigint>;
}

const SkyShieldDataContext = createContext<SkyShieldData | undefined>(undefined);

// --------------------------------------------------------------------------- //
// Simulation tuning                                                           //
// --------------------------------------------------------------------------- //
const TICK_MS = 1_500;
/** How long a boarding pass flashes "CHECKING API" before it resolves. */
const CHECK_DURATION_MS = 6_000;
const DEMO_OWNER = "0x5K91e1d000000000000000000000000000000000";

/** Hidden, pre-rolled outcome the resolver will reveal for a policy. */
interface Outcome {
  delayMinutes: number;
  cancelled: boolean;
  checkingSince: number | null;
}

/** Small deterministic RNG so a given policy id always rolls the same outcome. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll a delay outcome weighted by the policy's risk score. */
function rollOutcome(policyId: number, riskBps: number): { delayMinutes: number; cancelled: boolean } {
  const rng = mulberry32(policyId * 2654435761);
  const delayed = rng() < riskBps / 10_000;
  if (!delayed) return { delayMinutes: 0, cancelled: false };
  const tier = rng();
  if (tier < 0.15) return { delayMinutes: 0, cancelled: true }; // cancellation
  if (tier < 0.45) return { delayMinutes: 75, cancelled: false }; // 20%
  if (tier < 0.8) return { delayMinutes: 150, cancelled: false }; // 50%
  return { delayMinutes: 300, cancelled: false }; // 100%
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

// --------------------------------------------------------------------------- //
// Seed data                                                                   //
// --------------------------------------------------------------------------- //
function seedStats(): PoolStats {
  return {
    totalAssets: 184_500n * ATTO,
    totalShares: 180_000n * ATTO,
    lockedCoverage: 7_000n * ATTO,
    availableLiquidity: 177_500n * ATTO,
    lpCount: 42,
    policyCount: 318,
    totalPremiumsCollected: 21_640n * ATTO,
    totalPayouts: 12_900n * ATTO,
    totalYieldToLps: 8_740n * ATTO,
    paused: false,
    owner: DEMO_OWNER,
  };
}

function makePolicy(
  policyId: number,
  flightCode: string,
  passenger: string,
  departureOffsetSec: number,
  coverageAtto: bigint,
): LivePolicy {
  const departureTs = nowSec() + departureOffsetSec;
  const riskBps = simulateRiskBps(flightCode, departureTs);
  const premium = quotePremiumAtto(coverageAtto, BigInt(riskBps));
  return {
    policyId,
    passenger,
    flightCode,
    departureTs,
    premiumPaid: premium,
    maxPayout: coverageAtto,
    payoutAmount: 0n,
    status: "ACTIVE",
    riskBps,
    delayMinutes: 0,
    createdAt: nowSec(),
    resolvedAt: 0,
    liveStatus: "ACTIVE",
  };
}

export function SkyShieldDataProvider({ children }: { children: ReactNode }) {
  const { address, client } = useWallet();
  const passenger = address ?? DEMO_OWNER;

  const [stats, setStats] = useState<PoolStats>(seedStats);
  const [policies, setPolicies] = useState<LivePolicy[]>([]);
  const [lpShares, setLpShares] = useState<bigint>(2_500n * ATTO);
  const [claimable, setClaimable] = useState<bigint>(0n);

  const nextId = useRef(2);
  const outcomes = useRef<Map<number, Outcome>>(new Map());

  // Seed a few boarding passes across lifecycle stages for an immediately rich
  // board: one departing very soon, one mid-flight, one further out.
  useEffect(() => {
    const seeded: LivePolicy[] = [
      makePolicy(1001, "BA245", passenger, -30, BASE_COVERAGE_ATTO),
      makePolicy(1002, "AA118", passenger, 90, 2_500n * ATTO),
      makePolicy(1003, "EK202", passenger, 240, 5_000n * ATTO),
    ];
    nextId.current = 1004;
    for (const p of seeded) {
      outcomes.current.set(p.policyId, {
        ...rollOutcome(p.policyId, p.riskBps),
        checkingSince: null,
      });
    }
    setPolicies(seeded);
    // Re-seed when the connected address changes so passes are attributed right.
  }, [passenger]);

  // ----------------------------------------------------------------------- //
  // Autonomous resolver simulation: advances the boarding-pass lifecycle.   //
  // ----------------------------------------------------------------------- //
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const nowS = nowSec();

      setPolicies((prev) => {
        let mutated = false;
        const poolDelta = {
          assets: 0n,
          locked: 0n,
          payouts: 0n,
          yield: 0n,
        };
        let claimDelta = 0n;

        const next = prev.map((p) => {
          if (p.liveStatus === "RESOLVED" || p.liveStatus === "EXPIRED") return p;

          const outcome = outcomes.current.get(p.policyId);
          if (!outcome) return p;

          // Departed flights enter the live "CHECKING API" phase.
          if (p.liveStatus === "ACTIVE") {
            if (nowS >= p.departureTs) {
              outcome.checkingSince = now;
              mutated = true;
              return { ...p, liveStatus: "CHECKING_API" as LiveStatus };
            }
            return p;
          }

          // After the check window, settle using the pre-rolled outcome.
          if (
            p.liveStatus === "CHECKING_API" &&
            outcome.checkingSince !== null &&
            now - outcome.checkingSince >= CHECK_DURATION_MS
          ) {
            const bps = payoutBpsForDelay(outcome.delayMinutes, outcome.cancelled);
            const payout = (p.maxPayout * BigInt(bps)) / 10_000n;
            poolDelta.locked += p.maxPayout;
            mutated = true;
            if (payout > 0n) {
              poolDelta.assets += payout;
              poolDelta.payouts += payout;
              if (p.passenger === passenger) claimDelta += payout;
              return {
                ...p,
                status: "RESOLVED" as const,
                liveStatus: "RESOLVED" as LiveStatus,
                payoutAmount: payout,
                delayMinutes: outcome.delayMinutes,
                resolvedAt: nowS,
              };
            }
            poolDelta.yield += p.premiumPaid;
            return {
              ...p,
              status: "EXPIRED" as const,
              liveStatus: "EXPIRED" as LiveStatus,
              delayMinutes: 0,
              resolvedAt: nowS,
            };
          }

          return p;
        });

        if (mutated) {
          setStats((s) => {
            const totalAssets = s.totalAssets - poolDelta.assets;
            const lockedCoverage = s.lockedCoverage - poolDelta.locked;
            return {
              ...s,
              totalAssets,
              lockedCoverage,
              availableLiquidity: totalAssets - lockedCoverage,
              totalPayouts: s.totalPayouts + poolDelta.payouts,
              totalYieldToLps: s.totalYieldToLps + poolDelta.yield,
            };
          });
          if (claimDelta > 0n) setClaimable((c) => c + claimDelta);
        }

        return mutated ? next : prev;
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [passenger]);

  // ----------------------------------------------------------------------- //
  // Actions                                                                 //
  // ----------------------------------------------------------------------- //
  const purchasePolicy = useCallback(
    async ({
      flightCode,
      departureTs,
      coverageAtto,
    }: {
      flightCode: string;
      departureTs: number;
      coverageAtto: bigint;
    }) => {
      const riskBps = simulateRiskBps(flightCode, departureTs);
      const premium = quotePremiumAtto(coverageAtto, BigInt(riskBps));

      // Solvency check mirrors the contract: free liquidity must cover the payout.
      const availableAfterPremium = stats.totalAssets + premium - stats.lockedCoverage;
      if (availableAfterPremium < coverageAtto) {
        throw new Error("Insufficient pool liquidity to underwrite this policy.");
      }

      // Optional on-chain submission when a real deployment is configured.
      if (isSkyShieldConfigured && client) {
        const { purchasePolicy: purchaseOnChain } = await import("@/lib/skyshield/contract");
        await purchaseOnChain(client, flightCode, departureTs);
      }

      const policyId = nextId.current;
      nextId.current += 1;
      const policy: LivePolicy = {
        policyId,
        passenger,
        flightCode: flightCode.trim().toUpperCase(),
        departureTs,
        premiumPaid: premium,
        maxPayout: coverageAtto,
        payoutAmount: 0n,
        status: "ACTIVE",
        riskBps,
        delayMinutes: 0,
        createdAt: nowSec(),
        resolvedAt: 0,
        liveStatus: "ACTIVE",
      };
      outcomes.current.set(policyId, { ...rollOutcome(policyId, riskBps), checkingSince: null });

      setPolicies((prev) => [policy, ...prev]);
      setStats((s) => {
        const totalAssets = s.totalAssets + premium;
        const lockedCoverage = s.lockedCoverage + coverageAtto;
        return {
          ...s,
          totalAssets,
          lockedCoverage,
          availableLiquidity: totalAssets - lockedCoverage,
          policyCount: s.policyCount + 1,
          totalPremiumsCollected: s.totalPremiumsCollected + premium,
        };
      });
    },
    [client, passenger, stats.lockedCoverage, stats.totalAssets],
  );

  const provideLiquidity = useCallback(
    async (amountAtto: bigint) => {
      if (amountAtto <= 0n) throw new Error("Deposit amount must be positive.");
      if (isSkyShieldConfigured && client) {
        const { provideLiquidity: depositOnChain } = await import("@/lib/skyshield/contract");
        await depositOnChain(client, amountAtto);
      }
      setStats((s) => {
        const minted =
          s.totalShares === 0n || s.totalAssets === 0n
            ? amountAtto
            : (amountAtto * s.totalShares) / s.totalAssets;
        const totalAssets = s.totalAssets + amountAtto;
        const totalShares = s.totalShares + minted;
        setLpShares((shares) => shares + minted);
        return {
          ...s,
          totalAssets,
          totalShares,
          availableLiquidity: totalAssets - s.lockedCoverage,
        };
      });
    },
    [client],
  );

  const withdrawLiquidity = useCallback(
    async (shares: bigint) => {
      if (shares <= 0n) throw new Error("Share amount must be positive.");
      if (shares > lpShares) throw new Error("Insufficient LP shares.");
      const gross = (shares * stats.totalAssets) / stats.totalShares;
      if (gross > stats.availableLiquidity) {
        throw new Error("Redemption exceeds available (un-reserved) liquidity.");
      }
      if (isSkyShieldConfigured && client) {
        const { withdrawLiquidity: withdrawOnChain } = await import("@/lib/skyshield/contract");
        await withdrawOnChain(client, shares);
      }
      setStats((s) => {
        const totalAssets = s.totalAssets - gross;
        const totalShares = s.totalShares - shares;
        return {
          ...s,
          totalAssets,
          totalShares,
          availableLiquidity: totalAssets - s.lockedCoverage,
        };
      });
      setLpShares((s) => s - shares);
      setClaimable((c) => c + gross);
    },
    [client, lpShares, stats.availableLiquidity, stats.totalAssets, stats.totalShares],
  );

  const claim = useCallback(async () => {
    if (claimable <= 0n) throw new Error("Nothing to claim.");
    if (isSkyShieldConfigured && client) {
      const { claim: claimOnChain } = await import("@/lib/skyshield/contract");
      await claimOnChain(client);
    }
    const amount = claimable;
    setClaimable(0n);
    return amount;
  }, [claimable, client]);

  // Derived LP figures.
  const lpRedeemable =
    stats.totalShares === 0n ? 0n : (lpShares * stats.totalAssets) / stats.totalShares;
  const lpAvailable =
    lpRedeemable > stats.availableLiquidity ? stats.availableLiquidity : lpRedeemable;

  const value = useMemo<SkyShieldData>(
    () => ({
      configured: isSkyShieldConfigured,
      stats,
      policies,
      lpShares,
      lpRedeemable,
      lpAvailable,
      claimable,
      purchasePolicy,
      provideLiquidity,
      withdrawLiquidity,
      claim,
    }),
    [
      stats,
      policies,
      lpShares,
      lpRedeemable,
      lpAvailable,
      claimable,
      purchasePolicy,
      provideLiquidity,
      withdrawLiquidity,
      claim,
    ],
  );

  return (
    <SkyShieldDataContext.Provider value={value}>{children}</SkyShieldDataContext.Provider>
  );
}

export function useSkyShieldData(): SkyShieldData {
  const ctx = useContext(SkyShieldDataContext);
  if (!ctx) {
    throw new Error("useSkyShieldData must be used within a <SkyShieldDataProvider>.");
  }
  return ctx;
}
