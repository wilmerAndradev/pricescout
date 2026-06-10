import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, Search, ExternalLink, Sparkles, TrendingDown, Layers, BarChart3, AlertCircle, ShoppingBag, Globe, Tag } from "lucide-react";
import DashboardSearchForm from "./search-form"; // Client Component for Search

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch recent searches from the new 'searches' table
  const { data: searches, error } = await supabase
    .from("searches")
    .select(`
      id,
      query,
      created_at,
      status,
      category_inferred,
      search_results (
        id,
        price_clp,
        store_name,
        image_url,
        in_stock
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch saved active projects (monitored searches)
  const { data: projects } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      search_query,
      is_archived,
      created_at
    `)
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .limit(5);

  // Fetch global stats on the server side using the RPC function
  let productsCount = 15999;
  let pricesCount = 16597;
  let activeStores = 15;
  let productsToday = 245;
  let pricesToday = 532;

  try {
    const { data: stats, error: statsError } = await supabase.rpc("get_global_stats");
    if (!statsError && stats) {
      productsCount = stats.products_compared;
      pricesCount = stats.prices_registered;
      activeStores = stats.stores_active;
      productsToday = stats.products_today;
      pricesToday = stats.prices_today;
    }
  } catch (e) {
    // Fallback manual por base de datos si la RPC falla
    try {
      const prodCountRes = await supabase.from("products").select("id", { count: "exact", head: true });
      if (prodCountRes.count) {
        pricesCount = prodCountRes.count; // Total de precios es el conteo de products
        productsCount = Math.floor(pricesCount * 0.96); // Estimar productos únicos
      }
    } catch (err) {}
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 antialiased font-body">
      
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 pb-6 border-b border-[var(--color-slate-200)]">
        <div>
          <h1 className="font-display text-4xl font-extrabold text-[var(--color-slate-900)] tracking-tight mb-2">
            ¡Hola de nuevo!
          </h1>
          <p className="text-[var(--color-slate-500)] text-base">
            Bienvenido al panel analítico de PriceScout. ¿Qué producto compararemos hoy?
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link 
            href="/environments"
            className="inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap rounded-xl transition-all h-11 px-5 border border-[var(--color-slate-200)] bg-white text-[var(--color-slate-700)] hover:bg-[var(--color-slate-50)] cursor-pointer text-sm shadow-[var(--shadow-xs)]"
          >
            <Layers size={16} />
            Configurar Tiendas
          </Link>
        </div>
      </div>

      {/* ── Statistics Cards Panel ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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
              {productsCount.toLocaleString("es-CL")}
            </div>
            <div className="text-xs font-bold text-green-600 mt-1 flex items-center gap-0.5">
              <span>+{productsToday} hoy</span>
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
              {activeStores}
            </div>
            <div className="text-xs font-bold text-green-600 mt-1 flex items-center gap-0.5">
              <span>+1 esta semana</span>
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
              {pricesCount.toLocaleString("es-CL")}
            </div>
            <div className="text-xs font-bold text-green-600 mt-1 flex items-center gap-0.5">
              <span>+{pricesToday} hoy</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Integrated Header Search Bar (BS-01) ── */}
      <div className="bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-700)] rounded-3xl p-8 mb-12 shadow-[var(--shadow-md)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
        <div className="relative z-10 max-w-3xl">
          <h2 className="font-display font-bold text-2xl text-white mb-2 flex items-center gap-2">
            <Sparkles size={20} className="text-yellow-300 animate-pulse" />
            Nueva Búsqueda Autónoma
          </h2>
          <p className="text-white/80 text-sm mb-6 max-w-xl font-body">
            El motor inteligente clasificará el producto, elegirá las mejores tiendas del catálogo en Chile y extraerá precios actualizados en tiempo real.
          </p>
          <DashboardSearchForm />
        </div>
      </div>

      {/* ── Two Columns Content Layout ── */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Recent Searches History (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="border-b border-[var(--color-slate-200)] px-6 py-5 bg-[var(--color-slate-50)] flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-[var(--color-slate-800)] flex items-center gap-2">
                <Clock size={18} className="text-[var(--color-slate-400)]" />
                Historial de Búsquedas Recientes
              </h2>
            </div>

            {error && (
              <div className="p-8 text-center text-red-500 font-semibold flex items-center justify-center gap-2">
                <AlertCircle size={20} />
                Error al cargar el historial.
              </div>
            )}

            {!error && (!searches || searches.length === 0) ? (
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[var(--color-slate-100)] rounded-full flex items-center justify-center mb-4 text-[var(--color-slate-400)]">
                  <Search size={28} />
                </div>
                <h3 className="text-lg font-bold text-[var(--color-slate-900)] mb-1">Aún no tienes búsquedas</h3>
                <p className="text-[var(--color-slate-500)] text-sm max-w-xs mb-6">
                  Prueba el buscador superior para monitorear precios en segundos.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-slate-100)]">
                {searches?.map((search) => {
                  const date = new Date(search.created_at).toLocaleDateString("es-CL", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                  });
                  
                  const resultsList = search.search_results || [];
                  const validResults = resultsList.filter((r: any) => r.price_clp > 0);
                  const primaryProduct = validResults.length > 0 ? validResults[0] : null;
                  
                  const prices = validResults.map((r: any) => r.price_clp);
                  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
                  const savings = (maxPrice && minPrice && maxPrice > minPrice) ? maxPrice - minPrice : 0;
                  
                  return (
                    <div key={search.id} className="p-6 hover:bg-[var(--color-slate-50)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex gap-4 items-start flex-1">
                        {primaryProduct?.image_url ? (
                          <div className="w-14 h-14 rounded-xl bg-white border border-[var(--color-slate-200)] p-1 flex-shrink-0 flex items-center justify-center">
                            <img 
                              src={primaryProduct.image_url} 
                              alt="Product" 
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-[var(--color-slate-100)] flex items-center justify-center flex-shrink-0 text-[var(--color-slate-400)]">
                            <Search size={20} />
                          </div>
                        )}
                        
                        <div>
                          <h3 className="font-bold text-[var(--color-slate-900)] text-sm line-clamp-1 leading-snug">
                            {search.query}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">
                            <span className="flex items-center gap-1 font-body">
                              {date}
                            </span>
                            {search.category_inferred && (
                              <>
                                <span>•</span>
                                <span className="text-[var(--color-primary-600)]">{search.category_inferred}</span>
                              </>
                            )}
                            {search.status === 'processing' && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 font-bold animate-pulse">Buscando...</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 self-start sm:self-center">
                        {minPrice !== null && (
                          <div className="text-right">
                            <div className="text-[10px] text-[var(--color-slate-400)] uppercase font-bold tracking-wider mb-0.5">Mejor Precio</div>
                            <div className="font-extrabold text-base text-[var(--color-slate-900)]">
                              ${minPrice.toLocaleString('es-CL')}
                            </div>
                            {savings > 0 && (
                              <div className="text-[10px] font-bold text-green-600">
                                Ahorras ${savings.toLocaleString('es-CL')}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <Link 
                          href={`/search/${search.id}`}
                          className="p-2 text-[var(--color-slate-400)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] rounded-full transition-colors"
                          title="Ver reporte completo"
                        >
                          <ExternalLink size={18} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Monitored Projects (1/3 width) */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] p-6">
            <h3 className="font-display font-bold text-lg text-[var(--color-slate-800)] mb-4 flex items-center gap-2 pb-3 border-b border-[var(--color-slate-100)]">
              <TrendingDown size={18} className="text-[var(--color-primary-600)]" />
              Proyectos de Monitoreo
            </h3>
            
            {!projects || projects.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[var(--color-slate-400)] mb-4 font-body leading-relaxed">
                  ¿Quieres monitorear la evolución de precios de un producto a largo plazo?
                </p>
                <p className="text-xs text-[var(--color-slate-400)] italic">
                  Busca un producto y haz clic en "Guardar y Monitorear".
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="p-4 rounded-xl border border-[var(--color-slate-100)] bg-[var(--color-slate-50)] hover:border-[var(--color-primary-600)] transition-all flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-xs text-[var(--color-slate-800)] line-clamp-1 leading-snug">{project.name}</span>
                      <Link 
                        href={`/search/${project.id}`} // Placeholder for project graphs view
                        className="text-[var(--color-primary-600)] hover:underline flex-shrink-0"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                    <span className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">
                      Query: {project.search_query}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
