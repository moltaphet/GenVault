"use client";

import { createAccount, createClient } from "genlayer-js";
import type { Account } from "genlayer-js/types";
import { activeChain } from "../config";

/**
 * Factory helpers for the genlayer-js client.
 *
 * - {@link getReadClient} returns a cached, account-less client used for all
 *   read-only (view) calls — no wallet required.
 * - {@link createConnectedClient} binds the client to a connected browser
 *   wallet (e.g. MetaMask) so it can sign and submit write transactions.
 * - {@link createEphemeralClient} spins up a throwaway in-memory account,
 *   handy for local development against localnet/studionet.
 *
 * NOTE: The exact browser-wallet wiring (`provider`) can vary between
 * genlayer-js releases. This is intentionally isolated here so the rest of the
 * app does not depend on those details.
 */

export type GenLayerClient = ReturnType<typeof createClient>;

let readClient: GenLayerClient | null = null;

/** Account-less client for view calls. Cached for the page lifetime. */
export function getReadClient(): GenLayerClient {
  if (!readClient) {
    readClient = createClient({ chain: activeChain });
  }
  return readClient;
}

/** Build a client bound to a connected injected wallet provider. */
export function createConnectedClient(
  address: `0x${string}`,
  provider: unknown,
): GenLayerClient {
  return createClient({
    chain: activeChain,
    // `account` identifies the signer; `provider` performs the signing.
    account: address as unknown as Account,
    // Typing for `provider` differs across genlayer-js versions.
    provider: provider as never,
  });
}

/** Build a client backed by a fresh in-memory account (dev/testing only). */
export function createEphemeralClient(): { client: GenLayerClient; account: Account } {
  const account = createAccount();
  const client = createClient({ chain: activeChain, account });
  return { client, account };
}
