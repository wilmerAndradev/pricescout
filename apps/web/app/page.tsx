"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles, Check, ArrowRight, ShieldCheck, Zap, Globe, BarChart3, Bell, X, ShoppingBag, Tag } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LandingPage() {
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [guestSearchCount, setGuestSearchCount] = React.useState(0);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const router = useRouter();

  const [stats, setStats] = React.useState({
    products_compared: 11303,
    products_today: 245,
    stores_active: 15,
    stores_this_week: 1,
    prices_registered: 22982,
    prices_today: 532
  });

  React.useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    // Retrieve search count from localStorage
    const count = parseInt(localStorage.getItem("pricescout_guest_searches") || "0", 10);
    setGuestSearchCount(count);

    // Fetch live global statistics
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const response = await fetch(`${apiUrl}/search/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {}
    };
    fetchStats();
  }, []);

  // Chips for instant search recommendations
  const recommendationChips = [
    "Cafetera Oster 12 tazas",
    "Sauvage Dior 100ml",
    "Notebook Gamer ASUS",
    "Nike Air Max 90"
  ];

  const handleChipClick = (chip: string) => {
    setQuery(chip);
    executeSearch(chip);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error("Por favor, ingresa el nombre de un producto");
      return;
    }
    executeSearch(query.trim());
  };

  const executeSearch = async (searchQuery: string) => {
    // If the user is a guest, enforce the 5 searches limit
    if (!user) {
      const currentCount = parseInt(localStorage.getItem("pricescout_guest_searches") || "0", 10);
      if (currentCount >= 5) {
        setShowLimitModal(true);
        return;
      }
    }

    setIsLoading(true);
    const toastId = toast.loading("Iniciando búsqueda inteligente...");
    try {
      // 1. Initiate search on FastAPI backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: searchQuery })
      });

      if (!response.ok) {
        throw new Error("Error de conexión con el motor de scraping");
      }

      const data = await response.json();
      
      if (data.search_id) {
        // Increment search count if anonymous
        if (!user) {
          const nextCount = guestSearchCount + 1;
          localStorage.setItem("pricescout_guest_searches", nextCount.toString());
          setGuestSearchCount(nextCount);
        }

        toast.success("Búsqueda en curso", { id: toastId });
        router.push(`/search/${data.search_id}`);
      } else {
        throw new Error("ID de búsqueda no recibido");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con la API de búsqueda", { id: toastId });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col antialiased">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="border-b border-[var(--color-slate-200)] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-600)] flex items-center justify-center text-white font-display font-bold text-xl shadow-[var(--shadow-sm)]">
              P
            </div>
            <span className="font-display font-bold text-xl text-[var(--color-slate-900)] tracking-tight">
              PriceScout<span className="text-[var(--color-primary-600)]">.cl</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link 
                href="/dashboard" 
                className="text-sm font-bold bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white px-5 py-2.5 rounded-xl transition-all shadow-[var(--shadow-sm)] hover:shadow-md cursor-pointer"
              >
                Ir a mi Panel (Dashboard)
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-sm font-semibold text-[var(--color-slate-700)] hover:text-[var(--color-primary-600)] px-4 py-2 transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link 
                  href="/register" 
                  className="text-sm font-bold bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white px-5 py-2.5 rounded-xl transition-all shadow-[var(--shadow-sm)] hover:shadow-md"
                >
                  Registrarse Gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section (Buscador Autónomo) ──────────────── */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-24 px-6">
          {/* Decorative Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[var(--color-primary-50)] to-transparent -z-10 rounded-full blur-3xl opacity-70" />
          
          <div className="max-w-4xl mx-auto text-center">
            {/* Tagline */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-xs font-semibold tracking-wide uppercase mb-6 animate-pulse">
              <Sparkles size={12} />
              Motor Híbrido con IA v4.0
            </div>

            {/* Headline */}
            <h1 className="font-display font-extrabold text-5xl md:text-6xl text-[var(--color-slate-900)] tracking-tight leading-[1.1] mb-6">
              Compara precios en <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-accent-600)]">
                toda la web de Chile
              </span> al instante
            </h1>

            {/* Subtitle */}
            <p className="text-[var(--color-slate-600)] font-body text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Escribe el producto que quieres buscar. Nuestro rastreador autónomo con IA comparará precios, stock e imágenes en las mejores tiendas chilenas en tiempo real.
            </p>

            {/* Big Search Bar */}
            <div className="max-w-2xl mx-auto mb-6">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-md)] focus-within:ring-2 focus-within:ring-[var(--color-primary-100)] focus-within:border-[var(--color-primary-600)] transition-all">
                <div className="flex-1 flex items-center gap-3 px-3 min-h-[50px]">
                  <Search size={22} className="text-[var(--color-slate-400)] flex-shrink-0" />
                  <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="¿Qué producto buscas? Ej: Cafetera Oster 12 tazas..."
                    className="w-full bg-transparent border-0 outline-none text-[var(--color-slate-900)] font-body text-base placeholder-[var(--color-slate-400)] min-h-[40px]"
                    disabled={isLoading}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="sm:px-8 py-3.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
                >
                  {isLoading ? (
                    "Buscando..."
                  ) : (
                    <>
                      Buscar
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Guest Search Limit Indicator */}
              {!user && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-slate-100)] rounded-full text-xs font-semibold text-[var(--color-slate-500)] border border-[var(--color-slate-200)]">
                  <span>Búsquedas gratuitas de invitado restantes:</span>
                  <span className="font-extrabold text-[var(--color-primary-600)]">{Math.max(0, 5 - guestSearchCount)} de 5</span>
                </div>
              )}
            </div>

            {/* Recommendation Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
              <span className="text-xs font-semibold text-[var(--color-slate-400)] uppercase tracking-wider mr-2">Prueba con:</span>
              {recommendationChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 bg-white border border-[var(--color-slate-200)] hover:border-[var(--color-primary-600)] text-[var(--color-slate-700)] hover:text-[var(--color-primary-700)] font-body text-sm rounded-full shadow-[var(--shadow-xs)] transition-all cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Global Stats Cards Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16 text-left">
              {/* Card 1: Productos Comparados */}
              <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-6 shadow-[var(--shadow-sm)] flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">
                    Productos comparados
                  </div>
                  <div className="text-3xl font-black text-[var(--color-slate-950)] mt-0.5">
                    {stats.products_compared.toLocaleString("es-CL")}
                  </div>
                  <div className="text-xs font-bold text-green-600 mt-1 flex items-center gap-0.5">
                    <span>+{stats.products_today} hoy</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Tiendas Activas */}
              <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-6 shadow-[var(--shadow-sm)] flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Globe size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">
                    Tiendas activas
                  </div>
                  <div className="text-3xl font-black text-[var(--color-slate-950)] mt-0.5">
                    {stats.stores_active}
                  </div>
                  <div className="text-xs font-bold text-green-600 mt-1 flex items-center gap-0.5">
                    <span>+{stats.stores_this_week} esta semana</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Precios Registrados */}
              <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-6 shadow-[var(--shadow-sm)] flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Tag size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">
                    Precios registrados
                  </div>
                  <div className="text-3xl font-black text-[var(--color-slate-950)] mt-0.5">
                    {stats.prices_registered.toLocaleString("es-CL")}
                  </div>
                  <div className="text-xs font-bold text-green-600 mt-1 flex items-center gap-0.5">
                    <span>+{stats.prices_today} hoy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Section ──────────────────────────────── */}
        <section className="bg-white border-y border-[var(--color-slate-200)] py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--color-slate-900)] tracking-tight mb-4">
                El motor de comparación más avanzado
              </h2>
              <p className="text-[var(--color-slate-500)] text-lg">
                Combinamos extracción sigilosa y procesamiento de lenguaje natural para darte el control total de los precios.
              </p>
            </div>

            <div className="grid md:grid-rows-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-[var(--color-slate-50)] border border-[var(--color-slate-200)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)] flex items-center justify-center mb-6">
                  <Zap size={24} />
                </div>
                <h3 className="font-display font-bold text-xl text-[var(--color-slate-900)] mb-3">
                  Scraping en Tiempo Real
                </h3>
                <p className="text-[var(--color-slate-600)] font-body">
                  No guardamos datos obsoletos. Cuando buscas, nuestro motor Scrapling consulta las tiendas chilenas en vivo y en paralelo en menos de 20 segundos.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-[var(--color-slate-50)] border border-[var(--color-slate-200)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-100)] text-[var(--color-accent-600)] flex items-center justify-center mb-6">
                  <Globe size={24} />
                </div>
                <h3 className="font-display font-bold text-xl text-[var(--color-slate-900)] mb-3">
                  Motor de Extracción Universal
                </h3>
                <p className="text-[var(--color-slate-600)] font-body">
                  ¿El producto está en una tienda pequeña de nicho? Nuestro modelo de Inteligencia Artificial lee visualmente la estructura y extrae los datos de cualquier e-commerce.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-[var(--color-slate-50)] border border-[var(--color-slate-200)]">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                  <BarChart3 size={24} />
                </div>
                <h3 className="font-display font-bold text-xl text-[var(--color-slate-900)] mb-3">
                  Alertas e Historiales
                </h3>
                <p className="text-[var(--color-slate-600)] font-body">
                  Guarda tus búsquedas, analiza gráficos del histórico de precios de cada comercio y activa notificaciones por correo electrónico para enterarte de bajas de precio.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Section (Freemium) ────────────────────── */}
        <section className="py-20 px-6 bg-[var(--background)]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--color-slate-900)] tracking-tight mb-4">
                Planes adaptados a tus necesidades
              </h2>
              <p className="text-[var(--color-slate-500)] text-lg">
                Usa el buscador gratis o desbloquea el monitoreo profesional para tu marca.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {/* Plan Gratis */}
              <div className="p-8 rounded-2xl bg-white border border-[var(--color-slate-200)] flex flex-col justify-between shadow-[var(--shadow-sm)]">
                <div>
                  <h3 className="font-display font-bold text-lg text-[var(--color-slate-900)] mb-2">Gratis</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6">Para consumidores ocasionales</p>
                  <div className="mb-6">
                    <span className="font-display font-extrabold text-3xl text-[var(--color-slate-900)]">$0</span>
                    <span className="text-sm text-[var(--color-slate-500)]"> / mes</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      10 búsquedas al mes
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Busca en hasta 5 tiendas
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Resultados con imagen y stock
                    </li>
                  </ul>
                </div>
                <Link 
                  href="/register" 
                  className="w-full py-3 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl transition-all text-sm cursor-pointer"
                >
                  Empezar Gratis
                </Link>
              </div>

              {/* Plan Starter */}
              <div className="p-8 rounded-2xl bg-white border border-[var(--color-slate-200)] flex flex-col justify-between shadow-[var(--shadow-sm)]">
                <div>
                  <h3 className="font-display font-bold text-lg text-[var(--color-slate-900)] mb-2">Starter</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6">Para compradores entusiastas</p>
                  <div className="mb-6">
                    <span className="font-display font-extrabold text-3xl text-[var(--color-slate-900)]">$4.990</span>
                    <span className="text-sm text-[var(--color-slate-500)]"> / mes</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      100 búsquedas al mes
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Busca en hasta 10 tiendas
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Monitorea 20 productos
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      5 alertas de precio activas
                    </li>
                  </ul>
                </div>
                <Link 
                  href="/register" 
                  className="w-full py-3 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl transition-all text-sm cursor-pointer"
                >
                  Elegir Starter
                </Link>
              </div>

              {/* Plan Pro (Destacado) */}
              <div className="p-8 rounded-2xl bg-white border-2 border-[var(--color-primary-600)] flex flex-col justify-between shadow-[var(--shadow-md)] relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--color-primary-600)] text-white text-xs font-bold uppercase tracking-wider">
                  Recomendado
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[var(--color-slate-900)] mb-2">Pro</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6">Para marcas, pymes e importadores</p>
                  <div className="mb-6">
                    <span className="font-display font-extrabold text-3xl text-[var(--color-slate-900)]">$12.990</span>
                    <span className="text-sm text-[var(--color-slate-500)]"> / mes</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Búsquedas ilimitadas
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Busca en hasta 20 tiendas
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Monitorea 100 productos
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Alertas de precio ilimitadas
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      **Panel de Entorno (Elegir tiendas)**
                    </li>
                  </ul>
                </div>
                <Link 
                  href="/register" 
                  className="w-full py-3 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-center rounded-xl transition-all text-sm cursor-pointer shadow-[var(--shadow-sm)]"
                >
                  Elegir Pro
                </Link>
              </div>

              {/* Plan Business */}
              <div className="p-8 rounded-2xl bg-white border border-[var(--color-slate-200)] flex flex-col justify-between shadow-[var(--shadow-sm)]">
                <div>
                  <h3 className="font-display font-bold text-lg text-[var(--color-slate-900)] mb-2">Business</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6">Para grandes empresas y distribuidoras</p>
                  <div className="mb-6">
                    <span className="font-display font-extrabold text-3xl text-[var(--color-slate-900)]">$29.990</span>
                    <span className="text-sm text-[var(--color-slate-500)]"> / mes</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Monitorea 500 productos
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Refresco automático cada 2h
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      **Añade tus propios dominios**
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      Soporte dedicado + Acceso API
                    </li>
                  </ul>
                </div>
                <Link 
                  href="/register" 
                  className="w-full py-3 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl transition-all text-sm cursor-pointer"
                >
                  Elegir Business
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-slate-200)] bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-600)] flex items-center justify-center text-white font-display font-bold text-lg shadow-[var(--shadow-sm)]">
              P
            </div>
            <span className="font-display font-bold text-lg text-[var(--color-slate-900)] tracking-tight">
              PriceScout<span className="text-[var(--color-primary-600)]">.cl</span>
            </span>
          </div>
          
          <p className="text-[var(--color-slate-400)] font-body text-sm text-center">
            &copy; {new Date().getFullYear()} PriceScout Chile. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* ── Register Limit Modal for Guest Users ── */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] max-w-md w-full p-8 shadow-[var(--shadow-lg)] relative flex flex-col gap-6">
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-[var(--color-slate-400)] hover:text-[var(--color-slate-600)] cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-[var(--color-slate-900)]">
                Límite de Invitado Alcanzado
              </h3>
              <p className="text-sm text-[var(--color-slate-500)] font-body leading-relaxed">
                Has alcanzado tu límite de **5 búsquedas gratuitas** como invitado. ¡Registra tu cuenta gratis en menos de 30 segundos para desbloquear búsquedas ilimitadas, alertas de precio e histórico completo!
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link 
                href="/register" 
                className="w-full py-3.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-center rounded-xl text-sm transition-all shadow hover:shadow-md cursor-pointer"
              >
                Crear Mi Cuenta Gratis
              </Link>
              <Link 
                href="/login" 
                className="w-full py-3.5 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl text-sm transition-colors cursor-pointer"
              >
                Ya tengo cuenta (Iniciar Sesión)
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
