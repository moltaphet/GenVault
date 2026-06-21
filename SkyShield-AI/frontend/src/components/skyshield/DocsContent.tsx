"use client";

import {
  BrainCircuit,
  Globe2,
  Layers,
  Lock,
  ScrollText,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { SKYSHIELD_CONTRACT_ADDRESS, isSkyShieldConfigured } from "@/lib/skyshield/config";

const DEPLOYED_ADDRESS = "0x6307D2f373d912508316A14612ec99992c56b718";

const PAYOUT_TIERS = [
  { range: "On time (< 1h)", payout: "0%", note: "Policy EXPIRES; premium becomes LP yield" },
  { range: "1h - 2h delay", payout: "20%", note: "Partial parametric payout" },
  { range: "2h - 4h delay", payout: "50%", note: "Partial parametric payout" },
  { range: "> 4h delay or CANCELLED", payout: "100%", note: "Full coverage paid" },
];

const SAFETY_CLASSES = [
  {
    tag: "[EXPECTED]",
    color: "var(--cyan)",
    desc: "Deterministic business logic (e.g. insufficient liquidity). Validators must match the message exactly.",
  },
  {
    tag: "[EXTERNAL]",
    color: "var(--amber)",
    desc: "External API 4xx. Deterministic; validators must agree exactly.",
  },
  {
    tag: "[TRANSIENT]",
    color: "var(--magenta)",
    desc: "Network / 5xx failures. Validators agree when both hit a transient error.",
  },
  {
    tag: "[LLM_ERROR]",
    color: "var(--red)",
    desc: "Model misbehaviour. Validators disagree on purpose to force a rotation.",
  },
];

const VALIDATION_PARAMS = [
  { k: "Premium loading", v: "+30% over fair odds" },
  { k: "Risk consensus", v: "Same risk band + premium within +/-25%" },
  { k: "Resolution consensus", v: "Validators must agree on the payout tier" },
  { k: "Coverage reserve", v: "max_payout locked while ACTIVE (solvency invariant)" },
  { k: "Re-entrancy", v: "Guard + checks-effects-interactions on every value-out path" },
  { k: "Duplicate guard", v: "One ACTIVE policy per passenger + flight + departure" },
];

/** Documentation & Info screen: protocol logic, validation, and safety model. */
export function DocsContent() {
  return (
    <div className="space-y-6">
      <Card icon={<ScrollText className="h-5 w-5" />} title="Protocol Overview" accent="var(--cyan)">
        <p className="text-sm leading-relaxed text-sky-muted">
          SkyShield AI is an autonomous, algorithmic flight-delay insurance protocol built as a
          GenLayer Intelligent Contract. It underwrites parametric coverage with no traditional
          oracles or keepers: premiums are priced by an on-chain AI risk model, and payouts are
          settled by a self-triggering resolver that reads live flight data directly from the
          internet during consensus. Capital is supplied by a community underwriting pool whose
          liquidity providers earn the premiums of flights that depart on time.
        </p>
        <div className="mt-4 rounded-xl border border-sky-border bg-sky-panel-2 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-sky-muted">Deployed contract</p>
          <p className="sky-mono mt-1 break-all text-sm text-sky-cyan">{DEPLOYED_ADDRESS}</p>
          <p className="mt-1 text-[11px] text-sky-muted">
            Frontend binding:{" "}
            {isSkyShieldConfigured ? (
              <span className="sky-mono text-sky-text">{SKYSHIELD_CONTRACT_ADDRESS}</span>
            ) : (
              "live simulation (no address configured)"
            )}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon={<Globe2 className="h-5 w-5" />} title="Oracle-less AI Web-Scraping" accent="var(--lime)">
          <p className="text-sm leading-relaxed text-sky-muted">
            Resolution uses GenLayer&apos;s native internet connectivity: the contract issues an HTTP
            GET to an aviation API and uses the LLM to parse the raw, free-form status into a
            structured delay decision. Every validator independently re-fetches and re-parses; they
            reach consensus on the derived <span className="text-sky-text">payout tier</span>, never
            the noisy raw bytes. This removes the need for a trusted oracle or off-chain keeper.
          </p>
        </Card>

        <Card icon={<BrainCircuit className="h-5 w-5" />} title="AI-Priced Premiums" accent="var(--magenta)">
          <p className="text-sm leading-relaxed text-sky-muted">
            On purchase, an AI underwriting model estimates the probability the flight is delayed at
            least an hour or cancelled. The premium is the fair-odds expected loss plus a protocol
            loading margin:
          </p>
          <p className="sky-mono mt-3 rounded-xl border border-sky-border bg-sky-panel-2 px-4 py-3 text-xs text-sky-cyan">
            premium = coverage x risk_bps / 10000 x (1 + loading_bps / 10000)
          </p>
        </Card>
      </div>

      <Card icon={<Layers className="h-5 w-5" />} title="Multi-Stage Granular Payouts" accent="var(--cyan)">
        <div className="overflow-hidden rounded-xl border border-sky-border">
          {PAYOUT_TIERS.map((t, i) => (
            <div
              key={t.range}
              className={`grid grid-cols-[1.4fr_0.6fr_2fr] items-center gap-3 px-4 py-3 text-sm ${
                i % 2 === 0 ? "bg-sky-panel-2" : ""
              }`}
            >
              <span className="text-sky-text">{t.range}</span>
              <span className="sky-mono font-bold" style={{ color: "var(--lime)" }}>{t.payout}</span>
              <span className="text-xs text-sky-muted">{t.note}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon={<Lock className="h-5 w-5" />} title="Validation Parameters" accent="var(--amber)">
          <dl className="space-y-2">
            {VALIDATION_PARAMS.map((p) => (
              <div key={p.k} className="flex items-start justify-between gap-4 border-b border-sky-border/50 pb-2 text-sm last:border-0">
                <dt className="text-sky-muted">{p.k}</dt>
                <dd className="sky-mono max-w-[60%] text-right text-xs text-sky-text">{p.v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card icon={<ShieldAlert className="h-5 w-5" />} title="Safety Classifications" accent="var(--red)">
          <ul className="space-y-3">
            {SAFETY_CLASSES.map((c) => (
              <li key={c.tag} className="text-sm">
                <span className="sky-mono font-bold" style={{ color: c.color }}>{c.tag}</span>
                <p className="mt-0.5 text-xs leading-relaxed text-sky-muted">{c.desc}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  accent,
  children,
}: {
  icon: ReactNode;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className="glass sky-card rounded-3xl p-6">
      <header className="mb-4 flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-border"
          style={{ color: accent, boxShadow: `0 0 18px -6px ${accent}` }}
        >
          {icon}
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-sky-text">{title}</h2>
      </header>
      {children}
    </section>
  );
}
