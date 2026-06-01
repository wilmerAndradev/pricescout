"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
      <Link
        href="/dashboard"
        className={cn(
          "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium font-body transition-colors duration-200",
          pathname === "/dashboard"
            ? "border-[var(--color-primary-600)] text-[var(--color-slate-900)]"
            : "border-transparent text-[var(--color-slate-500)] hover:border-[var(--color-slate-300)] hover:text-[var(--color-slate-700)]"
        )}
      >
        Dashboard
      </Link>
      <Link
        href="/compare/new"
        className={cn(
          "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium font-body transition-colors duration-200",
          pathname.includes("/compare")
            ? "border-[var(--color-primary-600)] text-[var(--color-slate-900)]"
            : "border-transparent text-[var(--color-slate-500)] hover:border-[var(--color-slate-300)] hover:text-[var(--color-slate-700)]"
        )}
      >
        Nueva Comparación
      </Link>
    </div>
  );
}
