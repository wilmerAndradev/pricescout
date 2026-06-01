import * as React from "react";
import Link from "next/link";
import { Search } from "@/components/atoms/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-slate-50)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-[var(--color-primary-600)] rounded-[var(--radius-md)] flex items-center justify-center shadow-[var(--shadow-md)]">
            <Search className="text-white" size={24} />
          </div>
          <span className="font-display text-2xl font-bold text-[var(--color-primary-700)]">
            PriceScout
          </span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-display font-bold text-[var(--color-slate-900)]">
          Bienvenido de vuelta
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-[var(--shadow-sm)] sm:rounded-[var(--radius-lg)] sm:px-10 border border-[var(--color-slate-200)]">
          {children}
        </div>
      </div>
    </div>
  );
}
