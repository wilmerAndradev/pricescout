"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function BillingConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "success" | "rejected" | "error">("loading");
  const [errorDetail, setErrorDetail] = React.useState<string | null>(null);
  const [txDetails, setTxDetails] = React.useState<any>(null);
  
  const token = searchParams.get("token_ws");
  const abortedToken = searchParams.get("TBK_TOKEN");

  const verifyPayment = React.useCallback(async (paymentToken: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const response = await fetch(`${apiUrl}/billing/confirm?token=${paymentToken}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error al confirmar la transacción");
      }

      const data = await response.json();
      setTxDetails(data);

      if (data.status === "approved") {
        setStatus("success");
        toast.success("¡Pago aprobado! Tu suscripción ya está activa.");
      } else {
        setStatus("rejected");
        toast.error("La transacción fue rechazada por la pasarela de pagos.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorDetail(err.message || "No pudimos verificar el pago con Transbank.");
    }
  }, []);

  React.useEffect(() => {
    setTimeout(() => {
      if (token) {
        verifyPayment(token);
      } else if (abortedToken) {
        // User aborted the payment flow on Webpay portal
        setStatus("rejected");
        setErrorDetail("La compra fue cancelada por el usuario.");
        toast.warning("Compra cancelada.");
      } else {
        setStatus("error");
        setErrorDetail("Falta el token de transacción necesario para la confirmación.");
      }
    }, 0);
  }, [token, abortedToken, verifyPayment]);

  return (
    <div className="max-w-md mx-auto py-20 px-6 antialiased font-body min-h-[70vh] flex flex-col justify-center">
      <div className="bg-white rounded-3xl border border-[var(--color-slate-200)] p-8 shadow-[var(--shadow-sm)] text-center space-y-6">
        
        {status === "loading" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-[var(--color-primary-600)] animate-spin" />
            </div>
            <h2 className="text-xl font-display font-extrabold text-[var(--color-slate-900)]">
              Verificando tu pago
            </h2>
            <p className="text-sm text-[var(--color-slate-500)] leading-relaxed">
              Estamos validando la transacción con Webpay de Transbank de forma segura. Por favor, no cierres esta pestaña.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <CheckCircle2 size={40} className="stroke-[2.5]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-black text-[var(--color-slate-900)]">
                ¡Gracias por tu compra!
              </h2>
              <p className="text-sm text-[var(--color-slate-500)] leading-relaxed">
                Tu suscripción ha sido procesada correctamente. Los límites de tu cuenta han sido actualizados en tiempo real.
              </p>
            </div>

            {txDetails && (
              <div className="bg-[var(--color-slate-50)] border border-[var(--color-slate-100)] rounded-2xl p-4 text-left text-xs font-semibold text-[var(--color-slate-600)] space-y-2">
                <div className="flex justify-between">
                  <span>Orden de compra:</span>
                  <span className="font-mono text-[var(--color-slate-900)]">{txDetails.buy_order}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monto pagado:</span>
                  <span className="text-[var(--color-slate-900)]">${txDetails.amount?.toLocaleString('es-CL')} CLP</span>
                </div>
                <div className="flex justify-between">
                  <span>Método de pago:</span>
                  <span className="text-[var(--color-slate-900)]">{txDetails.subscription?.payment_method || "Tarjeta"}</span>
                </div>
              </div>
            )}

            <Link href="/dashboard" className="w-full block">
              <button className="w-full h-12 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm">
                Ir a mi Panel <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        )}

        {status === "rejected" && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                <XCircle size={40} className="stroke-[2.5]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-extrabold text-[var(--color-slate-900)]">
                Transacción Cancelada o Rechazada
              </h2>
              <p className="text-sm text-[var(--color-slate-500)] leading-relaxed">
                {errorDetail || "El pago no fue autorizado por tu entidad bancaria o decidiste cancelar el flujo."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/dashboard/billing" className="w-full block">
                <button className="w-full h-12 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm">
                  <RefreshCw size={16} /> Reintentar Suscripción
                </button>
              </Link>
              <Link href="/dashboard" className="text-xs font-bold text-[var(--color-slate-500)] hover:text-[var(--color-primary-600)] transition-colors">
                Volver al Dashboard
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                <XCircle size={40} className="stroke-[2.5]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-extrabold text-[var(--color-slate-900)]">
                Error en la Confirmación
              </h2>
              <p className="text-sm text-[var(--color-slate-500)] leading-relaxed">
                {errorDetail || "Ocurrió un problema de comunicación al validar el pago con Transbank."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/dashboard/billing" className="w-full block">
                <button className="w-full h-12 bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] text-[var(--color-slate-700)] hover:bg-[var(--color-slate-50)] font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer">
                  Ir a Planes
                </button>
              </Link>
              <Link href="/dashboard" className="text-xs font-bold text-[var(--color-slate-500)] hover:text-[var(--color-primary-600)] transition-colors">
                Ir al Dashboard
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
