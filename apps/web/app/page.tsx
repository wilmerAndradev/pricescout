"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles, Check, ArrowRight, ShieldCheck, Zap, Globe, BarChart3, Bell, X, ShoppingBag, Tag } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/organisms/header";
import { Footer } from "@/components/organisms/footer";
import {
  StoreStrip,
  HowItWorks,
  MockupDemo,
  PricingTrustSignals,
  FaqSection,
  NewsletterBlock,
} from "@/components/organisms/landing-sections";

export default function LandingPage() {
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [guestSearchCount, setGuestSearchCount] = React.useState(0);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const [billingPeriod, setBillingPeriod] = React.useState<"monthly" | "yearly">("monthly");
  const [mousePos, setMousePos] = React.useState({ x: 100, y: 50 });
  const textRef = React.useRef<HTMLSpanElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const router = useRouter();

  const [stats, setStats] = React.useState({
    products_compared: 60134,
    products_today: 0,
    stores_active: 15,
    stores_this_week: 0,
    prices_registered: 65756,
    prices_today: 0
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
    setTimeout(() => {
      setGuestSearchCount(count);
    }, 0);

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
    "Sauvage Dior 100ml",
    "Tommy Hilfiger Girl EDT 100ml",
    "One Million Paco Rabanne",
    "Carolina Herrera Good Girl 80ml"
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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { "Authorization": `Bearer ${session.access_token}` } : {})
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
      <Header />

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
            <h1 
              onMouseMove={handleMouseMove}
              className="font-display font-extrabold text-5xl md:text-6xl text-[var(--color-slate-900)] tracking-tight leading-[1.1] mb-6"
            >
              Monitorea y compara <br />
              <span 
                ref={textRef}
                className="bg-clip-text text-transparent transition-[background-position] duration-75 select-none"
                style={{
                  backgroundImage: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, var(--color-accent-600) 0%, var(--color-primary-600) 75%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                }}
              >
                tus tiendas preferidas
              </span> al instante
            </h1>

            {/* Subtitle */}
            <p className="text-[var(--color-slate-600)] font-body text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Escribe un producto para comparar precios, stock e imágenes en tiempo real. Personaliza tu monitoreo y sigue la evolución de valores en los principales comercios de Chile.
            </p>

            <div className="max-w-2xl mx-auto mb-6">
              <form 
                onSubmit={handleSubmit} 
                className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] focus-within:ring-2 focus-within:ring-[var(--color-primary-100)] focus-within:border-[var(--color-primary-600)] transition-all duration-200"
              >
                <div className="flex-1 flex items-center gap-3 px-3 min-h-[50px]">
                  <Search size={22} className="text-[var(--color-slate-400)] flex-shrink-0" />
                  <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ingresa una fragancia o marca... Ej: Sauvage Dior, Bleu de Chanel, One Million..."
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

        {/* ── Store Strip ──────────────────────────────────── */}
        <StoreStrip />

        {/* ── How It Works ─────────────────────────────────── */}
        <HowItWorks />

        {/* ── Interactive Mockup Demo ──────────────────────── */}
        <MockupDemo />

        {/* ── Features Section ──────────────────────────────── */}
        <section id="technology" className="bg-white border-y border-[var(--color-slate-200)] py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--color-slate-900)] tracking-tight mb-4">
                Nuestra tecnología de comparación
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

        {/* ── Pricing Section (Dynamic & Highly Optimized) ────────────────────── */}
        <section id="pricing" className="py-24 px-6 bg-[var(--background)] relative overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full -z-10 opacity-40 blur-3xl pointer-events-none bg-gradient-to-r from-blue-100 via-purple-100 to-emerald-50 rounded-full" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="px-3 py-1 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                Suscripciones y Licencias
              </span>
              <h2 className="font-display font-extrabold text-3xl md:text-5xl text-[var(--color-slate-900)] tracking-tight mb-4">
                Planes adaptados a tu escala
              </h2>
              <p className="text-[var(--color-slate-500)] text-lg font-body">
                Accede a inteligencia de precios y monitoreo competitivo en tiempo real. Elige la cobertura ideal para tus requerimientos individuales o corporativos.
              </p>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="flex justify-center mb-16">
              <div className="relative flex items-center p-1.5 bg-[var(--color-slate-100)] rounded-full border border-[var(--color-slate-200)] shadow-[var(--shadow-xs)]">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-6 py-2.5 text-xs font-bold rounded-full transition-all duration-300 cursor-pointer ${
                    billingPeriod === "monthly"
                      ? "bg-white text-[var(--color-primary-700)] shadow-sm"
                      : "text-[var(--color-slate-500)] hover:text-[var(--color-slate-800)]"
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-6 py-2.5 text-xs font-bold rounded-full transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                    billingPeriod === "yearly"
                      ? "bg-white text-[var(--color-primary-700)] shadow-sm"
                      : "text-[var(--color-slate-500)] hover:text-[var(--color-slate-800)]"
                  }`}
                >
                  Anual
                  <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-800 rounded-full uppercase tracking-wider">
                    Ahorra 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Grid of 4 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              
              {/* Card 1: Gratis */}
              <div className="p-8 rounded-3xl bg-white border border-[var(--color-slate-200)] flex flex-col justify-between shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group hover:-translate-y-1">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[var(--color-slate-900)] mb-1">Gratis</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6 min-h-[32px]">Para consumidores y pruebas ocasionales</p>
                  
                  <div className="mb-6">
                    <span className="font-display font-black text-4xl text-[var(--color-slate-900)]">$0</span>
                    <span className="text-xs text-[var(--color-slate-400)] font-semibold"> / mes</span>
                    <span className="block text-[10px] text-transparent mt-1 select-none">Bypass spacing</span>
                  </div>

                  <div className="w-full h-px bg-[var(--color-slate-100)] mb-6" />

                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>10 búsquedas al mes</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Busca en hasta 5 tiendas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Resultados en tiempo real</span>
                    </li>
                  </ul>
                </div>
                
                <Link 
                  href="/register" 
                  className="w-full py-3 bg-[var(--color-slate-50)] hover:bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-2xl transition-all text-sm cursor-pointer"
                >
                  Empezar gratis
                </Link>
              </div>

              {/* Card 2: Starter */}
              <div className="p-8 rounded-3xl bg-white border border-[var(--color-slate-200)] flex flex-col justify-between shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group hover:-translate-y-1">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[var(--color-slate-900)] mb-1">Starter</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6 min-h-[32px]">Para compradores entusiastas y frecuentes</p>
                  
                  <div className="mb-6">
                    <span className="font-display font-black text-4xl text-[var(--color-slate-900)]">
                      {billingPeriod === "monthly" ? "$4.990" : "$3.990"}
                    </span>
                    <span className="text-xs text-[var(--color-slate-400)] font-semibold"> / mes</span>
                    {billingPeriod === "yearly" ? (
                      <span className="block text-[10px] text-emerald-600 font-bold mt-1">
                        Facturado anual ($47.880)
                      </span>
                    ) : (
                      <span className="block text-[10px] text-transparent mt-1 select-none">Bypass spacing</span>
                    )}
                  </div>

                  <div className="w-full h-px bg-[var(--color-slate-100)] mb-6" />

                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>100 búsquedas al mes</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Busca en hasta 10 tiendas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Monitorea 20 productos</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>5 alertas de precio activas</span>
                    </li>
                  </ul>
                </div>
                
                <Link 
                  href="/register" 
                  className="w-full py-3 bg-white hover:bg-[var(--color-slate-50)] border border-[var(--color-primary-600)] text-[var(--color-primary-600)] font-bold text-center rounded-2xl transition-all text-sm cursor-pointer shadow-sm hover:shadow"
                >
                  Elegir Starter
                </Link>
              </div>

              {/* Card 3: Pro (Destacado) */}
              <div className="p-8 rounded-3xl bg-white border-2 border-[var(--color-primary-600)] flex flex-col justify-between shadow-[0_20px_50px_rgba(37,99,235,0.08)] relative transition-all duration-300 group hover:-translate-y-2 hover:shadow-[0_25px_60px_rgba(37,99,235,0.12)]">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--color-primary-600)] text-white text-[10px] font-black uppercase tracking-widest shadow-md">
                  Recomendado
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[var(--color-slate-900)] mb-1">Pro</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6 min-h-[32px]">Para marcas, importadores y pymes</p>
                  
                  <div className="mb-6">
                    <span className="font-display font-black text-4xl text-[var(--color-slate-900)]">
                      {billingPeriod === "monthly" ? "$12.990" : "$10.390"}
                    </span>
                    <span className="text-xs text-[var(--color-slate-400)] font-semibold"> / mes</span>
                    {billingPeriod === "yearly" ? (
                      <span className="block text-[10px] text-emerald-600 font-bold mt-1">
                        Facturado anual ($124.680)
                      </span>
                    ) : (
                      <span className="block text-[10px] text-transparent mt-1 select-none">Bypass spacing</span>
                    )}
                  </div>

                  <div className="w-full h-px bg-[var(--color-slate-100)] mb-6" />

                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="font-semibold text-[var(--color-slate-900)]">Búsquedas ilimitadas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="font-semibold text-[var(--color-slate-900)]">Sin límite de tiendas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Monitorea 100 productos</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Alertas ilimitadas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Panel de Entorno configurable</span>
                    </li>
                  </ul>
                </div>
                
                <Link 
                  href="/register" 
                  className="w-full py-3.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-center rounded-2xl transition-all text-sm cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.02] transform duration-150"
                >
                  Elegir Pro
                </Link>
              </div>

              {/* Card 4: Business */}
              <div className="p-8 rounded-3xl bg-white border border-[var(--color-slate-200)] flex flex-col justify-between shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group hover:-translate-y-1">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[var(--color-slate-900)] mb-1">Business</h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6 min-h-[32px]">Para grandes distribuidoras y corporaciones</p>
                  
                  <div className="mb-6">
                    <span className="font-display font-black text-4xl text-[var(--color-slate-900)]">
                      {billingPeriod === "monthly" ? "$29.990" : "$23.990"}
                    </span>
                    <span className="text-xs text-[var(--color-slate-400)] font-semibold"> / mes</span>
                    {billingPeriod === "yearly" ? (
                      <span className="block text-[10px] text-emerald-600 font-bold mt-1">
                        Facturado anual ($287.880)
                      </span>
                    ) : (
                      <span className="block text-[10px] text-transparent mt-1 select-none">Bypass spacing</span>
                    )}
                  </div>

                  <div className="w-full h-px bg-[var(--color-slate-100)] mb-6" />

                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Monitorea 500 productos</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Refresco automático cada 2 horas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Añade tus propios dominios</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--color-slate-600)]">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Soporte dedicado + Acceso API</span>
                    </li>
                  </ul>
                </div>
                
                <Link 
                  href="/register" 
                  className="w-full py-3 bg-[var(--color-slate-900)] hover:bg-black text-white font-bold text-center rounded-2xl transition-all text-sm cursor-pointer shadow-sm hover:shadow"
                >
                  Elegir Business
                </Link>
              </div>

            </div>

            {/* Trust Signals */}
            <PricingTrustSignals />
          </div>
        </section>

        {/* ── FAQ Section ──────────────────────────────────── */}
        <FaqSection />

        {/* ── Newsletter Block ─────────────────────────────── */}
        <NewsletterBlock />
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <Footer />

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
