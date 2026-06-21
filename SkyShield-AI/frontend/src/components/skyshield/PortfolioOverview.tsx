"use client";

import { Coins, Landmark, ReceiptText, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useSkyShieldData } from "@/context/SkyShieldDataContext";
import { useWallet } from "@/context/WalletContext";
import { attoToToken, shortenAddress } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/skyshield/config";
import { statusView } from "./status";

/**
 * User Portfolio: per-account tracking of aggregate premium spent, total
 * insurance claims recovered, net underwriting result, and the user's active LP
 * position (shares, redeemable value, and accrued yield).
 */
export function PortfolioOverview() {
  const { account, policies, lpShares, lpRedeemable, lpAvailable, claimable, stats } =
    useSkyShieldData();
  const { address } = useWallet();

  const mine = policies.filter((p) => p.passenger === account);
  const active = mine.filter((p) => p.liveStatus === "ACTIVE" || p.liveStatus === "CHECKING_API");
  const claims = mine.filter((p) => p.liveStatus === "RESOLVED");

  const premiumSpent = mine.reduce((sum, p) => sum + p.premiumPaid, 0n);
  const claimsRecovered = claims.reduce((sum, p) => sum + p.payoutAmount, 0n);
  const net = claimsRecovered - premiumSpent;
  const yieldEarned = lpRedeemable > lpShares ? lpRedeemable - lpShares : 0n;
  const poolShare =
    stats.totalShares === 0n ? 0 : Number((lpShares * 10000n) / stats.totalShares) / 100;

  return (
    <div className="space-y-6">
      {/* Identity. */}
      <div className="glass sky-card flex flex-col gap-2 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-border text-sky-cyan"
            style={{ boxShadow: "0 0 20px -6px var(--cyan)" }}
          >
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-muted">Account</p>
            <p className="sky-mono text-lg font-semibold text-sky-text">{shortenAddress(account)}</p>
          </div>
        </div>
        <span className="sky-mono text-xs text-sky-muted">
          {address ? "Wallet connected" : "Preview identity (connect a wallet to bind)"}
        </span>
      </div>

      {/* Insurance side. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={<ReceiptText className="h-5 w-5" />}
          label="Premium Spent"
          value={`${attoToToken(premiumSpent, 2)}`}
          hint={`${mine.length} policies`}
          accent="var(--magenta)"
        />
        <Tile
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Claims Recovered"
          value={`${attoToToken(claimsRecovered, 2)}`}
          hint={`${claims.length} paid out`}
          accent="var(--lime)"
        />
        <Tile
          icon={<TrendingUp className="h-5 w-5" />}
          label="Net Result"
          value={`${net >= 0n ? "+" : ""}${attoToToken(net, 2)}`}
          hint="claims minus premium"
          accent={net >= 0n ? "var(--lime)" : "var(--amber)"}
        />
        <Tile
          icon={<Coins className="h-5 w-5" />}
          label="Active Coverage"
          value={`${active.length}`}
          hint="policies in flight"
          accent="var(--cyan)"
        />
      </div>

      {/* LP side. */}
      <section className="glass sky-card rounded-3xl p-6">
        <header className="mb-5 flex items-center gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-border"
            style={{ color: "var(--magenta)", boxShadow: "0 0 18px -6px var(--magenta)" }}
          >
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-sky-text">Liquidity Position</h2>
            <p className="text-sm text-sky-muted">Underwriting shares and accrued yield</p>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="LP Shares" value={attoToToken(lpShares, 2)} accent="var(--cyan)" />
          <Metric label="Redeemable Value" value={`${attoToToken(lpRedeemable, 2)} ${TOKEN_SYMBOL}`} accent="var(--cyan)" />
          <Metric label="Yield Earned" value={`+${attoToToken(yieldEarned, 2)}`} accent="var(--lime)" />
          <Metric label="Pool Share" value={`${poolShare.toFixed(2)}%`} hint={`${attoToToken(lpAvailable, 0)} withdrawable`} accent="var(--magenta)" />
        </div>
        {claimable > 0n && (
          <p className="sky-mono mt-4 rounded-xl border border-sky-border bg-sky-cyan-soft px-4 py-2.5 text-sm" style={{ color: "var(--lime)" }}>
            Claimable balance: {attoToToken(claimable, 2)} {TOKEN_SYMBOL} (claim from the dashboard vault)
          </p>
        )}
      </section>

      {/* Active policies list. */}
      <section className="glass sky-card overflow-hidden rounded-3xl">
        <header className="border-b border-sky-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-sky-text">Your Active Policies</h2>
        </header>
        {active.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-sky-muted">
            No active policies. Insure a flight from the dashboard.
          </p>
        ) : (
          <ul className="divide-y divide-sky-border/50">
            {active.map((p) => {
              const view = statusView(p);
              return (
                <li
                  key={p.policyId}
                  className="sky-mono flex items-center justify-between gap-3 px-6 py-3.5 text-sm"
                >
                  <span className="font-bold tracking-widest text-sky-text">{p.flightCode}</span>
                  <span className="flex items-center gap-2">
                    <span className={`sky-dot ${view.blink ? "sky-blink" : ""}`} style={{ color: view.color }} aria-hidden />
                    <span className="text-xs font-semibold" style={{ color: view.color }}>{view.label}</span>
                  </span>
                  <span className="text-xs text-sky-muted">
                    {attoToToken(p.maxPayout, 0)} {TOKEN_SYMBOL} cover
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="glass sky-card rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-border"
          style={{ color: accent, boxShadow: `0 0 18px -6px ${accent}` }}
        >
          {icon}
        </span>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-muted">{label}</p>
      </div>
      <p className="sky-mono sky-neon mt-3 text-2xl font-bold tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-sky-muted">{hint}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-sky-border bg-sky-panel-2 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-sky-muted">{label}</p>
      <p className="sky-mono mt-1 text-lg font-semibold" style={{ color: accent }}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-sky-muted">{hint}</p>}
    </div>
  );
}
