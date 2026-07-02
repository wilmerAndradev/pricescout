"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  Search,
  Bell,
  TrendingDown,
  ShieldCheck,
  PackageCheck,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";

// ── Store Strip ──────────────────────────────────────────────────────────────
// Only lists stores that are currently active in apps/api/scrapers/registry.py
const ACTIVE_STORES = [
  { name: "Alisha Perfumes",   domain: "alishaperfumes.cl",       initials: "AL" },
  { name: "Cosmetic",          domain: "cosmetic.cl",              initials: "CO" },
  { name: "Elite Perfumes",    domain: "eliteperfumes.cl",         initials: "EP" },
  { name: "Lodoro",            domain: "lodoro.cl",                initials: "LO" },
  { name: "MultiMarcas",       domain: "multimarcasperfumes.cl",   initials: "MM" },
  { name: "Mundo Aromas",      domain: "mundoaromas.cl",           initials: "MA" },
  { name: "Perfumisimo",       domain: "perfumisimo.cl",           initials: "PF" },
  { name: "Silk Perfumes",     domain: "silkperfumes.cl",          initials: "SP" },
  { name: "Alarab",            domain: "alarab.cl",                initials: "AR" },
  { name: "ParisPerfumes",     domain: "parisperfumes.cl",         initials: "PP" },
  { name: "Sairam",            domain: "sairam.cl",                initials: "SA" },
  { name: "JoyPerfumes",       domain: "joyperfumes.cl",           initials: "JP" },
  { name: "Yauras",            domain: "yauras.cl",                initials: "YA" },
  { name: "ComprarenChile",    domain: "comprarenchile.cl",        initials: "CC" },
  { name: "Productos de Lujo", domain: "productosdelujo.cl",       initials: "PL" },
];

function StoreLogo({ domain, initials, name }: { domain: string; initials: string; name: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-xl bg-[var(--color-slate-100)] animate-pulse flex-shrink-0" />;
  }

  if (failed) {
    return (
      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-accent-600)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt={`Logo de ${name}`}
      width={40}
      height={40}
      className="w-10 h-10 rounded-xl object-contain bg-white border border-[var(--color-slate-100)] p-1 flex-shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

export function StoreStrip() {
  // Repeat the list 4 times so the marquee loops seamlessly on any screen size (including 4K)
  const repeated = [
    ...ACTIVE_STORES,
    ...ACTIVE_STORES,
    ...ACTIVE_STORES,
    ...ACTIVE_STORES,
  ];

  return (
    <section className="py-14 bg-white border-b border-[var(--color-slate-200)] overflow-hidden">
      <p className="text-center text-xs font-bold text-[var(--color-slate-400)] uppercase tracking-widest mb-10 px-6">
        Comparamos precios en las mejores tiendas especializadas de Chile
      </p>

      {/* Fade edges */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent" />

        {/* Marquee track */}
        <div
          className="flex items-center gap-6 w-max animate-marquee hover:[animation-play-state:paused]"
          style={{
            animation: "marquee 32s linear infinite",
          }}
        >
          {repeated.map((store, i) => (
            <div
              key={`${store.name}-${i}`}
              className="flex flex-col items-center gap-2 group flex-shrink-0 transition-transform duration-300 hover:-translate-y-1.5"
            >
              <div
                className={`w-16 h-16 rounded-2xl bg-white border border-[var(--color-slate-200)] flex items-center justify-center shadow-sm group-hover:shadow-[0_10px_25px_-5px_rgba(37,99,235,0.12)] group-hover:scale-105 ${
                  i % 2 === 0 ? "group-hover:rotate-3" : "group-hover:-rotate-3"
                } transition-all duration-300 p-2`}
              >
                <StoreLogo domain={store.domain} initials={store.initials} name={store.name} />
              </div>
              <span className="text-[10px] font-semibold text-[var(--color-slate-500)] text-center leading-tight max-w-[72px] group-hover:text-[var(--color-primary-600)] transition-colors duration-300">
                {store.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
      `}</style>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────
const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    icon: Search,
    title: "Escribe el producto",
    desc: "Ingresa el nombre del perfume, cosmético o producto que te interesa. Sin URLs, sin configuración.",
    color: "var(--color-primary-600)",
    bg: "var(--color-primary-50)",
  },
  {
    step: "02",
    icon: Zap,
    title: "El motor lo busca por ti",
    desc: "Nuestro motor híbrido consulta en paralelo todas las tiendas activas y extrae precios, stock e imágenes en tiempo real.",
    color: "#059669",
    bg: "#f0fdf4",
  },
  {
    step: "03",
    icon: TrendingDown,
    title: "Compara y ahorra",
    desc: "Visualiza los resultados ordenados por precio, detecta el mejor deal y activa alertas para cuando baje el valor.",
    color: "#7C3AED",
    bg: "#f5f3ff",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-[var(--background)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--color-slate-900)] tracking-tight mb-4">
            ¿Cómo funciona?
          </h2>
          <p className="text-[var(--color-slate-500)] text-lg max-w-xl mx-auto">
            Tres pasos para encontrar el mejor precio disponible en el mercado.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting line – desktop only */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-[var(--color-primary-200)] via-emerald-200 to-purple-200 z-0" />

          {HOW_IT_WORKS_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative z-10 flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] hover:shadow-md transition-shadow"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm"
                  style={{ backgroundColor: s.bg, color: s.color }}
                >
                  <Icon size={28} strokeWidth={2} />
                </div>
                <span className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: s.color }}>
                  Paso {s.step}
                </span>
                <h3 className="font-display font-bold text-lg text-[var(--color-slate-900)] mb-3">
                  {s.title}
                </h3>
                <p className="text-sm text-[var(--color-slate-500)] font-body leading-relaxed">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Interactive Mockup (Sauvage Dior demo) ───────────────────────────────────
const MOCKUP_RESULTS = [
  {
    store: "Cosmetic",
    domain: "cosmetic.cl",
    brand: "Dior",
    title: "Sauvage Dior De Christian Dior Para Hombre EDT 100 ML Tester",
    price: 59990,
    stock: true,
    initials: "CO",
    isCheapest: true
  },
  {
    store: "Perfumisimo",
    domain: "perfumisimo.cl",
    brand: "Dior",
    title: "Sauvage Dior EDT 100 ML - Dior",
    price: 64990,
    stock: true,
    initials: "PF",
    isCheapest: false
  },
  {
    store: "Elite Perfumes",
    domain: "eliteperfumes.cl",
    brand: "Dior",
    title: "Christian Dior Sauvage De Dior EDT 100ml Hombre",
    price: 67500,
    stock: false,
    initials: "EP",
    isCheapest: false
  },
];

export function MockupDemo() {
  return (
    <section className="py-20 px-6 bg-[var(--color-slate-50)] border-y border-[var(--color-slate-200)] relative overflow-hidden">
      {/* Visual Marketing background glow elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--color-slate-900)] tracking-tight mb-4">
            Mira cómo se ven los resultados reales
          </h2>
          <p className="text-[var(--color-slate-500)] text-lg max-w-xl mx-auto">
            Así se muestra la comparativa de precios real en la aplicación para <span className="font-semibold text-[var(--color-slate-700)]">Sauvage Dior 100ml</span>.
          </p>
        </div>

        {/* Real search results mock UI */}
        <div className="bg-white rounded-3xl border border-[var(--color-slate-200)] p-6 md:p-8 shadow-[var(--shadow-lg)]">
          {/* Header row with KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 transition-all hover:bg-emerald-50/80">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Precio Mínimo
              </div>
              <div className="text-2xl font-black text-emerald-700">$59.990</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-1">Mejor opción disponible</div>
            </div>
            <div className="bg-blue-50/50 rounded-2xl border border-blue-200 p-4 transition-all hover:bg-blue-50/80">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Precio Promedio
              </div>
              <div className="text-2xl font-black text-blue-700">$64.160</div>
              <div className="text-[10px] text-blue-500 font-bold mt-1">Media de las tiendas</div>
            </div>
            <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-4 transition-all hover:bg-rose-50/80">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Precio Máximo
              </div>
              <div className="text-2xl font-black text-rose-700">$67.500</div>
              <div className="text-[10px] text-rose-500 font-bold mt-1">Tienda más cara</div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCKUP_RESULTS.map((r, i) => {
              return (
                <div
                  key={i}
                  className={`bg-white rounded-2xl border flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-2 hover:shadow-[0_20px_35px_-10px_rgba(15,23,42,0.12)] ${
                    r.isCheapest
                      ? "border-emerald-500 ring-4 ring-emerald-50"
                      : "border-[var(--color-slate-200)] hover:border-blue-400"
                  }`}
                >
                  {/* Card Image area */}
                  <div className="p-5 border-b border-[var(--color-slate-100)] relative flex items-center justify-center min-h-[160px] bg-[var(--color-slate-50)] overflow-hidden">
                    {/* Store badge */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur border border-[var(--color-slate-200)] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-[var(--shadow-xs)] z-10">
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${r.domain}`}
                        alt={r.store}
                        className="w-4 h-4 rounded-sm object-contain"
                      />
                      <span className="text-[10px] font-bold text-[var(--color-slate-700)] tracking-tight">{r.store}</span>
                    </div>

                    {/* Stock badge */}
                    <div className="absolute top-4 right-4 z-10">
                      {r.stock ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200 uppercase">
                          Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full border border-rose-200 uppercase">
                          Agotado
                        </span>
                      )}
                    </div>

                    {/* Generated Perfume Mockup Image */}
                    <div className="relative w-24 h-24 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                      <div className="absolute w-16 h-16 bg-blue-600/5 rounded-full blur-xl group-hover:bg-blue-600/10 transition-colors" />
                      <img 
                        src="/images/sauvage_mockup.png" 
                        alt={r.title}
                        className="h-24 object-contain relative z-10 drop-shadow-md"
                      />
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider block">
                        {r.brand}
                      </span>
                      <h3 className="font-display font-bold text-[var(--color-slate-900)] text-sm line-clamp-2 leading-snug group-hover:text-[var(--color-primary-700)] transition-colors">
                        {r.title}
                      </h3>
                    </div>

                    <div className="pt-2">
                      <div className="text-2xl font-extrabold text-[#047857] tracking-tight leading-none">
                        ${r.price.toLocaleString("es-CL")}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="p-5 pt-0">
                    <div className="w-full h-10 bg-[var(--color-slate-100)] text-[var(--color-slate-700)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[var(--color-primary-600)] hover:text-white transition-all shadow-sm">
                      Ver en tienda
                      <ExternalLink size={12} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA at the bottom */}
          <div className="mt-8 text-center border-t border-[var(--color-slate-100)] pt-6">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold rounded-xl text-sm transition-all shadow hover:shadow-md cursor-pointer hover:scale-105 transform duration-200"
            >
              Buscar en tiempo real
              <ArrowRight size={16} />
            </Link>
            <p className="mt-2 text-xs text-[var(--color-slate-400)]">
              Sin tarjeta de crédito · Cancela cuando quieras · 10 búsquedas gratis
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing Trust Signals ─────────────────────────────────────────────────────
export function PricingTrustSignals() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
      {[
        { icon: ShieldCheck, text: "Sin tarjeta de crédito requerida" },
        { icon: Bell, text: "Cancela cuando quieras" },
        { icon: Check, text: "Plan gratuito permanente" },
      ].map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-center gap-1.5 text-sm text-[var(--color-slate-500)]">
          <Icon size={15} className="text-emerald-500 flex-shrink-0" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "¿Qué tipo de tiendas compara PriceScout?",
    a: "Actualmente monitoreamos tiendas especializadas en perfumería y cosméticos en Chile: Perfumisimo, Elite Perfumes, Alisha Perfumes, Silk Perfumes, MultiMarcas, Alarab, Sairam, JoyPerfumes, ParisPerfumes, Lodoro, Yauras, ComprarenChile, Mundo Aromas y Productos de Lujo. El catálogo se actualiza constantemente.",
  },
  {
    q: "¿Los precios son en tiempo real?",
    a: "Sí. Cuando realizas una búsqueda, nuestro motor consulta las tiendas en ese momento. No mostramos precios guardados en caché, lo que garantiza que el valor que ves es el actual.",
  },
  {
    q: "¿Necesito configurar algo para buscar?",
    a: "No. Solo escribes el nombre del producto y nuestro motor descubre en qué tiendas está disponible de forma automática. Sin URLs, sin seleccionar tiendas, sin configuración previa.",
  },
  {
    q: "¿Puedo usar PriceScout sin crear una cuenta?",
    a: "Sí. Los visitantes pueden realizar hasta 5 búsquedas gratuitas sin registrarse. Para búsquedas ilimitadas, historial y alertas de precio, solo necesitas crear una cuenta (es gratis).",
  },
  {
    q: "¿Cómo funcionan las alertas de precio?",
    a: "Guardas un producto de interés y defines un umbral de precio. Cuando el valor cae por debajo de ese umbral en cualquier tienda monitoreada, recibes un correo automático.",
  },
  {
    q: "¿Puedo cancelar mi suscripción en cualquier momento?",
    a: "Sí. No hay contratos ni cargos por cancelación. Si cancelas, mantienes acceso al plan pagado hasta el fin del período facturado.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <section className="py-20 px-6 bg-[var(--background)]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--color-slate-900)] tracking-tight mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-[var(--color-slate-500)] text-lg">
            Todo lo que necesitas saber antes de empezar.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all ${
                  isOpen
                    ? "border-[var(--color-primary-300)] bg-white shadow-[var(--shadow-sm)]"
                    : "border-[var(--color-slate-200)] bg-white hover:border-[var(--color-slate-300)]"
                }`}
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <span className="font-semibold text-sm md:text-base text-[var(--color-slate-900)]">
                    {item.q}
                  </span>
                  <span className={`flex-shrink-0 transition-transform ${isOpen ? "text-[var(--color-primary-600)]" : "text-[var(--color-slate-400)]"}`}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-[var(--color-slate-600)] font-body leading-relaxed border-t border-[var(--color-slate-100)] pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Newsletter Block ───────────────────────────────────────────────────────────
export function NewsletterBlock() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    // TODO: Integrate with your preferred email marketing service (Resend, Mailchimp, etc.)
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <section className="py-20 px-6 bg-[var(--color-slate-900)]">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-widest mb-6">
          <Bell size={12} className="animate-ring-bell" />
          Novedades y ofertas
        </div>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight mb-4">
          Sé el primero en enterarte
        </h2>
        <p className="text-[var(--color-slate-400)] text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          Alertas de nuevas tiendas integradas, funciones exclusivas y los mejores precios del mercado directamente en tu correo.
        </p>

        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
            <Check size={20} />
            ¡Listo! Te avisamos cuando haya novedades.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-[var(--color-slate-400)] text-sm font-body outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)] text-white font-bold rounded-xl text-sm transition-all shadow hover:shadow-md cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {loading ? "Suscribiendo..." : "Suscribirme"}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-[var(--color-slate-500)]">
          Sin spam. Puedes darte de baja en cualquier momento.
        </p>
      </div>
    </section>
  );
}
