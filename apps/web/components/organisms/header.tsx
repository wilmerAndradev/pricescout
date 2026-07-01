"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, X, Layers, Search, User, ChevronDown, BarChart3, ArrowUpDown, Star, Sparkles } from "@/components/atoms/icons";
import { Button } from "@/components/atoms/button";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════
   O-01 · Header / Navigation Component
   Dynamic navigation bar supporting guest & authenticated users,
   premium glassmorphism, responsive menus, and profile actions.
   ═══════════════════════════════════════════════════════ */

interface HeaderProps {
  displayName?: string;
  initials?: string;
}

export function Header({ displayName: initialDisplayName, initials: initialInitials }: HeaderProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(initialDisplayName ? { id: "server-session" } : null);
  const [profile, setProfile] = React.useState<any>(initialDisplayName ? { full_name: initialDisplayName } : null);
  const [loading, setLoading] = React.useState(!initialDisplayName);
  
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Adjust isOpen state when pathname changes (render-time state adjustment)
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  React.useEffect(() => {

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        
        // Only fetch profile if not already set by props
        if (!initialDisplayName) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", session.user.id)
            .single();
          setProfile(profileData);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    checkSession();

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        if (!initialDisplayName) {
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", session.user.id)
            .single()
            .then(({ data }) => setProfile(data));
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialDisplayName, supabase]);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuario";
  const initials = initialInitials || displayName.substring(0, 2).toUpperCase();

  // Navigation configurations based on auth status
  const authNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/environments", label: "Configurar Tiendas", icon: Layers }
  ];

  const guestNavItems = [
    { href: "/", label: "Buscador", icon: Search },
    { href: "/#pricing", label: "Precios", icon: Star },
    { href: "/#technology", label: "Nuestra Tecnología", icon: Sparkles }
  ];

  const navItems = user ? authNavItems : guestNavItems;

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[var(--color-slate-200)] shadow-[var(--shadow-sm)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Navigation Links */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
                <img 
                  src="/Logo-01.png" 
                  alt="PriceScout Logo" 
                  className="w-8 h-8 object-contain"
                />
                <span className="font-display text-xl font-bold tracking-tight">
                  <span className="text-[#0c0f30]">Price</span>
                  <span className="text-[var(--color-primary-700)]">Scout</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold font-body transition-colors duration-200",
                    pathname === item.href
                      ? "border-[var(--color-primary-600)] text-[var(--color-slate-900)]"
                      : "border-transparent text-[var(--color-slate-500)] hover:border-[var(--color-slate-300)] hover:text-[var(--color-slate-700)]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side Options */}
          <div className="hidden sm:flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-32 bg-[var(--color-slate-100)] animate-pulse rounded-lg" />
            ) : user ? (
              /* Authenticated User Menu Dropdown (O-01 Unified Design) */
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[var(--color-slate-50)] focus:outline-none transition-all duration-200 border border-transparent hover:border-[var(--color-slate-200)] cursor-pointer"
                  aria-expanded={isProfileDropdownOpen}
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-[var(--color-primary-100)] border border-[var(--color-primary-200)] flex items-center justify-center text-[var(--color-primary-700)] font-semibold font-body shadow-[var(--shadow-xs)] hover:ring-2 hover:ring-[var(--color-primary-300)] transition-all">
                    {initials}
                  </div>
                  {/* Label */}
                  <span className="text-sm font-semibold text-[var(--color-slate-700)] hidden md:inline font-body">
                    {displayName}
                  </span>
                  <ChevronDown size={14} className={cn("text-[var(--color-slate-400)] transition-transform duration-200", isProfileDropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown Card */}
                {isProfileDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-30 cursor-default" 
                      onClick={() => setIsProfileDropdownOpen(false)}
                    />
                    
                    {/* Dropdown Container */}
                    <div className="absolute right-0 top-11 z-40 mt-2 w-64 origin-top-right rounded-2xl border border-[var(--color-slate-200)] bg-white p-2 shadow-[var(--shadow-md)] animate-fade-in focus:outline-none flex flex-col">
                      {/* User Header Info */}
                      <div className="px-3 py-2.5 border-b border-[var(--color-slate-100)]">
                        <p className="text-sm font-bold text-[var(--color-slate-900)] leading-none">{displayName}</p>
                        <p className="text-xs text-[var(--color-slate-400)] mt-1.5 truncate font-semibold">{user.email || "Usuario Activo"}</p>
                      </div>

                      {/* Dropdown Actions */}
                      <div className="py-1.5 flex flex-col gap-0.5">
                        <Link
                          href="/dashboard"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-slate-600)] hover:bg-[var(--color-slate-50)] hover:text-[var(--color-slate-900)] transition-colors font-body"
                        >
                          <User size={16} className="text-[var(--color-slate-400)]" />
                          <span>Editar Perfil</span>
                        </Link>
                        
                        <Link
                          href="/environments"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-slate-600)] hover:bg-[var(--color-slate-50)] hover:text-[var(--color-slate-900)] transition-colors font-body"
                        >
                          <Layers size={16} className="text-[var(--color-slate-400)]" />
                          <span>Configurar Tiendas</span>
                        </Link>

                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            toast.info("No tienes notificaciones pendientes");
                          }}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-slate-600)] hover:bg-[var(--color-slate-50)] hover:text-[var(--color-slate-900)] transition-colors font-body cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Bell size={16} className="text-[var(--color-slate-400)]" />
                            <span>Notificaciones</span>
                          </div>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        </button>
                      </div>

                      {/* Logout Action */}
                      <div className="border-t border-[var(--color-slate-100)] pt-1.5 mt-1.5">
                        <form onSubmit={handleLogout}>
                          <button
                            type="submit"
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors font-body cursor-pointer"
                          >
                            <LogOut size={16} className="text-red-400" />
                            <span>Cerrar Sesión</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Guest Actions */
              <div className="flex items-center gap-3">
                <Link 
                  href="/login" 
                  className="text-sm font-semibold text-[var(--color-slate-600)] hover:text-[var(--color-primary-600)] px-3 py-2 transition-colors font-body"
                >
                  Iniciar Sesión
                </Link>
                <Link 
                  href="/register" 
                  className="text-sm font-bold bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white px-4 py-2 rounded-xl transition-all shadow-[var(--shadow-sm)] hover:shadow-md font-body"
                >
                  Empezar gratis
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-[var(--color-slate-500)] hover:text-[var(--color-slate-800)] hover:bg-[var(--color-slate-100)] focus:outline-none transition-colors"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Abrir menú principal</span>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div
        className={cn(
          "sm:hidden transition-all duration-300 ease-in-out overflow-hidden border-t border-[var(--color-slate-100)] bg-white",
          isOpen ? "max-h-[460px] opacity-100 py-3 animate-fade-in" : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="px-4 space-y-1.5 pb-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold font-body transition-colors",
                pathname === item.href
                  ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                  : "text-[var(--color-slate-600)] hover:bg-[var(--color-slate-50)] hover:text-[var(--color-slate-900)]"
              )}
            >
              {item.icon && <item.icon size={16} />}
              {item.label}
            </Link>
          ))}
        </div>
        
        {/* Mobile User Section */}
        <div className="border-t border-[var(--color-slate-100)] pt-3 px-4">
          {loading ? (
            <div className="h-9 w-full bg-[var(--color-slate-100)] animate-pulse rounded-xl" />
          ) : user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[var(--color-primary-100)] border border-[var(--color-primary-200)] flex items-center justify-center text-[var(--color-primary-700)] font-semibold font-body text-xs">
                  {initials}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--color-slate-900)] font-body leading-none">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-[var(--color-slate-400)] font-bold mt-1 leading-none uppercase tracking-wider">
                    Usuario Activo
                  </span>
                </div>
              </div>
              <form onSubmit={handleLogout}>
                <Button type="submit" variant="ghost" size="sm" className="text-[var(--color-slate-500)] hover:text-[var(--color-danger-600)] text-xs h-9 px-3 font-semibold">
                  <LogOut size={16} className="mr-1" />
                  Salir
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link 
                href="/login" 
                className="flex items-center justify-center w-full text-sm font-semibold text-[var(--color-slate-700)] hover:bg-[var(--color-slate-50)] py-2.5 rounded-xl border border-[var(--color-slate-200)] transition-colors font-body"
              >
                <User size={16} className="mr-2" />
                Iniciar Sesión
              </Link>
              <Link 
                href="/register" 
                className="flex items-center justify-center w-full text-sm font-bold bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white py-2.5 rounded-xl transition-all shadow-[var(--shadow-sm)] font-body"
              >
                Registrarse Gratis
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
