"use client";

import abi from "@/abi/abi.json";
import { TransactionStatus, type CalldataEncodable } from "genlayer-js/types";
import { CONTRACT_ADDRESS } from "../config";
import { toBigInt } from "../format";
import type { GenLayerClient } from "./client";
import { getReadClient } from "./client";
import type { AccountPosition, ProtocolStats } from "./types";

/**
 * Typed wrappers around the SmartStakingOptimizer ABI.
 *
 * Reads go through an account-less client; writes require a wallet-connected
 * client (see `client.ts`). The generated ABI (`src/abi/abi.json`) is the
 * source of truth for method names/signatures and is re-exported here.
 */

export const CONTRACT_ABI = abi;

/** Names of every method exposed by the deployed contract (from the ABI). */
export const CONTRACT_METHODS = Object.keys(
  (abi as { methods?: Record<string, unknown> }).methods ?? {},
);

const address = CONTRACT_ADDRESS;

// --------------------------------------------------------------------------- //
// Read (view) calls                                                           //
// --------------------------------------------------------------------------- //

async function read(
  functionName: string,
  args: CalldataEncodable[] = [],
): Promise<unknown> {
  const client = getReadClient();
  return client.readContract({ address, functionName, args });
}

export async function getProtocolStats(): Promise<ProtocolStats> {
  const raw = (await read("get_stats")) as Record<string, unknown>;
  return {
    totalStaked: toBigInt(raw.total_staked),
    stakerCount: toBigInt(raw.staker_count),
    apyBps: toBigInt(raw.apy_bps),
    paused: Boolean(raw.paused),
    owner: String(raw.owner ?? ""),
  };
}

export async function getAccountPosition(staker: string): Promise<AccountPosition> {
  const raw = (await read("get_account", [staker])) as Record<string, unknown>;
  return {
    exists: Boolean(raw.exists),
    principal: toBigInt(raw.principal),
    pendingYield: toBigInt(raw.pending_yield),
    totalBalance: toBigInt(raw.total_balance),
    lastAccrualTs: toBigInt(raw.last_accrual_ts),
    totalCompounded: toBigInt(raw.total_compounded),
    totalDeposited: toBigInt(raw.total_deposited),
    totalWithdrawn: toBigInt(raw.total_withdrawn),
  };
}

export async function previewPending(staker: string): Promise<bigint> {
  return toBigInt(await read("preview_pending", [staker]));
}

export async function getApyBps(): Promise<bigint> {
  return toBigInt(await read("get_apy"));
}

export async function isPaused(): Promise<boolean> {
  return Boolean(await read("is_paused"));
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

/** Stake an atto-scale amount for the connected account. */
export function stake(client: GenLayerClient, amountAtto: bigint, status?: WaitStatus) {
  return write(client, "stake", [amountAtto], status);
}

/** Compound the connected account's pending yield into principal. */
export function compoundRewards(client: GenLayerClient, status?: WaitStatus) {
  return write(client, "compound_rewards", [], status);
}

/** Permissionless/keeper compounding for any staker. */
export function compoundFor(client: GenLayerClient, staker: string, status?: WaitStatus) {
  return write(client, "compound_for", [staker], status);
}

/** Withdraw an atto-scale amount of principal + compounded rewards. */
export function withdraw(client: GenLayerClient, amountAtto: bigint, status?: WaitStatus) {
  return write(client, "withdraw", [amountAtto], status);
}

/** Withdraw the connected account's entire balance. */
export function withdrawMax(client: GenLayerClient, status?: WaitStatus) {
  return write(client, "withdraw_max", [], status);
}

/** Refresh the protocol APY from the live market feed via consensus (owner-only). */
export function updateApyFromMarket(client: GenLayerClient, status?: WaitStatus) {
  return write(client, "update_apy_from_market", [], status);
}
