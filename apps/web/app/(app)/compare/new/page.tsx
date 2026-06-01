"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Search } from "lucide-react";

export default function NewComparisonPage() {
  const [urls, setUrls] = React.useState<string[]>([""]);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const addUrlField = () => {
    if (urls.length < 5) {
      setUrls([...urls, ""]);
    } else {
      toast.error("Puedes agregar un máximo de 5 enlaces a la vez.");
    }
  };

  const removeUrlField = (index: number) => {
    if (urls.length > 1) {
      const newUrls = [...urls];
      newUrls.splice(index, 1);
      setUrls(newUrls);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urlList = urls.map(u => u.trim()).filter(Boolean);
    
    if (urlList.length === 0) {
      toast.error("Ingresa al menos un enlace válido");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error("No tienes una sesión activa");
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/api/v1/jobs/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ urls: urlList })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al encolar el trabajo");
      }

      const data = await response.json();
      
      if (data.job_ids && data.job_ids.length > 0) {
        toast.success("Trabajo iniciado con éxito");
        router.push(`/compare/${data.job_ids[0]}/loading`);
      } else {
        throw new Error("No se devolvió un ID de trabajo válido");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la solicitud");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold text-[var(--color-slate-900)] mb-4">
          Nueva Comparación
        </h1>
        <p className="text-[var(--color-slate-600)] font-body text-lg">
          Añade los enlaces de los productos que quieres comparar (cualquier tienda).
        </p>
      </div>

      <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-slate-200)] p-8 shadow-[var(--shadow-sm)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-[var(--color-slate-700)]">
              Enlaces a Comparar
            </label>
            
            {urls.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  placeholder="https://ejemplo.com/producto..."
                  className="flex-1 h-12 px-4 bg-[var(--color-slate-50)] border border-[var(--color-slate-200)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] transition-shadow text-sm"
                  disabled={isLoading}
                />
                {urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUrlField(index)}
                    disabled={isLoading}
                    className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-[var(--radius-md)] border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar enlace"
                  >
                    ✕
                  </button>
                )}
                {index === urls.length - 1 && urls.length < 5 && (
                  <button
                    type="button"
                    onClick={addUrlField}
                    disabled={isLoading}
                    className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-[var(--radius-md)] border border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Añadir otro enlace"
                  >
                    ＋
                  </button>
                )}
              </div>
            ))}
            
            <p className="text-xs text-[var(--color-slate-500)] mt-2">
              Puedes agregar hasta 5 enlaces. El motor híbrido detectará la tienda automáticamente.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--color-slate-100)]">
            <Button 
              type="submit" 
              disabled={isLoading}
              size="lg"
              className="w-full sm:w-auto font-bold"
            >
              {isLoading ? "Iniciando..." : (
                <>
                  <Search className="mr-2" size={18} />
                  Analizar Precio
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
