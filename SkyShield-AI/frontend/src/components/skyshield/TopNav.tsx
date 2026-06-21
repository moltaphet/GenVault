"use client";

import { History, LayoutDashboard, Plane, ScrollText, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { Badge } from "@/components/ui";
import { activeChainName } from "@/lib/config";

const NAV_LINKS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/portfolio", label: "Portfolio", icon: <Wallet className="h-4 w-4" /> },
  { href: "/history", label: "History", icon: <History className="h-4 w-4" /> },
  { href: "/docs", label: "Docs", icon: <ScrollText className="h-4 w-4" /> },
];

/** Brand bar + primary navigation, shared by every dashboard view. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="mb-8 flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="animate-float inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-border-strong bg-sky-panel-2 text-sky-cyan"
            style={{ boxShadow: "0 0 26px -6px var(--cyan)" }}
          >
            <Plane className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="sky-title">SkyShield AI</span>
            </h1>
            <p className="mt-0.5 text-sm text-sky-muted">
              Autonomous Algorithmic Flight &amp; Travel Insurance
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Badge>
            <span className="sky-dot sky-blink" style={{ color: "var(--lime)" }} aria-hidden />
            {activeChainName}
          </Badge>
          <WalletConnect />
        </div>
      </div>

      {/* Primary nav. */}
      <nav className="glass sky-card flex gap-1 overflow-x-auto rounded-2xl p-1.5">
        {NAV_LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-sky-cyan-soft text-sky-cyan"
                  : "text-sky-muted hover:bg-sky-panel-2 hover:text-sky-text"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
