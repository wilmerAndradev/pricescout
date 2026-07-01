"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  TrendingDown, 
  TrendingUp, 
  RefreshCw, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = React.useState<any>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Fetch project details and initial history
  async function loadProjectData() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      
      // 1. Get project details from Supabase
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("*, environments(name)")
        .eq("id", projectId)
        .single();
        
      if (projErr || !projData) {
        throw new Error("Proyecto no encontrado");
      }
      setProject(projData);

      // 2. Get history from FastAPI backend
      const response = await fetch(`${apiUrl}/projects/${projectId}/history`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error("Error al cargar historial");
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la información del proyecto");
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (projectId) {
      setTimeout(() => {
        loadProjectData();
      }, 0);
    }
  }, [projectId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const toastId = toast.loading("Actualizando precios de tiendas en tiempo real...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const response = await fetch(`${apiUrl}/projects/${projectId}/refresh`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail?.detail || errData.detail || "Error al refrescar proyecto");
      }

      const data = await response.json();
      setHistory(data.history || []);
      
      // Update last_refreshed_at in local state
      if (project) {
        setProject({
          ...project,
          last_refreshed_at: data.last_refreshed_at
        });
      }

      toast.success("Historial de precios actualizado con éxito", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar precios", { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Group history by extraction date for chart calculation
  const chartData = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    
    // Group items by exact date/time
    const grouped: Record<string, number[]> = {};
    history.forEach(item => {
      const dateStr = new Date(item.extracted_at).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(item.price_clp);
    });

    return Object.entries(grouped).map(([date, prices]) => ({
      date,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    }));
  }, [history]);

  // Render Premium SVG Chart
  const renderSVGChart = () => {
    if (chartData.length < 2) {
      return (
        <div className="h-64 flex flex-col items-center justify-center bg-[var(--color-slate-50)] border border-dashed border-[var(--color-slate-200)] rounded-2xl p-6 text-center">
          <BarChart3 className="w-10 h-10 text-[var(--color-slate-400)] mb-2" />
          <span className="text-sm font-semibold text-[var(--color-slate-600)]">Insuficientes datos para graficar tendencia</span>
          <p className="text-xs text-[var(--color-slate-400)] mt-1">Refresca los precios para capturar el primer punto del historial.</p>
        </div>
      );
    }

    const width = 800;
    const height = 240;
    const padding = 40;

    const minVal = Math.min(...chartData.map(d => d.minPrice)) * 0.95;
    const maxVal = Math.max(...chartData.map(d => d.minPrice)) * 1.05;
    const valueRange = maxVal - minVal;

    const points = chartData.map((d, idx) => {
      const x = padding + (idx / (chartData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.minPrice - minVal) / valueRange) * (height - padding * 2);
      return { x, y, data: d };
    });

    const pathD = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    
    // Gradient fill path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px] h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-100)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-primary-50)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding + ratio * (height - padding * 2);
            const val = Math.round(maxVal - ratio * valueRange);
            return (
              <g key={idx} className="opacity-40">
                <line 
                  x1={padding} 
                  y1={y} 
                  x2={width - padding} 
                  y2={y} 
                  stroke="var(--color-slate-200)" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={padding - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-[10px] fill-[var(--color-slate-400)] font-semibold font-mono"
                >
                  ${val.toLocaleString("es-CL")}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          <path d={areaD} fill="url(#chartGrad)" />

          {/* Trend line */}
          <path 
            d={pathD} 
            fill="none" 
            stroke="var(--color-primary-600)" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots & Labels */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="5" 
                className="fill-[var(--color-primary-600)] stroke-white stroke-[2.5] hover:r-7 transition-all" 
              />
              {/* Tooltip on hover */}
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                className="text-[10px] font-bold fill-[var(--color-slate-700)] opacity-0 group-hover:opacity-100 transition-opacity bg-white pointer-events-none"
              >
                ${p.data.minPrice.toLocaleString("es-CL")}
              </text>
              
              {/* X Axis Date labels (show subset to avoid clutter) */}
              {(idx === 0 || idx === points.length - 1 || points.length <= 5) && (
                <text 
                  x={p.x} 
                  y={height - 12} 
                  textAnchor="middle" 
                  className="text-[9px] fill-[var(--color-slate-400)] font-semibold font-body"
                >
                  {p.data.date.split(" ")[0]}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const getCheapestCurrent = () => {
    if (!history || history.length === 0) return null;
    
    // Sort history by extracted_at desc to find latest batch
    const sorted = [...history].sort((a, b) => new Date(b.extracted_at).getTime() - new Date(a.extracted_at).getTime());
    const latestTimestamp = sorted[0]?.extracted_at;
    
    // Filter items from that latest sync batch
    const latestBatch = sorted.filter(item => {
      const diff = Math.abs(new Date(item.extracted_at).getTime() - new Date(latestTimestamp).getTime());
      return diff < 60000; // within 1 minute
    });

    if (latestBatch.length === 0) return null;
    return latestBatch.reduce((min, item) => item.price_clp < min.price_clp ? item : min, latestBatch[0]);
  };

  const latestCheapest = getCheapestCurrent();

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 antialiased font-body min-h-screen">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-slate-500)] hover:text-[var(--color-primary-600)] transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al Dashboard
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="text-[var(--color-slate-500)] font-semibold">Cargando detalles del proyecto...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Project Banner */}
          <div className="bg-white rounded-3xl border border-[var(--color-slate-200)] p-6 md:p-8 shadow-[var(--shadow-sm)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                  Proyecto Activo
                </span>
                {project.environments?.name && (
                  <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Entorno: {project.environments.name}
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-extrabold text-[var(--color-slate-900)] tracking-tight">
                {project.name}
              </h1>
              <p className="text-xs text-[var(--color-slate-500)] font-semibold uppercase tracking-wider">
                Búsqueda: &ldquo;{project.search_query}&rdquo;
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-5 py-3 rounded-2xl bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Actualizar Precios Ahora
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-[var(--color-slate-100)] p-5 space-y-1">
              <span className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Mejor precio actual</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-display font-black text-green-600">
                  {latestCheapest ? `$${latestCheapest.price_clp.toLocaleString("es-CL")}` : "—"}
                </span>
                <span className="text-xs text-[var(--color-slate-400)]">CLP</span>
              </div>
              <p className="text-[10px] text-[var(--color-slate-500)] truncate">
                {latestCheapest ? `Encontrado en ${latestCheapest.store_domain}` : "Sin datos de scraping"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[var(--color-slate-100)] p-5 space-y-1">
              <span className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Frecuencia de monitoreo</span>
              <div className="flex items-center gap-2 text-2xl font-display font-black text-[var(--color-slate-800)]">
                <Clock size={20} className="text-[var(--color-primary-600)]" />
                <span>Cada {project.refresh_frequency_hours}h</span>
              </div>
              <p className="text-[10px] text-[var(--color-slate-500)]">Refresco automático del sistema</p>
            </div>

            <div className="bg-white rounded-2xl border border-[var(--color-slate-100)] p-5 space-y-1">
              <span className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Última actualización</span>
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-slate-700)] py-1">
                <Calendar size={16} className="text-[var(--color-slate-400)]" />
                <span>
                  {project.last_refreshed_at 
                    ? new Date(project.last_refreshed_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                    : "Nunca"
                  }
                </span>
              </div>
              <p className="text-[10px] text-[var(--color-slate-500)]">Límite manual de 1x por hora</p>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-3xl border border-[var(--color-slate-200)] p-6 md:p-8 shadow-[var(--shadow-sm)] space-y-6">
            <h3 className="font-display font-extrabold text-lg text-[var(--color-slate-900)] flex items-center gap-2">
              Historial de Tendencia de Precios
            </h3>
            {renderSVGChart()}
          </div>

          {/* Historical Data Table */}
          <div className="bg-white rounded-3xl border border-[var(--color-slate-200)] overflow-hidden shadow-[var(--shadow-sm)]">
            <div className="p-6 md:p-8 border-b border-[var(--color-slate-100)]">
              <h3 className="font-display font-extrabold text-lg text-[var(--color-slate-900)]">
                Registros de Precios por Tienda
              </h3>
              <p className="text-xs text-[var(--color-slate-400)] font-body mt-1">
                Listado completo de todas las capturas de precios y disponibilidad recopiladas.
              </p>
            </div>

            {history.length === 0 ? (
              <div className="py-20 text-center text-sm text-[var(--color-slate-500)] font-semibold">
                No hay registros en el historial de precios. Presiona &quot;Actualizar Precios Ahora&quot; para iniciar la recolección.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-[var(--color-slate-50)] border-b border-[var(--color-slate-100)] text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">
                      <th className="py-4 px-6">Tienda</th>
                      <th className="py-4 px-6 text-right">Precio Actual</th>
                      <th className="py-4 px-6 text-center">Estado de Stock</th>
                      <th className="py-4 px-6">Capturado el</th>
                      <th className="py-4 px-6 text-center">Enlace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-slate-100)] text-[var(--color-slate-700)] font-body">
                    {[...history].reverse().map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[var(--color-slate-50)/50] transition-colors">
                        <td className="py-4 px-6 font-bold flex items-center gap-2 text-[var(--color-slate-800)]">
                          <img 
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${item.store_domain}`} 
                            alt={item.store_domain}
                            className="w-4 h-4 rounded object-contain"
                          />
                          <span>{item.store_domain}</span>
                        </td>
                        <td className="py-4 px-6 text-right font-display font-bold text-[var(--color-slate-900)]">
                          ${item.price_clp.toLocaleString("es-CL")} CLP
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            item.in_stock 
                              ? "bg-green-50 text-green-700" 
                              : "bg-red-50 text-red-700"
                          }`}>
                            {item.in_stock ? "En Stock" : "Sin Stock"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[var(--color-slate-500)]">
                          {new Date(item.extracted_at).toLocaleString('es-CL')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {item.image_url ? (
                            <a 
                              href={item.image_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center justify-center p-1.5 text-[var(--color-slate-400)] hover:text-[var(--color-primary-600)] transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span className="text-[var(--color-slate-300)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
