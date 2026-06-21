"use client";

import { RadioTower } from "lucide-react";
import { useSkyShieldData } from "@/context/SkyShieldDataContext";
import { attoToToken } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/skyshield/config";
import { statusView } from "./status";

/**
 * Real-time, terminal-style departures board. Each row is one of the user's
 * policies; the autonomous resolver drives the live status indicator from
 * ACTIVE -> CHECKING API -> RESOLVED/EXPIRED with a flashing dot.
 */
export function BoardingPassMonitor() {
  const { policies } = useSkyShieldData();
  // The live board tracks current passes; settled history lives on /history.
  const board = policies.filter((p) => !p.historical);

  return (
    <section className="glass sky-card overflow-hidden rounded-3xl">
      <header className="flex items-center justify-between border-b border-sky-border px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-border text-sky-cyan"
            style={{ boxShadow: "0 0 18px -6px var(--cyan)" }}
          >
            <RadioTower className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-sky-text">Boarding Pass Monitor</h2>
            <p className="text-sm text-sky-muted">Autonomous resolution / live flight tracking</p>
          </div>
        </div>
        <span className="sky-mono flex items-center gap-2 text-xs text-sky-muted">
          <span className="sky-dot sky-blink" style={{ color: "var(--lime)" }} aria-hidden />
          LIVE FEED
        </span>
      </header>

      <div className="sky-scanlines">
        {/* Column header row. */}
        <div className="sky-mono grid grid-cols-[1.1fr_1.4fr_1fr] gap-2 border-b border-sky-border/60 px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-sky-muted sm:grid-cols-[0.8fr_1fr_1.6fr_1fr]">
          <span>Flight</span>
          <span className="hidden sm:block">Coverage</span>
          <span>Status</span>
          <span className="text-right">Payout</span>
        </div>

        {board.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-sky-muted">
            No active boarding passes. Insure a flight to start monitoring.
          </p>
        ) : (
          <ul className="divide-y divide-sky-border/50">
            {board.map((p) => {
              const view = statusView(p);
              const settled = p.liveStatus === "RESOLVED" || p.liveStatus === "EXPIRED";
              const departs = new Date(p.departureTs * 1000);
              return (
                <li
                  key={p.policyId}
                  className={`sky-mono grid grid-cols-[1.1fr_1.4fr_1fr] items-center gap-2 px-6 py-3.5 text-sm transition-colors sm:grid-cols-[0.8fr_1fr_1.6fr_1fr] ${
                    view.checking ? "bg-sky-cyan-soft" : "hover:bg-sky-panel-2"
                  }`}
                >
                  {/* Flight + departure time. */}
                  <div className="min-w-0">
                    <p className="truncate font-bold tracking-widest text-sky-text">{p.flightCode}</p>
                    <p className="text-[10px] text-sky-muted">
                      {departs.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Coverage. */}
                  <p className="hidden text-sky-muted sm:block">
                    {attoToToken(p.maxPayout, 0)} {TOKEN_SYMBOL}
                  </p>

                  {/* Live status indicator. */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`sky-dot ${view.blink ? "sky-blink" : ""}`}
                      style={{ color: view.color }}
                      aria-hidden
                    />
                    <span
                      className={`truncate text-xs font-semibold ${view.checking ? "sky-flicker" : ""}`}
                      style={{ color: view.color }}
                    >
                      {view.label}
                    </span>
                  </div>

                  {/* Payout result. */}
                  <p
                    className="text-right text-xs font-semibold"
                    style={{ color: settled ? "var(--lime)" : "var(--muted)" }}
                  >
                    {p.liveStatus === "RESOLVED"
                      ? `+${attoToToken(p.payoutAmount, 0)} ${TOKEN_SYMBOL}`
                      : settled
                        ? "-"
                        : "pending"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
