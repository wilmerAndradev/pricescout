"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/* ═══════════════════════════════════════════════════════
   A-03 · Input — FDS Section 3.1
   States: default, focus, error, success, disabled
   With optional icon left/right, label always above
   Height: h-10 standard, h-12 for search bar
   ═══════════════════════════════════════════════════════ */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Label displayed above the input (never floating) */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Success message displayed below the input */
  success?: string;
  /** Hint text displayed below the input */
  hint?: string;
  /** Icon element rendered on the left side */
  iconLeft?: React.ReactNode;
  /** Icon element rendered on the right side */
  iconRight?: React.ReactNode;
  /** Input size — md (40px) or lg (48px for search bar) */
  inputSize?: "md" | "lg";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      success,
      hint,
      iconLeft,
      iconRight,
      inputSize = "md",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    /* Determine border color based on state */
    const stateStyles = error
      ? "border-[var(--color-danger-500)] bg-[var(--color-danger-50)]"
      : success
        ? "border-[var(--color-accent-600)] bg-emerald-50"
        : "border-[var(--color-slate-200)] bg-white";

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label — always above, never floating (FDS rule) */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-slate-700)] font-body"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Icon left */}
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate-400)] peer-focus:text-[var(--color-slate-600)] pointer-events-none">
              {iconLeft}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              /* Base */
              "peer w-full rounded-[var(--radius-md)]",
              "font-body text-sm text-[var(--color-slate-700)]",
              "placeholder:text-[var(--color-slate-400)]",
              "border transition-all duration-150",
              /* Size */
              inputSize === "lg" ? "h-12" : "h-10",
              /* Padding with icon offsets */
              iconLeft ? "pl-10" : "pl-3",
              iconRight || error || success ? "pr-10" : "pr-3",
              /* State border+bg */
              stateStyles,
              /* Focus */
              "focus:outline-none focus:border-[var(--color-primary-600)] focus:shadow-[var(--shadow-focus)] focus:ring-0",
              /* Disabled */
              disabled && "bg-[var(--color-slate-50)] text-[var(--color-slate-400)] cursor-not-allowed",
              className
            )}
            {...props}
          />

          {/* Icon right / state icon */}
          {(iconRight || error || success) && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {error ? (
                <svg className="h-5 w-5 text-[var(--color-danger-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              ) : success ? (
                <svg className="h-5 w-5 text-[var(--color-accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                iconRight
              )}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-[var(--color-danger-500)] font-body">
            {error}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p className="text-sm text-[var(--color-accent-600)] font-body">
            {success}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && !success && (
          <p id={hintId} className="text-sm text-[var(--color-slate-400)] font-body">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
