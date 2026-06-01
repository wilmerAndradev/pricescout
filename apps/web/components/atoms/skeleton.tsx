"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/* ═══════════════════════════════════════════════════════
   A-05 · Skeleton / Spinner / Progress Bar — FDS 3.1
   - Skeleton: animate-pulse blocks (bg-slate-200 → slate-100)
   - Spinner: SVG for button loading states only
   - Progress Bar: linear bar for scraping jobs
   ═══════════════════════════════════════════════════════ */

/* ── Skeleton ─────────────────────────────────────────── */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width class (e.g. "w-full", "w-32") */
  width?: string;
  /** Height class (e.g. "h-4", "h-10") */
  height?: string;
  /** Shape: "rect" (default) or "circle" */
  shape?: "rect" | "circle";
}

function Skeleton({
  className,
  width = "w-full",
  height = "h-4",
  shape = "rect",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-[var(--color-slate-200)]",
        shape === "circle" ? "rounded-full" : "rounded-[var(--radius-md)]",
        width,
        height,
        className
      )}
      {...props}
    />
  );
}

/* ── Spinner ──────────────────────────────────────────── */
interface SpinnerProps {
  /** Size in pixels */
  size?: number;
  /** Additional classes */
  className?: string;
}

function Spinner({ size = 20, className }: SpinnerProps) {
  return (
    <svg
      className={cn("animate-spin text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ── Progress Bar ─────────────────────────────────────── */
interface ProgressBarProps {
  /** Progress value 0–100 */
  value: number;
  /** Additional classes for the container */
  className?: string;
  /** Show percentage label */
  showLabel?: boolean;
}

function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs font-body text-[var(--color-slate-500)]">
            Progreso
          </span>
          <span className="text-xs font-mono font-semibold text-[var(--color-slate-700)]">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full bg-[var(--color-primary-100)] overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--color-primary-600)] transition-all duration-300 ease-linear"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export { Skeleton, Spinner, ProgressBar };
