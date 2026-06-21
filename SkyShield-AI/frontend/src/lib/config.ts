import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";

/**
 * Central runtime configuration, sourced from public env vars.
 * See `.env.local.example` for the available settings.
 *
 * NEXT_PUBLIC_* values are inlined at build time. We normalize them defensively
 * (trim + strip any surrounding quotes) so a value written with quotes is read
 * identically to the unquoted form.
 */

function readEnv(value: string | undefined, fallback = ""): string {
  if (!value) return fallback;
  return value.trim().replace(/^["']|["']$/g, "");
}

const CHAINS = {
  studionet,
  localnet,
  testnetAsimov,
  testnetBradbury,
} as const;

export type ChainName = keyof typeof CHAINS;

const requestedChain = readEnv(
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN,
  "studionet",
) as ChainName;

export const activeChain = CHAINS[requestedChain] ?? studionet;
export const activeChainName: ChainName = CHAINS[requestedChain] ? requestedChain : "studionet";

/** Atto scale: every money value in the contract is `value * 10 ** 18`. */
export const TOKEN_DECIMALS = 18;

/** Display symbol for the underwriting asset (UI only). */
export const TOKEN_SYMBOL = "GEN";

export { readEnv };
