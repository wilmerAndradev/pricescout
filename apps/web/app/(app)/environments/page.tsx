"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Layers, Check, Sparkles, HelpCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const KNOWN_STORES = [
  { domain: "cosmetic.cl", name: "Cosmetic" },
  { domain: "comprarenchile.cl", name: "ComprarenChile" },
  { domain: "eliteperfumes.cl", name: "Elite Perfumes" },
  { domain: "lodoro.cl", name: "Lodoro" },
  { domain: "multimarcasperfumes.cl", name: "MultiMarcas Perfumes" },
  { domain: "mundoaromas.cl", name: "Mundo Aromas" },
  { domain: "perfumisimo.cl", name: "Perfumisimo" },
  { domain: "productosdelujo.cl", name: "Productos de Lujo" },
  { domain: "silkperfumes.cl", name: "Silk Perfumes" },
  { domain: "yauras.cl", name: "Yauras" },
  { domain: "alarab.cl", name: "Alarab" },
  { domain: "alishaperfumes.cl", name: "Alisha Perfumes" },
  { domain: "parisperfumes.cl", name: "ParisPerfumes" },
  { domain: "sairam.cl", name: "Sairam" },
  { domain: "joyperfumes.cl", name: "JoyPerfumes" }
];

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Form State
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedEnv, setSelectedEnv] = React.useState<any>(null);
  const [name, setName] = React.useState("");
  const [mode, setMode] = React.useState("autonomous"); // "autonomous" | "manual"
  const [activeStores, setActiveStores] = React.useState<string[]>([]);
  const [customDomainsInput, setCustomDomainsInput] = React.useState("");

  React.useEffect(() => {
    fetchEnvironments();
  }, []);

  const fetchEnvironments = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/search/environments`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error("Failed to fetch environments");
      const data = await response.json();
      setEnvironments(data || []);
      
      if (data && data.length > 0) {
        selectEnvironment(data[0]);
      }
    } catch (err: any) {
      toast.error("Error al cargar entornos");
    } finally {
      setIsLoading(false);
    }
  };

  const selectEnvironment = (env: any) => {
    setSelectedEnv(env);
    setName(env.name);
    setMode(env.mode);
    setActiveStores(env.store_domains || []);
    setCustomDomainsInput((env.custom_domains || []).join(", "));
  };

  const handleCreateNew = () => {
    setSelectedEnv(null);
    setName("Nuevo Entorno");
    setMode("autonomous");
    setActiveStores(KNOWN_STORES.map(s => s.domain));
    setCustomDomainsInput("");
  };

  const toggleStore = (domain: string) => {
    if (activeStores.includes(domain)) {
      setActiveStores(activeStores.filter(d => d !== domain));
    } else {
      setActiveStores([...activeStores, domain]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre del entorno es requerido");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Guardando configuración...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      
      const custom_domains = customDomainsInput
        .split(",")
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);

      const payload = {
        name,
        mode,
        store_domains: activeStores,
        custom_domains
      };

      let response;
      if (selectedEnv) {
        // Update existing
        response = await fetch(`${apiUrl}/search/environments/${selectedEnv.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new
        response = await fetch(`${apiUrl}/search/environments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) throw new Error("Failed to save environment");
      
      toast.success("Entorno guardado correctamente", { id: toastId });
      fetchEnvironments();
    } catch (err: any) {
      toast.error("Error al guardar el entorno", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEnv) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este entorno?")) return;

    const toastId = toast.loading("Eliminando entorno...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      
      const response = await fetch(`${apiUrl}/search/environments/${selectedEnv.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error("Failed to delete");
      
      toast.success("Entorno eliminado con éxito", { id: toastId });
      setSelectedEnv(null);
      fetchEnvironments();
    } catch (err: any) {
      toast.error("Error al eliminar", { id: toastId });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 antialiased font-body min-h-screen">
      {/* ── Breadcrumb ── */}
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-slate-500)] hover:text-[var(--color-primary-600)] transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al Dashboard
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-10 pb-6 border-b border-[var(--color-slate-200)]">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center">
          <Layers size={20} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--color-slate-900)] tracking-tight">
            Configuración de Entornos de Tiendas
          </h1>
          <p className="text-[var(--color-slate-500)] text-sm">
            Controla exactamente en qué e-commerce buscará el motor por defecto en tus consultas.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="text-[var(--color-slate-500)] font-semibold">Cargando tus configuraciones...</span>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column: Environments list */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-[var(--color-slate-200)] p-6 shadow-[var(--shadow-sm)] h-fit flex flex-col gap-4">
            <h3 className="font-display font-bold text-base text-[var(--color-slate-800)] flex items-center justify-between border-b border-[var(--color-slate-100)] pb-3">
              Mis Entornos
              <button 
                onClick={handleCreateNew}
                className="w-8 h-8 rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-600)] hover:bg-[var(--color-primary-100)] flex items-center justify-center transition-colors cursor-pointer"
                title="Nuevo Entorno"
              >
                <Plus size={16} />
              </button>
            </h3>

            {environments.length === 0 ? (
              <p className="text-sm text-[var(--color-slate-400)] text-center py-6">
                No tienes entornos configurados. Crea uno nuevo arriba.
              </p>
            ) : (
              <div className="space-y-2">
                {environments.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => selectEnvironment(env)}
                    className={`w-full text-left p-3.5 rounded-xl border font-semibold text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                      selectedEnv?.id === env.id 
                        ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] shadow-[var(--shadow-xs)]" 
                        : "border-[var(--color-slate-100)] bg-[var(--color-slate-50)] hover:bg-[var(--color-slate-100)] text-[var(--color-slate-700)]"
                    }`}
                  >
                    <span>{env.name}</span>
                    <span className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">
                      Modo: {env.mode === "autonomous" ? "Autónomo" : "Manual"} • {env.store_domains?.length || 0} Tiendas
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Environment details form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="p-6 border-b border-[var(--color-slate-200)] bg-[var(--color-slate-50)] flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-[var(--color-slate-800)]">
                  {selectedEnv ? `Editar: ${selectedEnv.name}` : "Nuevo Entorno de Búsqueda"}
                </h3>
                {selectedEnv && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar Entorno"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="p-6 space-y-6">
                {/* 1. Environment Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[var(--color-slate-700)]">
                    Nombre del Entorno
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Mi Entorno de Perfumerías..."
                    className="w-full h-11 px-4 bg-[var(--color-slate-50)] border border-[var(--color-slate-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] text-sm"
                    disabled={isSaving}
                  />
                </div>

                {/* 2. Mode Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[var(--color-slate-700)] flex items-center gap-1.5">
                    Modo del Entorno
                    <span title="Autónomo: PriceScout selecciona dinámicamente las tiendas relevantes de tu lista activa según el tipo de producto. Manual: Busca estrictamente en todas las tiendas activas sin importar la categoría.">
                      <HelpCircle size={14} className="text-[var(--color-slate-400)] cursor-help" />
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setMode("autonomous")}
                      className={`p-4 border rounded-xl font-semibold text-xs flex flex-col gap-1 cursor-pointer transition-all ${
                        mode === "autonomous"
                          ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                          : "border-[var(--color-slate-200)] bg-white text-[var(--color-slate-500)]"
                      }`}
                      disabled={isSaving}
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <Sparkles size={14} /> Modo Autónomo
                      </span>
                      <span className="text-[10px] opacity-80 font-normal">
                        Rastreo dinámico inteligente según el producto
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("manual")}
                      className={`p-4 border rounded-xl font-semibold text-xs flex flex-col gap-1 cursor-pointer transition-all ${
                        mode === "manual"
                          ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                          : "border-[var(--color-slate-200)] bg-white text-[var(--color-slate-500)]"
                      }`}
                      disabled={isSaving}
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <Layers size={14} /> Modo Manual
                      </span>
                      <span className="text-[10px] opacity-80 font-normal">
                        Rastrea estrictamente en todas tus tiendas activas
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Catalog Stores checkboxes */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-[var(--color-slate-700)]">
                    Tiendas Activas del Catálogo Chile
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {KNOWN_STORES.map((store) => {
                      const isActive = activeStores.includes(store.domain);
                      return (
                        <button
                          type="button"
                          key={store.domain}
                          onClick={() => toggleStore(store.domain)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            isActive
                              ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                              : "border-[var(--color-slate-100)] bg-[var(--color-slate-50)] text-[var(--color-slate-600)] opacity-70"
                          }`}
                          disabled={isSaving}
                        >
                          <img 
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${store.domain}`} 
                            alt={store.name}
                            className="w-4 h-4 rounded object-contain"
                          />
                          <span className="flex-1 text-left truncate">{store.name}</span>
                          {isActive && <Check size={14} className="stroke-[3] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Custom domains for Business Plan */}
                <div className="space-y-2 pt-4 border-t border-[var(--color-slate-100)]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block text-sm font-bold text-[var(--color-slate-700)] flex items-center gap-1.5">
                      Tiendas Personalizadas Adicionales (Exclusivo Business)
                    </label>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Business
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-slate-400)] leading-relaxed font-body mb-3">
                    Ingresa los dominios de cualquier sitio e-commerce que NO esté en el catálogo principal, separados por coma (ej: `eliteperfumes.cl, aromas.cl`). Nuestro motor de IA se encargará de extraer la información de forma universal.
                  </p>
                  <input
                    type="text"
                    value={customDomainsInput}
                    onChange={(e) => setCustomDomainsInput(e.target.value)}
                    placeholder="ejemplo.cl, mi-competencia.cl..."
                    className="w-full h-11 px-4 bg-[var(--color-slate-50)] border border-[var(--color-slate-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] text-sm"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-6 bg-[var(--color-slate-50)] border-t border-[var(--color-slate-200)] flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap rounded-xl transition-all h-11 px-6 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-[var(--shadow-sm)] hover:shadow-md cursor-pointer disabled:opacity-50 text-sm"
                >
                  <Save size={16} />
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
