"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Reusable presentational primitives shared across the feature panels. */

export function Card({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl ${className}`}
    >
      {/* Top sheen for a layered, semi-3D surface. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vault-accent/40 to-transparent"
      />
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-vault-text">{title}</h2>
            )}
            {subtitle && <p className="mt-1 text-sm text-vault-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-vault-border bg-vault-panel-2 px-4 py-3 transition-all duration-200 hover:border-vault-border-strong hover:bg-vault-accent-soft">
      <p className="text-xs font-medium uppercase tracking-wide text-vault-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-vault-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-vault-muted">{hint}</p>}
    </div>
  );
}

/** Small inline spinner used inside buttons and loading states. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

/** Animated placeholder block for content that is still loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-xl border border-vault-border bg-vault-panel-2 ${className}`}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-vault-accent to-vault-accent-2 text-black shadow-lg shadow-vault-accent/20 hover:shadow-vault-accent/40"
      : "border border-vault-border bg-vault-panel-2 text-vault-text backdrop-blur-md hover:border-vault-border-strong hover:bg-vault-accent-soft";
  return (
    <button
      className={`${base} ${styles} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0.0",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || /^\d*\.?\d*$/.test(next)) onChange(next);
      }}
      className="w-full rounded-xl border border-vault-border bg-vault-panel-2 px-4 py-2.5 text-vault-text outline-none transition-all duration-200 placeholder:text-vault-muted hover:border-vault-border-strong focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/30 disabled:opacity-50"
    />
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const tones = {
    info: "border-vault-border bg-vault-panel-2 text-vault-muted",
    error: "border-red-500/40 bg-red-500/10 text-red-500 dark:text-red-300",
    success: "border-vault-accent/40 bg-vault-accent-soft text-vault-accent",
  } as const;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  );
}

/** Small pill badge, e.g. for the active network. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-vault-border bg-vault-panel-2 px-3 py-1 text-xs font-medium text-vault-muted backdrop-blur-md">
      {children}
    </span>
  );
}
