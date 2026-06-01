import * as React from "react";
import { cn } from "@/lib/utils/cn";

/* ═══════════════════════════════════════════════════════
   M-04 · Stat Card — FDS Section 3.2
   Used in dashboard for global metrics
   ═══════════════════════════════════════════════════════ */

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number; // positive or negative
    label: string;
  };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-[var(--radius-lg)] border border-[var(--color-slate-200)] p-6 shadow-[var(--shadow-sm)]",
      className
    )}>
      <div className="flex items-center justify-between">
        <h3 className="font-body text-sm font-medium text-[var(--color-slate-500)]">
          {title}
        </h3>
        <div className="p-2 bg-[var(--color-primary-50)] rounded-[var(--radius-md)] text-[var(--color-primary-600)]">
          {icon}
        </div>
      </div>
      
      <div className="mt-4 flex items-baseline gap-2">
        <p className="font-display text-3xl font-bold text-[var(--color-slate-900)]">
          {value}
        </p>
        
        {trend && (
          <span className={cn(
            "font-body text-sm font-medium flex items-center",
            trend.value >= 0 ? "text-[var(--color-accent-600)]" : "text-[var(--color-danger-500)]"
          )}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
            <span className="text-[var(--color-slate-400)] ml-1 font-normal text-xs hidden sm:inline">
              vs {trend.label}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
