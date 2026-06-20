"use client";

import {
  Clock,
  Cpu,
  Layers,
  LineChart,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** Marketing / explainer content describing how GenVault works. */

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "Intelligent Staking & Auto-Compounding",
    description:
      "Stake once and let the vault do the rest. Accrued yield is folded back into your principal on demand or by an automated keeper, so every cycle earns on a larger base — compounding efficiency without manual claiming.",
  },
  {
    icon: Cpu,
    title: "Powered by GenLayer Intelligent Contracts",
    description:
      "The SmartStakingOptimizer runs as a GenLayer Intelligent Contract, validated by GenLayer's Optimistic Democracy consensus. Every balance update is re-executed and agreed upon by independent validators before it becomes state.",
  },
  {
    icon: Clock,
    title: "Real-Time Geometric Yield — No External Keeper",
    description:
      "Yield accrues continuously from the deterministic consensus block timestamp, computed on-chain at the moment you interact. Because each compound raises the principal the next period is measured against, returns grow geometrically — with no off-chain keeper, oracle, or cron job required to keep balances correct.",
  },
];

const PILLARS: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Deterministic & Secure",
    description:
      "All money math uses exact integer arithmetic in atto precision — no floating point, no rounding drift between validators.",
  },
  {
    icon: Layers,
    title: "Transparent Accounting",
    description:
      "Principal, pending yield, lifetime deposits, and compounded totals are all readable on-chain at any time.",
  },
  {
    icon: LineChart,
    title: "Configurable APY",
    description:
      "The annual yield is expressed in basis points and can be tuned by the protocol owner as strategy evolves.",
  },
];

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-vault-border bg-vault-panel-2 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-vault-border-strong hover:shadow-xl">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-vault-accent to-vault-accent-2 text-black shadow-lg shadow-vault-accent/20 transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-vault-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-vault-muted">{description}</p>
    </div>
  );
}

export function AboutProtocol() {
  return (
    <section className="glass relative overflow-hidden rounded-3xl p-8 sm:p-10">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vault-accent/40 to-transparent"
      />

      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-vault-border bg-vault-accent-soft px-3 py-1 text-xs font-medium text-vault-accent">
          <Sparkles className="h-3.5 w-3.5" />
          About the Protocol
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-vault-text sm:text-3xl">
          What is <span className="text-gradient">GenVault</span>?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-vault-muted sm:text-base">
          GenVault is an Intelligent Staking &amp; Yield Optimizer built on the GenLayer
          protocol. It turns a simple deposit into a continuously optimized position:
          tokens are staked, yield accrues against the consensus block clock, and rewards
          are automatically re-staked to maximize compounding efficiency — all enforced by
          an Intelligent Contract rather than a trusted operator.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {PILLARS.map((pillar) => (
          <FeatureCard key={pillar.title} {...pillar} />
        ))}
      </div>

      {/* Keeperless geometric-yield callout. */}
      <div className="relative mt-10 overflow-hidden rounded-2xl border border-vault-accent/30 bg-gradient-to-br from-vault-accent-soft to-transparent p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-vault-accent to-vault-accent-2 text-black shadow-lg shadow-vault-accent/30">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-vault-text sm:text-lg">
              Real-time geometric distribution, without an external keeper
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-vault-muted">
              The Intelligent Contract derives each account&apos;s accrued yield directly
              from the consensus block timestamp the instant a stake, compound, or
              withdrawal is processed. There is no off-chain bot, scheduler, or oracle in
              the loop: balances are always exact because the math runs inside GenLayer
              consensus itself. Compounding lifts the principal that the next interval is
              measured against, so a position left to compound grows geometrically over
              time — fully on-chain and trust-minimized.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-vault-border bg-vault-panel-2 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-vault-muted">
          How a deposit grows
        </h3>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { step: "01", text: "Connect your wallet and stake tokens into the vault." },
            { step: "02", text: "Yield accrues every second from the consensus timestamp." },
            { step: "03", text: "Compound to fold pending yield back into your principal." },
            { step: "04", text: "Withdraw principal plus rewards — partially or in full." },
          ].map((item) => (
            <li key={item.step} className="relative">
              <span className="text-2xl font-bold text-gradient">{item.step}</span>
              <p className="mt-1 text-sm leading-relaxed text-vault-muted">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
