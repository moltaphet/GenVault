"use client";

import { Plane, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useSkyShieldData } from "@/context/SkyShieldDataContext";
import { useTxAction } from "@/hooks/useTxAction";
import { attoToToken } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/skyshield/config";
import {
  COVERAGE_PACKAGES,
  quotePremiumAtto,
  riskBand,
  simulateRiskBps,
} from "@/lib/skyshield/pricing";
import { Banner, Button } from "@/components/ui";

/** Default departure for the picker: ~2 hours out, rounded to the minute. */
function defaultDeparture(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PAYOUT_TIERS = [
  { window: "1h-2h delay", pct: "20%" },
  { window: "2h-4h delay", pct: "50%" },
  { window: "> 4h or cancelled", pct: "100%" },
];

/**
 * Passenger purchase form. Flight code + departure + coverage package drive an
 * instant premium preview that reproduces the on-chain pricing math (the AI
 * risk score is simulated client-side; the contract computes the real one).
 */
export function PurchasePolicyForm() {
  const { purchasePolicy } = useSkyShieldData();
  const { run, pending, error } = useTxAction();

  const [flightCode, setFlightCode] = useState("");
  const [departure, setDeparture] = useState(defaultDeparture);
  const [packageId, setPackageId] = useState(COVERAGE_PACKAGES[0].id);

  const pkg = COVERAGE_PACKAGES.find((p) => p.id === packageId) ?? COVERAGE_PACKAGES[0];
  const departureTs = Math.floor(new Date(departure).getTime() / 1000);
  const valid = flightCode.trim().length >= 3 && Number.isFinite(departureTs) && departureTs > 0;

  const quote = useMemo(() => {
    if (!valid) return null;
    const riskBps = simulateRiskBps(flightCode, departureTs);
    const premium = quotePremiumAtto(pkg.coverageAtto, BigInt(riskBps));
    return { riskBps, premium, band: riskBand(riskBps) };
  }, [valid, flightCode, departureTs, pkg.coverageAtto]);

  const [done, setDone] = useState(false);

  const onPurchase = async () => {
    if (!valid) return;
    setDone(false);
    const ok = await run(async () => {
      await purchasePolicy({ flightCode, departureTs, coverageAtto: pkg.coverageAtto });
      return "policy-opened";
    });
    if (ok) {
      setDone(true);
      setFlightCode("");
    }
  };

  return (
    <section className="glass sky-card rounded-3xl p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-vault-border text-vault-accent" style={{ boxShadow: "0 0 18px -6px var(--sky-cyan)" }}>
          <Plane className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-vault-text">Insure a Flight</h2>
          <p className="text-sm text-vault-muted">Parametric delay coverage, priced by AI underwriting.</p>
        </div>
      </header>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Flight Code">
            <input
              value={flightCode}
              onChange={(e) => setFlightCode(e.target.value.toUpperCase())}
              placeholder="e.g. BA245"
              maxLength={8}
              className="sky-mono w-full rounded-xl border border-vault-border bg-vault-panel-2 px-4 py-2.5 uppercase tracking-widest text-vault-text outline-none transition-all duration-200 placeholder:text-vault-muted placeholder:tracking-normal focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/30"
            />
          </Field>
          <Field label="Departure (local)">
            <input
              type="datetime-local"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className="sky-mono w-full rounded-xl border border-vault-border bg-vault-panel-2 px-4 py-2.5 text-vault-text outline-none transition-all duration-200 focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/30"
            />
          </Field>
        </div>

        <Field label="Coverage Package">
          <div className="grid grid-cols-3 gap-2">
            {COVERAGE_PACKAGES.map((p) => {
              const selected = p.id === packageId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackageId(p.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                    selected
                      ? "border-vault-accent bg-vault-accent-soft"
                      : "border-vault-border bg-vault-panel-2 hover:border-vault-border-strong"
                  }`}
                >
                  <p className="text-sm font-semibold text-vault-text">{p.label}</p>
                  <p className="sky-mono mt-1 text-xs text-vault-accent">
                    {attoToToken(p.coverageAtto, 0)} {TOKEN_SYMBOL}
                  </p>
                  <p className="mt-1 text-[10px] leading-tight text-vault-muted">{p.tagline}</p>
                </button>
              );
            })}
          </div>
        </Field>

        {/* Live premium preview. */}
        <div className="sky-scanlines overflow-hidden rounded-2xl border border-vault-border bg-vault-panel-2 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-vault-muted">
              <Sparkles className="h-3.5 w-3.5 text-vault-accent" /> Dynamic Premium Quote
            </span>
            {quote && (
              <span
                className="sky-mono rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ color: "var(--sky-magenta)", borderColor: "var(--border-strong)" }}
              >
                RISK {quote.band.label} | {(quote.riskBps / 100).toFixed(1)}%
              </span>
            )}
          </div>

          {quote ? (
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="sky-mono sky-neon text-3xl font-bold text-vault-text">
                  {attoToToken(quote.premium, 2)}
                </p>
                <p className="text-xs text-vault-muted">{TOKEN_SYMBOL} premium</p>
              </div>
              <div className="text-right">
                <p className="sky-mono text-lg font-semibold" style={{ color: "var(--sky-lime)" }}>
                  {attoToToken(pkg.coverageAtto, 0)} {TOKEN_SYMBOL}
                </p>
                <p className="text-xs text-vault-muted">max payout</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-vault-muted">
              Enter a flight code and departure to preview the premium.
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-vault-border pt-3">
            {PAYOUT_TIERS.map((t) => (
              <div key={t.window} className="text-center">
                <p className="sky-mono text-sm font-bold" style={{ color: "var(--sky-cyan)" }}>{t.pct}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-vault-muted">{t.window}</p>
              </div>
            ))}
          </div>
        </div>

        {error && <Banner tone="error">{error}</Banner>}
        {done && <Banner tone="success">Policy opened. Track it on the boarding-pass monitor below.</Banner>}

        <Button onClick={onPurchase} loading={pending} disabled={!valid} className="w-full">
          {valid ? "Purchase Policy" : "Enter flight details"}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-vault-muted">{label}</span>
      {children}
    </label>
  );
}
