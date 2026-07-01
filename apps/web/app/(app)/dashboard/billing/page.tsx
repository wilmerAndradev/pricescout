"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, ShieldCheck, AlertCircle, Calendar, MessageSquare, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// Configura tu número de WhatsApp aquí (con código de país sin el símbolo +)
// Ejemplo: "569XXXXXXXX" para Chile
const WHATSAPP_CONTACT_NUMBER = "56973790009";

const PLANS_DATA = [
  {
    key: "starter",
    name: "Starter",
    description: "Para compradores inteligentes que quieren monitorear ofertas diarias.",
    priceMonthly: 4990,
    priceYearly: 47904,
    features: [
      "100 búsquedas al mes",
      "Hasta 10 tiendas por búsqueda",
      "Monitoreo de 5 proyectos",
      "Actualización de precios 1x al día",
      "Historial de precios de 30 días",
      "Exportación en formato CSV"
    ]
  },
  {
    key: "pro",
    name: "Pro",
    description: "Ideal para coleccionistas, revendedores o compradores frecuentes.",
    priceMonthly: 12990,
    priceYearly: 124704,
    popular: true,
    features: [
      "Búsquedas mensuales ILIMITADAS",
      "Hasta 20 tiendas por búsqueda",
      "Monitoreo de 50 proyectos",
      "Actualización cada 6 horas",
      "Historial de precios de 1 año",
      "Exportación en Excel y PDF",
      "Configuración de alertas de precio",
      "Soporte prioritario 24/7"
    ]
  },
  {
    key: "business",
    name: "Business",
    description: "SaaS de inteligencia competitiva para marcas, distribuidoras y tiendas.",
    priceMonthly: 29990,
    priceYearly: 287904,
    features: [
      "Búsquedas mensuales ILIMITADAS",
      "Sin límite de tiendas por búsqueda",
      "Proyectos de monitoreo ILIMITADOS",
      "Actualización ultra rápida cada 2 horas",
      "Historial de precios completo (3 años)",
      "Tiendas y dominios personalizados adicionales",
      "Alertas avanzadas vía Webhook/Slack",
      "Acceso API para integraciones externas",
      "Account Manager dedicado"
    ]
  }
];

export default function BillingPage() {
  const [billingStatus, setBillingStatus] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAnnual, setIsAnnual] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  async function fetchBillingStatus() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/billing/status`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error("Failed to fetch billing status");
      const data = await response.json();
      setBillingStatus(data);
      
      // Auto-detect billing interval from current subscription if active
      if (data.subscription?.plan_id) {
        setIsAnnual(data.subscription.plan_id.includes("yearly") || data.subscription.plan_id.includes("year"));
      }
    } catch (err: any) {
      toast.error("Error al cargar la información de facturación");
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    setTimeout(() => {
      fetchBillingStatus();
    }, 0);
  }, []);

  const handleSubscribe = async (planKey: string) => {
    const planName = planKey === "starter" ? "Starter" : planKey === "pro" ? "Pro" : "Business";
    const intervalText = isAnnual ? "Anual" : "Mensual";
    const text = encodeURIComponent(
      `Hola, me interesa activar el plan ${planName} ${intervalText} en PriceScout. ¿Me podrías indicar los datos para realizar la transferencia bancaria?`
    );
    window.open(`https://wa.me/${WHATSAPP_CONTACT_NUMBER}?text=${text}`, "_blank");
  };

  const handleCancelSubscription = async () => {
    if (!confirm("¿Seguro que deseas cancelar tu suscripción? Tu plan seguirá activo hasta el término de tu período de facturación actual.")) return;
    
    setIsProcessing("cancel");
    const toastId = toast.loading("Cancelando suscripción...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const response = await fetch(`${apiUrl}/billing/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error("Error en la cancelación");
      
      toast.success("Suscripción cancelada con éxito", { id: toastId });
      fetchBillingStatus();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar cancelación", { id: toastId });
    } finally {
      setIsProcessing(null);
    }
  };

  const currentPlanId = billingStatus?.plan?.id || "gratis";
  const normalizedCurrentPlanId = currentPlanId.replace("_monthly", "").replace("_yearly", "").toLowerCase();

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

      {/* Header */}
      <div className="flex items-center gap-3 mb-10 pb-6 border-b border-[var(--color-slate-200)]">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center">
          <CreditCard size={20} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--color-slate-900)] tracking-tight">
            Planes y Facturación
          </h1>
          <p className="text-[var(--color-slate-500)] text-sm">
            Gestiona tu plan comercial, límites de búsqueda y solicita la activación rápida de planes premium.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="text-[var(--color-slate-500)] font-semibold">Cargando información de planes...</span>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active subscription card */}
          <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-6 md:p-8 shadow-[var(--shadow-sm)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Plan Actual</span>
                <span className="px-2.5 py-1 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] text-xs font-extrabold rounded-lg uppercase">
                  {billingStatus?.plan?.name || "Gratis"}
                </span>
              </div>
              <h2 className="text-xl font-display font-extrabold text-[var(--color-slate-900)]">
                {normalizedCurrentPlanId === "gratis" 
                  ? "Disfruta de búsquedas de prueba sin costo" 
                  : `Suscripción ${billingStatus.subscription?.cancel_at_period_end ? "Cerrada" : "Activa"}`
                }
              </h2>
              {normalizedCurrentPlanId !== "gratis" && billingStatus?.subscription?.current_period_end && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-slate-500)]">
                  <Calendar size={14} />
                  <span>
                    {billingStatus.subscription.cancel_at_period_end 
                      ? "Vence el: " 
                      : "Próximo cobro: "
                    }
                    <strong>{new Date(billingStatus.subscription.current_period_end).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </span>
                </div>
              )}
              {/* Usage meter */}
              <div className="pt-2 w-full max-w-sm space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[var(--color-slate-600)]">
                  <span>Búsquedas consumidas</span>
                  <span>
                    {billingStatus?.usage?.searches_this_month} / {billingStatus?.usage?.searches_limit === -1 ? "Ilimitadas" : billingStatus?.usage?.searches_limit}
                  </span>
                </div>
                {billingStatus?.usage?.searches_limit !== -1 && (
                  <div className="w-full h-2 bg-[var(--color-slate-100)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-primary-600)] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (billingStatus?.usage?.searches_this_month / billingStatus?.usage?.searches_limit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {normalizedCurrentPlanId !== "gratis" && !billingStatus.subscription?.cancel_at_period_end && (
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing !== null}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all text-xs cursor-pointer disabled:opacity-50"
              >
                Cancelar Suscripción
              </button>
            )}
          </div>

          {/* Toggle Mensual/Anual */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 bg-[var(--color-slate-100)] p-1.5 rounded-xl border border-[var(--color-slate-200)]">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isAnnual 
                    ? "bg-white text-[var(--color-slate-800)] shadow-sm" 
                    : "text-[var(--color-slate-500)] hover:text-[var(--color-slate-800)]"
                }`}
              >
                Facturación Mensual
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isAnnual 
                    ? "bg-white text-[var(--color-slate-800)] shadow-sm" 
                    : "text-[var(--color-slate-500)] hover:text-[var(--color-slate-800)]"
                }`}
              >
                Facturación Anual
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-extrabold rounded">
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {PLANS_DATA.map((plan) => {
              const isCurrent = normalizedCurrentPlanId === plan.key;
              const isSameInterval = isCurrent && isAnnual === (currentPlanId.includes("yearly") || currentPlanId.includes("year"));
              
              const price = isAnnual ? plan.priceYearly : plan.priceMonthly;
              const formattedPrice = price.toLocaleString('es-CL');
              const priceLabel = isAnnual ? "año" : "mes";

              return (
                <div 
                  key={plan.key} 
                  className={`bg-white rounded-3xl border p-8 flex flex-col gap-6 relative transition-all duration-200 hover:shadow-md ${
                    plan.popular 
                      ? "border-[var(--color-primary-500)] ring-1 ring-[var(--color-primary-500)] shadow-[var(--shadow-sm)]" 
                      : "border-[var(--color-slate-200)]"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--color-primary-600)] text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Sparkles size={10} /> El más elegido
                    </span>
                  )}

                  <div className="space-y-1">
                    <h3 className="font-display font-extrabold text-lg text-[var(--color-slate-900)]">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[var(--color-slate-400)] leading-relaxed font-body">
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1.5 border-b border-[var(--color-slate-100)] pb-6">
                    <span className="font-display text-4xl font-black text-[var(--color-slate-900)]">
                      ${formattedPrice}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-slate-500)]">
                      / {priceLabel}
                    </span>
                  </div>

                  <ul className="space-y-3.5 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--color-slate-600)] leading-relaxed font-body">
                        <div className="w-5 h-5 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={isCurrent && isSameInterval}
                    className={`w-full h-12 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrent && isSameInterval
                        ? "bg-[var(--color-slate-100)] text-[var(--color-slate-500)] border border-[var(--color-slate-200)]"
                        : plan.popular
                          ? "bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-sm"
                          : "border border-[var(--color-slate-200)] text-[var(--color-slate-700)] hover:bg-[var(--color-slate-50)]"
                    }`}
                  >
                    <MessageSquare size={16} />
                    {isCurrent && isSameInterval
                      ? "Tu Plan Activo" 
                      : "Adquirir / Contactar"
                    }
                  </button>
                </div>
              );
            })}
          </div>

          {/* Secure transaction badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-slate-400)] pt-6">
            <MessageSquare size={16} className="text-green-500" />
            <span>Soporte comercial inmediato y activación de planes rápidos a través de WhatsApp.</span>
          </div>
        </div>
      )}
    </div>
  );
}
