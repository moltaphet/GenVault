"use client";

import type { ReactNode } from "react";
import { useSkyShieldData } from "@/context/SkyShieldDataContext";
import { TopNav } from "./TopNav";

/** Shared page frame: nav, simulation notice, content container, and footer. */
export function PageShell({ children }: { children: ReactNode }) {
  const { configured } = useSkyShieldData();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <TopNav />

      {!configured && (
        <div className="mb-6 rounded-xl border border-sky-border bg-sky-panel-2 px-4 py-3 text-sm text-sky-muted">
          Running in <span className="font-semibold text-sky-cyan">live simulation</span> mode. Set{" "}
          <code className="font-semibold text-sky-text">NEXT_PUBLIC_SKYSHIELD_CONTRACT_ADDRESS</code> in{" "}
          <code className="font-semibold text-sky-text">.env.local</code> to bind the dashboard to the
          deployed contract.
        </div>
      )}

      <div className="animate-fade-in space-y-6">{children}</div>

      <footer className="mt-12 border-t border-sky-border pt-8 text-center text-xs text-sky-muted">
        SkyShield AI | powered by the SkyShieldAI Intelligent Contract on GenLayer | no oracles, no keepers
      </footer>
    </main>
  );
}
