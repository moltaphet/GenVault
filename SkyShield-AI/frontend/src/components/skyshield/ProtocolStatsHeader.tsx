"use client";

import { Activity, ShieldCheck, Coins } from "lucide-react";
import type { ReactNode } from "react";
import { useSkyShieldData } from "@/context/SkyShieldDataContext";
import { attoToToken } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/skyshield/config";

/**
 * Global protocol stats: Total Value Locked in the underwriting pool, the count
 * of active policies currently being monitored, and the lifetime automated
 * payouts the autonomous resolver has settled.
 */
export function ProtocolStatsHeader() {
  const { stats, policies } = useSkyShieldData();

  const activeCount = policies.filter(
    (p) => p.liveStatus === "ACTIVE" || p.liveStatus === "CHECKING_API",
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile
        icon={<Coins className="h-5 w-5" />}
        label="Total Value Locked"
        value={`${attoToToken(stats.totalAssets, 0)} ${TOKEN_SYMBOL}`}
        hint={`${attoToToken(stats.availableLiquidity, 0)} available`}
        accent="var(--cyan)"
      />
      <StatTile
        icon={<ShieldCheck className="h-5 w-5" />}
        label="Active Policies"
        value={activeCount.toLocaleString("en-US")}
        hint={`${stats.policyCount.toLocaleString("en-US")} underwritten all-time`}
        accent="var(--magenta)"
      />
      <StatTile
        icon={<Activity className="h-5 w-5" />}
        label="Automated Payouts"
        value={`${attoToToken(stats.totalPayouts, 0)} ${TOKEN_SYMBOL}`}
        hint={`${attoToToken(stats.totalYieldToLps, 0)} routed to LPs`}
        accent="var(--lime)"
      />
    </div>
  );
}

function StatTile({
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
    <div className="glass sky-card group relative overflow-hidden rounded-3xl p-5">
      <span
        aria-hidden
        className="sky-scan-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent"
      />
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-border"
          style={{ color: accent, boxShadow: `0 0 18px -6px ${accent}` }}
        >
          {icon}
        </span>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-muted">{label}</p>
      </div>
      <p className="sky-mono sky-neon mt-4 text-3xl font-bold tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-sky-muted">{hint}</p>
    </div>
  );
}
