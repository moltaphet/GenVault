"use client";

import { BoardingPassMonitor } from "@/components/skyshield/BoardingPassMonitor";
import { LiquidityVault } from "@/components/skyshield/LiquidityVault";
import { PageShell } from "@/components/skyshield/PageShell";
import { ProtocolStatsHeader } from "@/components/skyshield/ProtocolStatsHeader";
import { PurchasePolicyForm } from "@/components/skyshield/PurchasePolicyForm";

export default function DashboardPage() {
  return (
    <PageShell>
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
    </PageShell>
  );
}
