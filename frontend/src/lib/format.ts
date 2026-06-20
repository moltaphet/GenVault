import { TOKEN_DECIMALS } from "./config";

/**
 * Formatting helpers that translate between the contract's on-chain units
 * (atto-scale `u256` and basis points) and human-readable display strings.
 */

const SCALE = 10n ** BigInt(TOKEN_DECIMALS);

/** Coerce an unknown contract return value into a bigint. */
export function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") return BigInt(value === "" ? "0" : value);
  return 0n;
}

/** Format an atto-scale amount as a decimal token string (e.g. "110.0000"). */
export function attoToToken(value: bigint, fractionDigits = 4): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / SCALE;
  const frac = abs % SCALE;

  const fracStr = frac
    .toString()
    .padStart(TOKEN_DECIMALS, "0")
    .slice(0, fractionDigits);

  const wholeStr = whole.toLocaleString("en-US");
  const sign = negative ? "-" : "";
  return fractionDigits > 0 ? `${sign}${wholeStr}.${fracStr}` : `${sign}${wholeStr}`;
}

/** Parse a user-entered token amount (e.g. "12.5") into atto-scale bigint. */
export function tokenToAtto(input: string): bigint {
  const trimmed = input.trim();
  if (!trimmed) return 0n;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  const [wholePart = "0", fracPart = ""] = unsigned.split(".");
  const fracPadded = (fracPart + "0".repeat(TOKEN_DECIMALS)).slice(
    0,
    TOKEN_DECIMALS,
  );

  const whole = BigInt(wholePart || "0");
  const frac = BigInt(fracPadded || "0");
  const result = whole * SCALE + frac;
  return negative ? -result : result;
}

/** Render basis points as a percentage string (1000 bps -> "10%"). */
export function bpsToPercent(bps: bigint | number): string {
  const value = typeof bps === "bigint" ? Number(bps) : bps;
  const percent = value / 100;
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2)}%`;
}

/** Shorten an address for compact display: 0x1234...abcd. */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Convert a unix-seconds bigint into a human-readable UTC string. */
export function formatTimestamp(seconds: bigint): string {
  if (seconds <= 0n) return "—";
  return new Date(Number(seconds) * 1000).toUTCString();
}
