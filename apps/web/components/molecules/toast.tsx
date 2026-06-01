"use client";

import { Toaster as Sonner, toast } from "sonner";
import { AlertCircle, Check, Info, AlertTriangle } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   M-06 · Toast Notifications (Sonner wrapper)
   Provides PriceScout styled toasts matching FDS colors.
   ═══════════════════════════════════════════════════════ */

export function Toaster() {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[var(--color-slate-900)] group-[.toaster]:border-[var(--color-slate-200)] group-[.toaster]:shadow-[var(--shadow-lg)] font-body",
          description: "group-[.toast]:text-[var(--color-slate-500)]",
          actionButton:
            "group-[.toast]:bg-[var(--color-primary-600)] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[var(--color-slate-100)] group-[.toast]:text-[var(--color-slate-500)]",
          error: "group-[.toaster]:bg-[var(--color-danger-50)] group-[.toaster]:text-[var(--color-danger-500)] group-[.toaster]:border-red-200",
          success: "group-[.toaster]:bg-[var(--color-accent-100)] group-[.toaster]:text-emerald-700 group-[.toaster]:border-emerald-200",
          warning: "group-[.toaster]:bg-[var(--color-warning-50)] group-[.toaster]:text-amber-700 group-[.toaster]:border-amber-200",
          info: "group-[.toaster]:bg-[var(--color-primary-50)] group-[.toaster]:text-[var(--color-primary-700)] group-[.toaster]:border-[var(--color-primary-100)]",
        },
      }}
      icons={{
        success: <Check className="h-5 w-5 text-emerald-600" />,
        info: <Info className="h-5 w-5 text-[var(--color-primary-600)]" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        error: <AlertCircle className="h-5 w-5 text-[var(--color-danger-500)]" />,
      }}
    />
  );
}

export { toast };
