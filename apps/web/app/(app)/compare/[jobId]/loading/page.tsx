"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgressPanel } from "@/components/organisms/progress-panel";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoadingJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!jobId) return;

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("Sesión no válida");
          return;
        }

        const res = await fetch(`http://127.0.0.1:8000/api/v1/jobs/${jobId}`, {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        });

        if (!res.ok) {
          throw new Error("Error al consultar estado");
        }

        const data = await res.json();

        if (data.progress) {
          setProgress(data.progress);
        }

        if (data.status === "SUCCESS") {
          clearInterval(intervalId);
          toast.success("Extracción completada");
          router.push(`/compare/${jobId}`);
        } else if (data.status === "FAILURE") {
          clearInterval(intervalId);
          setError("El scraper falló: " + (data.error || "Error desconocido"));
        }
      } catch (err: any) {
        console.error(err);
      }
    };

    // Poll every 3 seconds
    checkStatus();
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, [jobId, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-red-50 text-red-600 p-8 rounded-[var(--radius-lg)] border border-red-200 text-center max-w-2xl w-full">
          <h2 className="text-xl font-bold mb-2">Error en la extracción</h2>
          <p className="whitespace-pre-wrap break-all text-xs text-left bg-white/60 p-4 rounded-md border border-red-100 overflow-auto max-h-64 mt-4 shadow-inner font-mono">
            {error}
          </p>
          <button 
            onClick={() => router.push('/compare/new')}
            className="mt-6 px-6 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors font-semibold"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-12">
      <ProgressPanel progressText={progress} />
    </div>
  );
}
