"use client";

import { Ban, CheckCircle2, Clock, History } from "lucide-react";
import { useSkyShieldData } from "@/context/SkyShieldDataContext";
import { attoToToken } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/skyshield/config";

/**
 * Historical Ledger: every past flight resolution - claims paid (delayed /
 * cancelled flights) and expired policies (on-time flights) - with the granular
 * payout each settled to.
 */
export function HistoricalLedger() {
  const { policies } = useSkyShieldData();

  const settled = policies
    .filter((p) => p.liveStatus === "RESOLVED" || p.liveStatus === "EXPIRED")
    .sort((a, b) => b.resolvedAt - a.resolvedAt);

  const claims = settled.filter((p) => p.liveStatus === "RESOLVED");
  const expired = settled.filter((p) => p.liveStatus === "EXPIRED");
  const totalPaid = claims.reduce((sum, p) => sum + p.payoutAmount, 0n);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Claims Paid"
          value={`${claims.length}`}
          hint={`${attoToToken(totalPaid, 0)} ${TOKEN_SYMBOL} disbursed`}
          accent="var(--lime)"
        />
        <Tile
          icon={<Clock className="h-5 w-5" />}
          label="Expired (On Time)"
          value={`${expired.length}`}
          hint="premium retained as LP yield"
          accent="var(--cyan)"
        />
        <Tile
          icon={<History className="h-5 w-5" />}
          label="Total Resolutions"
          value={`${settled.length}`}
          hint="autonomous, oracle-less settlements"
          accent="var(--magenta)"
        />
      </div>

      <section className="glass sky-card overflow-hidden rounded-3xl">
        <header className="flex items-center gap-3 border-b border-sky-border px-6 py-4">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-border text-sky-cyan"
            style={{ boxShadow: "0 0 18px -6px var(--cyan)" }}
          >
            <History className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-sky-text">Resolution Ledger</h2>
            <p className="text-sm text-sky-muted">Past flight outcomes and settled payouts</p>
          </div>
        </header>

        <div className="sky-scanlines">
          <div className="sky-mono grid grid-cols-[1fr_1.4fr_1fr] gap-2 border-b border-sky-border/60 px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-sky-muted sm:grid-cols-[0.8fr_1fr_1.3fr_1fr]">
            <span>Flight</span>
            <span className="hidden sm:block">Resolved</span>
            <span>Outcome</span>
            <span className="text-right">Payout</span>
          </div>

          {settled.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-sky-muted">
              No resolutions yet. Active policies will appear here once their flights settle.
            </p>
          ) : (
            <ul className="divide-y divide-sky-border/50">
              {settled.map((p) => {
                const isClaim = p.liveStatus === "RESOLVED";
                const pct =
                  p.maxPayout > 0n
                    ? Number((p.payoutAmount * 10000n) / p.maxPayout) / 100
                    : 0;
                const cancelled = isClaim && p.delayMinutes === 0;
                const outcome = !isClaim
                  ? "ON TIME"
                  : cancelled
                    ? "CANCELLED"
                    : `${p.delayMinutes}m DELAY`;
                return (
                  <li
                    key={p.policyId}
                    className="sky-mono grid grid-cols-[1fr_1.4fr_1fr] items-center gap-2 px-6 py-3.5 text-sm transition-colors hover:bg-sky-panel-2 sm:grid-cols-[0.8fr_1fr_1.3fr_1fr]"
                  >
                    <p className="truncate font-bold tracking-widest text-sky-text">{p.flightCode}</p>
                    <p className="hidden text-xs text-sky-muted sm:block">
                      {new Date(p.resolvedAt * 1000).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <span style={{ color: isClaim ? "var(--lime)" : "var(--muted)" }}>
                        {isClaim ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className="truncate text-xs font-semibold"
                        style={{ color: isClaim ? "var(--lime)" : "var(--muted)" }}
                      >
                        {isClaim ? `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}% | ${outcome}` : outcome}
                      </span>
                    </div>
                    <p
                      className="text-right text-xs font-semibold"
                      style={{ color: isClaim ? "var(--lime)" : "var(--muted)" }}
                    >
                      {isClaim ? `+${attoToToken(p.payoutAmount, 0)} ${TOKEN_SYMBOL}` : "-"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
  icon: React.ReactNode;
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
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-muted">{label}</p>
      </div>
      <p className="sky-mono sky-neon mt-4 text-3xl font-bold tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-sky-muted">{hint}</p>
    </div>
  );
}
