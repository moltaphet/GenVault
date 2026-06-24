import type { LivePolicy } from "@/context/SkyShieldDataContext";

/** Visual descriptor for a boarding-pass live status. */
export interface StatusView {
  label: string;
  color: string;
  blink: boolean;
  checking: boolean;
}

/**
 * Map a live policy to its terminal-board presentation, e.g.
 * "RESOLVED - 50% PAYOUT" / "CHECKING API" / "EXPIRED - ON TIME".
 */
export function statusView(policy: LivePolicy): StatusView {
  switch (policy.liveStatus) {
    case "CHECKING_API":
      return { label: "CHECKING API", color: "var(--sky-amber)", blink: true, checking: true };
    case "RESOLVED": {
      const pct =
        policy.maxPayout > 0n
          ? Number((policy.payoutAmount * 10000n) / policy.maxPayout) / 100
          : 0;
      const pctText = Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2);
      return {
        label: `RESOLVED - ${pctText}% PAYOUT`,
        color: "var(--sky-lime)",
        blink: false,
        checking: false,
      };
    }
    case "EXPIRED":
      return { label: "EXPIRED - ON TIME", color: "var(--muted)", blink: false, checking: false };
    case "ACTIVE":
    default:
      return { label: "ACTIVE - MONITORING", color: "var(--sky-cyan)", blink: false, checking: false };
  }
}
