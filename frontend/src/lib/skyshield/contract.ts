"use client";

import abi from "@/abi/skyshield-abi.json";
import { TransactionStatus, type CalldataEncodable } from "genlayer-js/types";
import { toBigInt } from "../format";
import type { GenLayerClient } from "../genlayer/client";
import { getReadClient } from "../genlayer/client";
import { SKYSHIELD_CONTRACT_ADDRESS } from "./config";
import type { LpPosition, Policy, PolicyStatus, PoolStats } from "./types";

/**
 * Typed wrappers around the SkyShield AI ABI. Reads use an account-less client;
 * writes require a wallet-connected client (see `../genlayer/client`). The ABI
 * (`src/abi/skyshield-abi.json`) is the source of truth for method signatures.
 */

export const SKYSHIELD_ABI = abi;
const address = SKYSHIELD_CONTRACT_ADDRESS;

// --------------------------------------------------------------------------- //
// Read (view) calls                                                           //
// --------------------------------------------------------------------------- //

async function read(functionName: string, args: CalldataEncodable[] = []): Promise<unknown> {
  const client = getReadClient();
  return client.readContract({ address, functionName, args });
}

export async function getPoolStats(): Promise<PoolStats> {
  const raw = (await read("get_pool_stats")) as Record<string, unknown>;
  return {
    totalAssets: toBigInt(raw.total_assets),
    totalShares: toBigInt(raw.total_shares),
    lockedCoverage: toBigInt(raw.locked_coverage),
    availableLiquidity: toBigInt(raw.available_liquidity),
    lpCount: Number(toBigInt(raw.lp_count)),
    policyCount: Number(toBigInt(raw.policy_count)),
    totalPremiumsCollected: toBigInt(raw.total_premiums_collected),
    totalPayouts: toBigInt(raw.total_payouts),
    totalYieldToLps: toBigInt(raw.total_yield_to_lps),
    paused: Boolean(raw.paused),
    owner: String(raw.owner ?? ""),
  };
}

export async function getPolicy(policyId: number): Promise<Policy | null> {
  const raw = (await read("get_policy", [policyId])) as Record<string, unknown>;
  if (!raw || !raw.exists) return null;
  return {
    policyId: Number(toBigInt(raw.policy_id)),
    passenger: String(raw.passenger ?? ""),
    flightCode: String(raw.flight_code ?? ""),
    departureTs: Number(toBigInt(raw.departure_timestamp)),
    premiumPaid: toBigInt(raw.premium_paid),
    maxPayout: toBigInt(raw.max_payout),
    payoutAmount: toBigInt(raw.payout_amount),
    status: String(raw.status ?? "ACTIVE") as PolicyStatus,
    riskBps: Number(toBigInt(raw.risk_bps)),
    delayMinutes: Number(toBigInt(raw.delay_minutes)),
    createdAt: Number(toBigInt(raw.created_at)),
    resolvedAt: Number(toBigInt(raw.resolved_at)),
  };
}

export async function getLpPosition(account: string): Promise<LpPosition> {
  const raw = (await read("lp_position", [account])) as Record<string, unknown>;
  return {
    shares: toBigInt(raw.shares),
    redeemableValue: toBigInt(raw.redeemable_value),
    availableValue: toBigInt(raw.available_value),
  };
}

export async function getClaimable(account: string): Promise<bigint> {
  return toBigInt(await read("claimable_of", [account]));
}

export async function previewPremium(riskBps: number): Promise<bigint> {
  return toBigInt(await read("preview_premium", [riskBps]));
}

export async function quotePayout(delayMinutes: number, cancelled: boolean): Promise<bigint> {
  return toBigInt(await read("quote_payout", [delayMinutes, cancelled]));
}

// --------------------------------------------------------------------------- //
// Write calls (require a wallet-connected client)                             //
// --------------------------------------------------------------------------- //

export type WaitStatus = TransactionStatus;

async function write(
  client: GenLayerClient,
  functionName: string,
  args: CalldataEncodable[],
  status: TransactionStatus = TransactionStatus.ACCEPTED,
): Promise<string> {
  const hash = await client.writeContract({ address, functionName, args, value: 0n });
  await client.waitForTransactionReceipt({ hash, status });
  return String(hash);
}

/** Deposit an atto-scale GEN amount into the underwriting pool. */
export function provideLiquidity(client: GenLayerClient, amountAtto: bigint, status?: WaitStatus) {
  return write(client, "provide_liquidity", [amountAtto], status);
}

/** Burn LP shares and credit the redeemed GEN to the caller's claim ledger. */
export function withdrawLiquidity(client: GenLayerClient, shares: bigint, status?: WaitStatus) {
  return write(client, "withdraw_liquidity", [shares], status);
}

/** Purchase parametric delay coverage; the AI prices the premium on-chain. */
export function purchasePolicy(
  client: GenLayerClient,
  flightCode: string,
  departureTs: number,
  status?: WaitStatus,
) {
  return write(client, "purchase_policy", [flightCode, departureTs], status);
}

/** Autonomous, keeper-less resolution of a single policy. */
export function checkFlightAndExecute(client: GenLayerClient, policyId: number, status?: WaitStatus) {
  return write(client, "check_flight_and_execute", [policyId], status);
}

/** Withdraw the caller's accrued balance (payouts + redeemed LP value). */
export function claim(client: GenLayerClient, status?: WaitStatus) {
  return write(client, "claim", [], status);
}
