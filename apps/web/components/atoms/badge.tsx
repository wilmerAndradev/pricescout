"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ═══════════════════════════════════════════════════════
   A-02 · Badge — FDS Section 3.1
   8 variants: price min/max, plan, match high/med/low,
   job status, filter chip
   All badges: rounded-full, DM Sans 11px, font-semibold
   ═══════════════════════════════════════════════════════ */

const badgeVariants = cva(
  /* Base — shared by all badges */
  [
    "inline-flex items-center",
    "rounded-full",
    "font-body text-[11px] font-semibold leading-none",
    "h-5 px-2",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        "precio-minimo": [
          "bg-[var(--color-accent-100)] text-emerald-700",
          "border border-emerald-200",
        ].join(" "),
        "precio-maximo": [
          "bg-[var(--color-danger-50)] text-[var(--color-danger-500)]",
          "border border-red-200",
        ].join(" "),
        plan: [
          "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]",
        ].join(" "),
        "match-alto": [
          "bg-[var(--color-accent-100)] text-emerald-700",
        ].join(" "),
        "match-medio": [
          "bg-[var(--color-warning-50)] text-amber-700",
        ].join(" "),
        "match-bajo": [
          "bg-[var(--color-slate-100)] text-[var(--color-slate-500)]",
        ].join(" "),
        "job-pending":  "bg-[var(--color-slate-100)] text-[var(--color-slate-500)]",
        "job-running":  "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]",
        "job-done":     "bg-[var(--color-accent-100)] text-emerald-700",
        "job-error":    "bg-[var(--color-danger-50)] text-[var(--color-danger-500)]",
        "filter-chip": [
          "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
          "border border-[var(--color-primary-100)]",
          "h-6 px-3 gap-1 cursor-pointer",
          "hover:bg-[var(--color-primary-100)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "plan",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show close button (for filter-chip variant) */
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, onRemove, ...props }, ref) => {
    return (
      <span
        className={cn(badgeVariants({ variant, className }))}
        ref={ref}
        {...props}
      >
        {children}
        {variant === "filter-chip" && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 rounded-full hover:bg-[var(--color-primary-200)] p-0.5 transition-colors"
            aria-label="Remover filtro"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
