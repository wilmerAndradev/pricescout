import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "@/components/atoms/icons";

/* ═══════════════════════════════════════════════════════
   O-03 · Progress Panel
   Displays loading state with steps and pulse animation
   while Celery/Playwright scrape the data.
   ═══════════════════════════════════════════════════════ */

export interface ProgressPanelProps {
  title?: string;
  description?: string;
  className?: string;
  progressText?: string | null;
}

export function ProgressPanel({
  title = "Extrayendo precios...",
  description = "Nuestro motor está navegando la web para obtener la información más actualizada. Esto puede tomar unos segundos.",
  className,
  progressText
}: ProgressPanelProps) {
  return (
    <div className={cn(
      "w-full max-w-md mx-auto bg-white border border-[var(--color-slate-200)] rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-lg)] text-center",
      className
    )}>
      <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
        {/* Pulse effect rings */}
        <div className="absolute inset-0 rounded-full border-4 border-[var(--color-primary-100)] animate-ping opacity-75" />
        <div className="absolute inset-2 rounded-full border-4 border-[var(--color-primary-200)] animate-pulse" />
        
        <div className="relative bg-[var(--color-primary-50)] text-[var(--color-primary-600)] p-4 rounded-full">
          <Loader2 size={32} className="animate-spin" />
        </div>
      </div>

      <h2 className="font-display text-xl font-bold text-[var(--color-slate-900)] mb-2">
        {title}
      </h2>
      <p className="font-body text-[var(--color-slate-500)] text-sm mb-4">
        {description}
      </p>

      {progressText && (
        <div className="inline-block bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-4 py-1.5 rounded-full text-sm font-bold mb-6">
          Completado: {progressText}
        </div>
      )}

      {/* Simulated steps */}
      <div className="space-y-3 text-left">
        <div className="flex items-center text-sm font-medium text-[var(--color-slate-400)]">
          <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          Analizando URL(s) y asignando motores
        </div>
        <div className="flex items-center text-sm font-medium text-[var(--color-primary-600)]">
          <div className="w-5 h-5 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center mr-3 animate-pulse">
            <span className="w-2 h-2 bg-[var(--color-primary-600)] rounded-full"></span>
          </div>
          Procesando con parsers deterministas o IA
        </div>
        <div className="flex items-center text-sm font-medium text-[var(--color-slate-400)] opacity-50">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--color-slate-200)] flex items-center justify-center mr-3" />
          Procesando resultados y validando precios
        </div>
      </div>
    </div>
  );
}
