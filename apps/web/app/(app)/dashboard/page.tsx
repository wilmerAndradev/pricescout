import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Clock, Search, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/utils/format-price";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch recent comparisons with their results
  const { data: jobs, error } = await supabase
    .from("comparison_jobs")
    .select(`
      id,
      created_at,
      total_urls,
      status,
      price_results (
        id,
        product_name,
        price,
        store_name,
        image_url,
        in_stock
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--color-slate-900)] mb-2">
            Tu Dashboard
          </h1>
          <p className="text-[var(--color-slate-600)] font-body text-lg">
            Historial de tus comparaciones recientes.
          </p>
        </div>
        
        <Link 
          href="/compare/new"
          className="inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-[var(--radius-md)] transition-all duration-150 h-11 px-6 bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] hover:shadow-md cursor-pointer"
        >
          <Plus size={18} />
          Nueva Comparación
        </Link>
      </div>

      <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="border-b border-[var(--color-slate-200)] px-6 py-4 bg-[var(--color-slate-50)]">
          <h2 className="font-semibold text-[var(--color-slate-800)] flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-slate-500)]" />
            Búsquedas Recientes
          </h2>
        </div>

        {error && (
          <div className="p-8 text-center text-red-500">
            Error al cargar el historial.
          </div>
        )}

        {!error && (!jobs || jobs.length === 0) ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--color-slate-100)] rounded-full flex items-center justify-center mb-4 text-[var(--color-slate-400)]">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-slate-900)] mb-2">Aún no tienes comparaciones</h3>
            <p className="text-[var(--color-slate-500)] max-w-sm mb-6">
              Comienza a ahorrar dinero comparando los precios de tus productos favoritos en múltiples tiendas chilenas.
            </p>
            <Link 
              href="/compare/new"
              className="text-[var(--color-primary-600)] font-semibold hover:underline"
            >
              Realizar mi primera búsqueda
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-slate-100)]">
            {jobs?.map((job) => {
              const date = new Date(job.created_at).toLocaleDateString("es-CL", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
              });
              
              // Find the primary product to display (usually the first result)
              const validResults = job.price_results || [];
              const primaryProduct = validResults.length > 0 ? validResults[0] : null;
              
              const prices = validResults.filter((r: any) => r.price > 0).map((r: any) => r.price);
              const minPrice = prices.length > 0 ? Math.min(...prices) : null;
              const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
              const savings = (maxPrice && minPrice && maxPrice > minPrice) ? maxPrice - minPrice : 0;
              
              return (
                <div key={job.id} className="p-6 hover:bg-[var(--color-slate-50)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-4 items-start flex-1">
                    {primaryProduct?.image_url ? (
                      <div className="w-16 h-16 rounded-md bg-white border border-[var(--color-slate-200)] p-1 flex-shrink-0">
                        <img 
                          src={primaryProduct.image_url} 
                          alt="Product" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-[var(--color-slate-100)] flex items-center justify-center flex-shrink-0 text-[var(--color-slate-400)]">
                        <Search size={24} />
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-semibold text-[var(--color-slate-900)] line-clamp-1">
                        {primaryProduct ? primaryProduct.product_name : "Búsqueda en proceso"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[var(--color-slate-500)]">
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {date}
                        </span>
                        <span>•</span>
                        <span>{job.total_urls} enlace{job.total_urls !== 1 ? 's' : ''}</span>
                        {job.status === 'pending' && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-medium animate-pulse">Procesando...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 self-start md:self-center">
                    {minPrice !== null && (
                      <div className="text-right">
                        <div className="text-xs text-[var(--color-slate-500)] uppercase font-semibold tracking-wider">Mejor Precio</div>
                        <div className="font-bold text-lg text-[var(--color-slate-900)]">
                          ${minPrice.toLocaleString('es-CL')}
                        </div>
                        {savings > 0 && (
                          <div className="text-xs font-semibold text-green-600">
                            Ahorras ${savings.toLocaleString('es-CL')}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Link 
                      href={`/compare/${job.id}`}
                      className="p-2 text-[var(--color-slate-400)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] rounded-full transition-colors"
                      title="Ver resultados completos"
                    >
                      <ExternalLink size={20} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
