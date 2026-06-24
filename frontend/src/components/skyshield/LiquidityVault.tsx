"use client";

import { Landmark, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useSkyShieldData } from "@/context/SkyShieldDataContext";
import { useTxAction } from "@/hooks/useTxAction";
import { attoToToken, tokenToAtto } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/skyshield/config";
import { AmountInput, Banner, Button } from "@/components/ui";

type Mode = "deposit" | "withdraw";

/**
 * Liquidity Provider vault. LPs deposit GEN to back policies and earn the
 * premiums of flights that depart on time. Shows the provider's share value,
 * accrued yield versus principal, and the claimable balance from exits/payouts.
 */
export function LiquidityVault() {
  const {
    stats,
    lpShares,
    lpRedeemable,
    lpAvailable,
    claimable,
    provideLiquidity,
    withdrawLiquidity,
    claim,
  } = useSkyShieldData();
  const { run, pending, error } = useTxAction();

  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");

  const sharePrice = stats.totalShares === 0n ? 0n : (stats.totalAssets * 10n ** 18n) / stats.totalShares;
  // Yield = current redeemable value above the 1:1 face value of held shares.
  const yieldEarned = lpRedeemable > lpShares ? lpRedeemable - lpShares : 0n;

  const onSubmit = async () => {
    const atto = tokenToAtto(amount);
    if (atto <= 0n) return;
    const ok = await run(async () => {
      if (mode === "deposit") {
        await provideLiquidity(atto);
      } else {
        // Withdraw is denominated in shares; redeem the requested GEN value.
        const shares =
          stats.totalAssets === 0n ? atto : (atto * stats.totalShares) / stats.totalAssets;
        await withdrawLiquidity(shares > lpShares ? lpShares : shares);
      }
      return "ok";
    });
    if (ok) setAmount("");
  };

  const onClaim = () =>
    run(async () => {
      await claim();
      return "claimed";
    });

  return (
    <section className="glass sky-card rounded-3xl p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-vault-border" style={{ color: "var(--sky-magenta)", boxShadow: "0 0 18px -6px var(--sky-magenta)" }}>
          <Landmark className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-vault-text">Underwriting Vault</h2>
          <p className="text-sm text-vault-muted">Provide liquidity, earn premium yield.</p>
        </div>
      </header>

      {/* Position summary. */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Metric label="Your Position" value={`${attoToToken(lpRedeemable, 2)} ${TOKEN_SYMBOL}`} accent="var(--sky-cyan)" />
        <Metric
          label="Yield Earned"
          value={`+${attoToToken(yieldEarned, 2)}`}
          hint={`share price ${attoToToken(sharePrice, 4)}`}
          accent="var(--sky-lime)"
          icon
        />
      </div>

      {/* Mode toggle. */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-vault-border bg-vault-panel-2 p-1">
        {(["deposit", "withdraw"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-all duration-200 ${
              mode === m ? "bg-vault-accent-soft text-vault-accent" : "text-vault-muted hover:text-vault-text"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <AmountInput value={amount} onChange={setAmount} placeholder={`Amount in ${TOKEN_SYMBOL}`} />
        <p className="sky-mono flex justify-between text-xs text-vault-muted">
          <span>{mode === "deposit" ? "Pool available" : "Redeemable now"}</span>
          <span>
            {attoToToken(mode === "deposit" ? stats.availableLiquidity : lpAvailable, 2)} {TOKEN_SYMBOL}
          </span>
        </p>

        {error && <Banner tone="error">{error}</Banner>}

        <Button onClick={onSubmit} loading={pending} disabled={tokenToAtto(amount) <= 0n} className="w-full">
          {mode === "deposit" ? "Provide Liquidity" : "Withdraw Liquidity"}
        </Button>

        {claimable > 0n && (
          <div className="flex items-center justify-between rounded-xl border border-vault-border bg-vault-accent-soft px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-vault-muted">Claimable</p>
              <p className="sky-mono text-lg font-semibold" style={{ color: "var(--sky-lime)" }}>
                {attoToToken(claimable, 2)} {TOKEN_SYMBOL}
              </p>
            </div>
            <Button variant="secondary" onClick={onClaim} loading={pending}>
              Claim
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
  icon = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  icon?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-vault-border bg-vault-panel-2 px-4 py-3">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-vault-muted">
        {icon && <TrendingUp className="h-3 w-3" />} {label}
      </p>
      <p className="sky-mono mt-1 text-lg font-semibold" style={{ color: accent }}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-vault-muted">{hint}</p>}
    </div>
  );
}
