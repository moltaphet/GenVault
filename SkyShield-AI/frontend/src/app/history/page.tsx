"use client";

import { HistoricalLedger } from "@/components/skyshield/HistoricalLedger";
import { PageShell } from "@/components/skyshield/PageShell";

export default function HistoryPage() {
  return (
    <PageShell>
      <HistoricalLedger />
    </PageShell>
  );
}
