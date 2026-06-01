import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Search, Bell, Settings, LogOut, Package } from "@/components/atoms/icons";
import { Button } from "@/components/atoms/button";
import { logout } from "./actions";
import { NavLinks } from "@/components/molecules/nav-links";

/* ═══════════════════════════════════════════════════════
   O-01 · Navigation Main Layout
   Sticky navbar with logo, links, and user menu
   ═══════════════════════════════════════════════════════ */

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile data for display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Usuario";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--color-slate-50)]">
      {/* O-01 Navbar (Sticky) */}
      <nav className="sticky top-0 z-40 bg-white border-b border-[var(--color-slate-200)] shadow-[var(--shadow-sm)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[var(--color-primary-600)] rounded-[var(--radius-md)] flex items-center justify-center">
                    <Search className="text-white" size={18} />
                  </div>
                  <span className="font-display text-xl font-bold text-[var(--color-primary-700)] hidden sm:block">
                    PriceScout
                  </span>
                </Link>
              </div>

              {/* Main Nav Links */}
              <NavLinks />
            </div>

            <div className="flex items-center gap-4">
              <Button variant="icon" aria-label="Notificaciones" className="hidden sm:flex rounded-full">
                <Bell size={20} />
              </Button>
              
              <div className="relative flex items-center gap-3">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-sm font-medium text-[var(--color-slate-900)] font-body">
                    {displayName}
                  </span>
                </div>
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-[var(--color-primary-100)] border border-[var(--color-primary-200)] flex items-center justify-center text-[var(--color-primary-700)] font-semibold font-body shadow-[var(--shadow-xs)]">
                  {initials}
                </div>
                {/* Simplified logout directly visible for MVP purposes without full dropdown */}
                <form action={logout}>
                  <Button type="submit" variant="ghost" size="sm" className="text-[var(--color-slate-500)]">
                    <LogOut size={18} className="mr-1" />
                    <span className="hidden sm:inline">Salir</span>
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
