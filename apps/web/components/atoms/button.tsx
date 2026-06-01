"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/* ═══════════════════════════════════════════════════════
   A-01 · Button — FDS Section 3.1
   6 variants × 3 sizes, with hover/focus/disabled states
   ═══════════════════════════════════════════════════════ */

const buttonVariants = cva(
  /* Base styles — shared by all variants */
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap",
    "rounded-[var(--radius-md)]",
    "transition-all duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    "active:scale-[0.97]",
    "cursor-pointer",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--color-primary-700)] text-white",
          "hover:bg-[var(--color-primary-600)] hover:shadow-[var(--shadow-md)]",
        ].join(" "),
        secondary: [
          "bg-white text-[var(--color-slate-700)]",
          "border border-[var(--color-slate-200)]",
          "hover:bg-[var(--color-slate-50)] hover:border-[var(--color-slate-400)]",
        ].join(" "),
        accent: [
          "bg-[var(--color-accent-600)] text-white",
          "hover:bg-emerald-700",
        ].join(" "),
        ghost: [
          "bg-transparent text-[var(--color-primary-700)]",
          "hover:bg-[var(--color-primary-50)]",
        ].join(" "),
        danger: [
          "bg-[var(--color-danger-500)] text-white",
          "hover:bg-red-600",
        ].join(" "),
        icon: [
          "bg-white text-[var(--color-slate-500)]",
          "border border-[var(--color-slate-200)]",
          "hover:bg-[var(--color-slate-50)] hover:text-[var(--color-slate-700)]",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    compoundVariants: [
      /* Icon-only buttons are square */
      { variant: "icon", size: "sm", className: "h-8 w-8 p-0" },
      { variant: "icon", size: "md", className: "h-10 w-10 p-0" },
      { variant: "icon", size: "lg", className: "h-12 w-12 p-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Accessible label for icon-only buttons (required when variant="icon") */
  "aria-label"?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
