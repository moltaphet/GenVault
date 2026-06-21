"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Reusable presentational primitives shared across the dashboard widgets. */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
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
      ? "bg-gradient-to-r from-sky-cyan to-sky-magenta text-black shadow-lg shadow-sky-cyan/30 hover:shadow-sky-cyan/50"
      : "border border-sky-border bg-sky-panel-2 text-sky-text backdrop-blur-md hover:border-sky-border-strong hover:bg-sky-cyan-soft";
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
      className="sky-mono w-full rounded-xl border border-sky-border bg-sky-panel-2 px-4 py-2.5 text-sky-text outline-none transition-all duration-200 placeholder:text-sky-muted hover:border-sky-border-strong focus:border-sky-cyan focus:ring-2 focus:ring-sky-cyan/30 disabled:opacity-50"
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
    info: "border-sky-border bg-sky-panel-2 text-sky-muted",
    error: "border-sky-red/40 bg-sky-red/10 text-sky-red",
    success: "border-sky-cyan/40 bg-sky-cyan-soft text-sky-cyan",
  } as const;
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

/** Small pill badge, e.g. for the active network. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-border bg-sky-panel-2 px-3 py-1 text-xs font-medium text-sky-muted backdrop-blur-md">
      {children}
    </span>
  );
}
