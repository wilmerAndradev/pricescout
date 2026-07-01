import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/organisms/header";
import { Footer } from "@/components/organisms/footer";

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
    <div className="min-h-screen bg-[var(--color-slate-50)] flex flex-col">
      {/* O-01 Navbar (Responsive Header) */}
      <Header displayName={displayName} initials={initials} />

      {/* Main Content Area */}
      <main className="py-8 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* O-02 Footer Component */}
      <Footer />
    </div>
  );
}
