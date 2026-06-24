"use client";

import { Plane } from "lucide-react";
import Link from "next/link";
import { BoardingPassMonitor } from "@/components/skyshield/BoardingPassMonitor";
import { LiquidityVault } from "@/components/skyshield/LiquidityVault";
import { ProtocolStatsHeader } from "@/components/skyshield/ProtocolStatsHeader";
import { PurchasePolicyForm } from "@/components/skyshield/PurchasePolicyForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/WalletConnect";
import { Badge } from "@/components/ui";
import { SkyShieldDataProvider } from "@/context/SkyShieldDataContext";
import { activeChainName } from "@/lib/config";
import { isSkyShieldConfigured } from "@/lib/skyshield/config";

export default function SkyShieldPage() {
  return (
    <SkyShieldDataProvider>
      <div className="sky-scope min-h-screen">
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="animate-float inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-vault-border-strong bg-vault-panel-2 text-vault-accent" style={{ boxShadow: "0 0 26px -6px var(--sky-cyan)" }}>
                <Plane className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="sky-title">SkyShield AI</span>
                </h1>
                <p className="mt-0.5 text-sm text-vault-muted">
                  Autonomous Algorithmic Flight &amp; Travel Insurance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge>
                <span className="sky-dot sky-blink" style={{ color: "var(--sky-lime)" }} aria-hidden />
                {activeChainName}
              </Badge>
              <Link
                href="/"
                className="hidden rounded-full border border-vault-border bg-vault-panel-2 px-3 py-1 text-xs font-medium text-vault-muted transition-colors hover:text-vault-text sm:inline-block"
              >
                GenVault Staking
              </Link>
              <ThemeToggle />
              <WalletConnect />
            </div>
          </header>

          {!isSkyShieldConfigured && (
            <div className="mb-6 rounded-xl border border-vault-border bg-vault-panel-2 px-4 py-3 text-sm text-vault-muted">
              Running in <span className="font-semibold text-vault-accent">live simulation</span> mode.
              Set <code className="font-semibold text-vault-text">NEXT_PUBLIC_SKYSHIELD_CONTRACT_ADDRESS</code>{" "}
              in <code className="font-semibold text-vault-text">.env.local</code> to bind the dashboard
              to a deployed contract.
            </div>
          )}

          <div className="animate-fade-in space-y-6">
            <ProtocolStatsHeader />

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <PurchasePolicyForm />
              </div>
              <div className="lg:col-span-2">
                <LiquidityVault />
              </div>
            </div>

            <BoardingPassMonitor />
          </div>

          <footer className="mt-12 border-t border-vault-border pt-8 text-center text-xs text-vault-muted">
            SkyShield AI | powered by the SkyShieldAI Intelligent Contract on GenLayer |
            no oracles, no keepers
          </footer>
        </main>
      </div>
    </SkyShieldDataProvider>
  );
}
