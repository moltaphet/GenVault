/**
 * Client-side reproduction of the SkyShield AI pricing engine.
 *
 * These pure functions mirror the deterministic math in
 * `contracts/sky_shield_ai.py` (`quote_premium_atto`, `payout_bps_for_delay`)
 * so the dashboard can show an instant premium preview that matches what the
 * contract will charge. The *risk score* itself is produced on-chain by the AI
 * underwriting model; here we synthesize a stable, deterministic estimate from
 * the flight details purely for the live preview.
 */

import {
  ATTO,
  BASE_COVERAGE_ATTO,
  BPS_DENOMINATOR,
  LOADING_BPS,
  MIN_PREMIUM_ATTO,
} from "./config";

export const MAX_RISK_BPS = 10_000n;

/** Coverage package presented in the purchase form. */
export interface CoveragePackage {
  id: string;
  label: string;
  tagline: string;
  coverageAtto: bigint;
}

export const COVERAGE_PACKAGES: CoveragePackage[] = [
  {
    id: "standard",
    label: "Standard",
    tagline: "Base on-chain coverage",
    coverageAtto: BASE_COVERAGE_ATTO,
  },
  {
    id: "plus",
    label: "Plus",
    tagline: "Mid-haul protection",
    coverageAtto: 2_500n * ATTO,
  },
  {
    id: "elite",
    label: "Elite",
    tagline: "Long-haul / premium cabin",
    coverageAtto: 5_000n * ATTO,
  },
];

/** Granular payout tier in basis points of max payout (mirrors the contract). */
export function payoutBpsForDelay(delayMinutes: number, cancelled: boolean): number {
  if (cancelled) return 10_000;
  if (delayMinutes >= 240) return 10_000;
  if (delayMinutes >= 120) return 5_000;
  if (delayMinutes >= 60) return 2_000;
  return 0;
}

/** Fair-odds premium plus the protocol loading margin, floored and clamped. */
export function quotePremiumAtto(
  coverageAtto: bigint,
  riskBps: bigint,
  loadingBps: bigint = LOADING_BPS,
): bigint {
  const risk = riskBps < 0n ? 0n : riskBps > MAX_RISK_BPS ? MAX_RISK_BPS : riskBps;
  const expectedLoss = (coverageAtto * risk) / BPS_DENOMINATOR;
  const premium = (expectedLoss * (BPS_DENOMINATOR + loadingBps)) / BPS_DENOMINATOR;
  return premium > MIN_PREMIUM_ATTO ? premium : MIN_PREMIUM_ATTO;
}

/** Coarse risk band label used for the gauge in the UI. */
export function riskBand(riskBps: number): { id: number; label: string } {
  if (riskBps < 1_500) return { id: 0, label: "LOW" };
  if (riskBps < 4_000) return { id: 1, label: "MODERATE" };
  if (riskBps < 7_000) return { id: 2, label: "HIGH" };
  return { id: 3, label: "EXTREME" };
}

/**
 * Deterministic pseudo-risk estimate from the flight details. This stands in
 * for the on-chain AI assessment so the premium preview is stable for a given
 * flight (the same input always yields the same score) and visibly reacts as
 * the passenger edits the form.
 */
export function simulateRiskBps(flightCode: string, departureTs: number): number {
  const seed = `${flightCode.trim().toUpperCase()}|${departureTs}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Map the 32-bit hash into a plausible 6%..62% delay-risk band.
  const normalized = (hash >>> 0) / 0xffffffff;
  return Math.round(600 + normalized * 5_600);
}
