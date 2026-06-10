"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function DashboardSearchForm() {
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryClean = query.trim();
    if (!queryClean) {
      toast.error("Por favor, ingresa el nombre de un producto");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Iniciando búsqueda inteligente...");
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      
      // Perform authenticated search so it maps to user_id
      const response = await fetch(`${apiUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { "Authorization": `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ query: queryClean })
      });

      if (!response.ok) {
        throw new Error("Error de conexión con el motor de scraping");
      }

      const data = await response.json();
      
      if (data.search_id) {
        toast.success("Búsqueda iniciada con éxito", { id: toastId });
        router.push(`/search/${data.search_id}`);
      } else {
        throw new Error("ID de búsqueda no recibido");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar la búsqueda", { id: toastId });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-2xl border border-white/20 shadow-[var(--shadow-sm)] focus-within:ring-2 focus-within:ring-white/30 transition-all max-w-2xl">
      <div className="flex-1 flex items-center gap-3 px-3 min-h-[44px]">
        <Search size={18} className="text-[var(--color-slate-400)] flex-shrink-0" />
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="¿Qué quieres buscar hoy? Ej: Zapatillas Nike, Cafetera..."
          className="w-full bg-transparent border-0 outline-none text-[var(--color-slate-900)] font-body text-sm placeholder-[var(--color-slate-400)] min-h-[36px]"
          disabled={isLoading}
        />
      </div>
      <button 
        type="submit"
        disabled={isLoading}
        className="sm:px-6 py-2.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
      >
        {isLoading ? (
          "Buscando..."
        ) : (
          <>
            Buscar
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
