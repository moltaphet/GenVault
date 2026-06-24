"use client";

import { Vault } from "lucide-react";
import Link from "next/link";
import { AboutProtocol } from "@/components/AboutProtocol";
import { AccountOverview } from "@/components/AccountOverview";
import { CompoundPanel } from "@/components/CompoundPanel";
import { ProtocolStats } from "@/components/ProtocolStats";
import { SocialLinks } from "@/components/SocialLinks";
import { StakePanel } from "@/components/StakePanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/WalletConnect";
import { WithdrawPanel } from "@/components/WithdrawPanel";
import { Badge, Banner } from "@/components/ui";
import { activeChainName, isContractConfigured } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="animate-float inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-vault-accent to-vault-accent-2 text-black shadow-lg shadow-vault-accent/30">
            <Vault className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-vault-text">
              Gen<span className="text-gradient">Vault</span>
            </h1>
            <p className="mt-0.5 text-sm text-vault-muted">
              Intelligent Staking &amp; Yield Optimizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge>
            <span className="h-1.5 w-1.5 rounded-full bg-vault-accent" aria-hidden />
            {activeChainName}
          </Badge>
          <Link
            href="/skyshield"
            className="hidden rounded-full border border-vault-border bg-vault-panel-2 px-3 py-1 text-xs font-medium text-vault-muted transition-colors hover:text-vault-text sm:inline-block"
          >
            SkyShield AI
          </Link>
          <SocialLinks className="hidden sm:flex" />
          <ThemeToggle />
          <WalletConnect />
        </div>
      </header>

      {!isContractConfigured && (
        <div className="mb-6">
          <Banner tone="error">
            No contract address configured. Set{" "}
            <code className="font-semibold text-vault-text">NEXT_PUBLIC_CONTRACT_ADDRESS</code>{" "}
            in <code className="font-semibold text-vault-text">.env.local</code> (see{" "}
            <code className="font-semibold text-vault-text">.env.local.example</code>).
          </Banner>
        </div>
      )}

      <div className="animate-fade-in space-y-6">
        <ProtocolStats />
        <AccountOverview />
        <div className="grid gap-6 lg:grid-cols-3">
          <StakePanel />
          <CompoundPanel />
          <WithdrawPanel />
        </div>
        <AboutProtocol />
      </div>

      <footer className="mt-12 flex flex-col items-center gap-4 border-t border-vault-border pt-8 sm:flex-row sm:justify-between">
        <p className="text-center text-xs text-vault-muted sm:text-left">
          GenVault · powered by the SmartStakingOptimizer Intelligent Contract on GenLayer
        </p>
        <SocialLinks />
      </footer>
    </main>
  );
}
