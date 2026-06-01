import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ResultsView } from "@/components/organisms/results-view";

export default async function CompareResultPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch results from DB directly
  const { data: results, error } = await supabase
    .from("price_results")
    .select("*")
    .eq("comparison_job_id", jobId)
    .order("price", { ascending: true });

  if (error) {
    console.error("Error fetching results:", error);
    return (
      <div className="p-8 text-center text-red-500">
        Error al cargar los resultados de la base de datos.
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-4">No se encontraron resultados</h2>
        <p className="text-slate-500 mb-6">El trabajo aún se está procesando o falló.</p>
        <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-md transition-all duration-150 h-10 px-4 text-sm bg-[var(--color-primary-700)] text-white hover:bg-[var(--color-primary-600)] cursor-pointer">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const validPrices = results.filter(r => r.price > 0 && r.in_stock !== false).map(r => r.price);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
  const highestPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;
  
  const savings = (highestPrice && lowestPrice && highestPrice > lowestPrice) ? highestPrice - lowestPrice : 0;
  const savingsPercentage = highestPrice ? Math.round((savings / highestPrice) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="mb-8">
        <Link 
          href="/compare/new"
          className="inline-flex items-center gap-2 font-medium text-sm rounded-md transition-all duration-150 h-10 px-4 mb-6 -ml-4 bg-transparent text-[var(--color-slate-500)] hover:bg-[var(--color-primary-50)] cursor-pointer"
        >
          <ArrowLeft size={16} />
          Nueva Comparación
        </Link>
        <h1 className="font-display text-3xl font-bold text-[var(--color-slate-900)] mb-2">
          Resultados de Comparación
        </h1>
        <p className="text-[var(--color-slate-600)]">
          Hemos analizado {results.length} enlace{results.length !== 1 ? 's' : ''} en tiempo real.
        </p>
      </div>

      {savings > 0 && results.length > 1 && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-[var(--radius-lg)] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h3 className="text-green-800 font-bold text-lg flex items-center gap-2">
              <span className="text-2xl">💰</span> ¡Puedes ahorrar hasta {savingsPercentage}%!
            </h3>
            <p className="text-green-700 mt-1">
              La diferencia entre la opción más cara y la más barata es de <strong>${savings.toLocaleString('es-CL')}</strong>.
            </p>
          </div>
        </div>
      )}

      <ResultsView results={results} lowestPrice={lowestPrice} />
    </div>
  );
}
