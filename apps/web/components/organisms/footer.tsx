"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Mail, AlertCircle, Loader2, Check, X } from "@/components/atoms/icons";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════
   O-02 · Footer Component
   Complete, professional footer with system status,
   structured navigation, brand description, feedback modal, and responsive grid.
   ═══════════════════════════════════════════════════════ */

export function Footer() {
  const currentYear = new Date().getFullYear();

  // Feedback Form State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState(false);
  const [feedbackName, setFeedbackName] = React.useState("");
  const [feedbackContact, setFeedbackContact] = React.useState("");
  const [feedbackMessage, setFeedbackMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackContact.trim() || !feedbackMessage.trim()) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: feedbackName.trim(),
          contact: feedbackContact.trim(),
          message: feedbackMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("No pudimos enviar el reporte. Por favor, intenta más tarde.");
      }

      const data = await response.json();
      if (data.success) {
        setSubmitSuccess(true);
        toast.success("Reporte enviado con éxito.");
      } else {
        throw new Error(data.error || "Ocurrió un error al enviar el reporte.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-white border-t border-[var(--color-slate-200)] mt-auto font-body text-sm text-[var(--color-slate-600)] relative">
      {/* Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-5">
            <Link href="/" className="flex items-center gap-2">
              <img src="/Logo-01.png" alt="PriceScout Logo" className="w-8 h-8 object-contain" />
              <span className="font-display text-xl font-bold tracking-tight">
                <span className="text-[#0c0f30]">Price</span>
                <span className="text-[var(--color-primary-700)]">Scout</span>
              </span>
            </Link>
            <p className="text-[var(--color-slate-500)] text-xs md:text-sm leading-relaxed max-w-sm">
              PriceScout es una plataforma de monitoreo de precios y comparación de productos en el mercado chileno. Busca un producto por su nombre y nuestro motor autónomo rastreará tiendas online en tiempo real para comparar stock y precios al instante.
            </p>
            {/* System Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 text-xs font-semibold text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Todos los servicios operativos</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 1: Product */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-xs text-[var(--color-slate-900)] uppercase tracking-wider">Producto</h4>
              <ul className="space-y-2.5 text-xs md:text-sm font-medium">
                <li>
                  <Link href="/" className="hover:text-[var(--color-primary-600)] transition-colors flex items-center gap-1.5">
                    <Search size={14} />Buscador
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-[var(--color-primary-600)] transition-colors">Mi Dashboard</Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-[var(--color-primary-600)] transition-colors">Planes y Precios</Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Tools */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-xs text-[var(--color-slate-900)] uppercase tracking-wider">Herramientas</h4>
              <ul className="space-y-2.5 text-xs md:text-sm font-medium">
                <li>
                  <Link href="/environments" className="hover:text-[var(--color-primary-600)] transition-colors">Configurar Tiendas</Link>
                </li>
                <li>
                  <Link href="/compare/new" className="hover:text-[var(--color-primary-600)] transition-colors flex items-center gap-1.5">Comparar URLs</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact & Legal */}
            <div className="space-y-4 col-span-2 sm:col-span-1">
              <h4 className="font-display font-bold text-xs text-[var(--color-slate-900)] uppercase tracking-wider">Soporte & Legal</h4>
              <ul className="space-y-2.5 text-xs md:text-sm font-medium">
                <li>
                  <a href="mailto:soporte@pricescout.cl" className="hover:text-[var(--color-primary-600)] transition-colors flex items-center gap-1.5">
                    <Mail size={14} />Contacto
                  </a>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[var(--color-primary-600)] transition-colors">Términos de Servicio</Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[var(--color-primary-600)] transition-colors">Privacidad</Link>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      setFeedbackName("");
                      setFeedbackContact("");
                      setFeedbackMessage("");
                      setSubmitSuccess(false);
                      setIsFeedbackModalOpen(true);
                    }}
                    className="text-[var(--color-danger-500)] hover:opacity-80 transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="whitespace-nowrap">Reportar error</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-[var(--color-slate-200)] my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">
          <div className="flex flex-wrap items-center gap-2">
            <span>© {currentYear} PriceScout. Todos los derechos reservados.</span>
          </div>
        </div>
      </div>

      {/* ── Feedback / Error Report Modal ── */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-50 flex items-center justify-center p-6 animate-fade-in text-[var(--color-slate-900)]">
          <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] max-w-md w-full p-8 shadow-[var(--shadow-lg)] relative flex flex-col gap-6">
            <button 
              onClick={() => setIsFeedbackModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--color-slate-400)] hover:text-[var(--color-slate-600)] cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>

            {!submitSuccess ? (
              <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-5">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-[var(--color-danger-500)] flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-[var(--color-slate-900)]">
                    Reportar un problema
                  </h3>
                  <p className="text-xs text-[var(--color-slate-500)] font-body max-w-xs mx-auto">
                    ¿Algo no funciona como debería? Envíanos los detalles para que nuestro equipo lo solucione.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="feedback-name" className="text-xs font-bold text-[var(--color-slate-700)] uppercase tracking-wide">
                      Nombre o Organización
                    </label>
                    <input 
                      id="feedback-name"
                      type="text"
                      required
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      placeholder="Tu nombre o empresa"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-slate-200)] text-sm shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] focus:border-[var(--color-primary-600)] transition-all bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="feedback-contact" className="text-xs font-bold text-[var(--color-slate-700)] uppercase tracking-wide">
                      Email de contacto
                    </label>
                    <input 
                      id="feedback-contact"
                      type="email"
                      required
                      value={feedbackContact}
                      onChange={(e) => setFeedbackContact(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-slate-200)] text-sm shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] focus:border-[var(--color-primary-600)] transition-all bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="feedback-message" className="text-xs font-bold text-[var(--color-slate-700)] uppercase tracking-wide">
                      Mensaje / Descripción del error
                    </label>
                    <textarea 
                      id="feedback-message"
                      required
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Describe qué sucedió o cuál es la falla..."
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-slate-200)] text-sm shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] focus:border-[var(--color-primary-600)] transition-all resize-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(false)}
                    className="flex-1 py-3 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-[var(--color-danger-500)] hover:opacity-90 text-white font-bold text-center rounded-xl text-sm transition-all shadow-[var(--shadow-sm)] hover:shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar reporte</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-6 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-extrabold text-2xl text-[var(--color-slate-900)]">
                    ¡Reporte Enviado!
                  </h3>
                  <p className="text-sm text-[var(--color-slate-500)] font-body leading-relaxed max-w-xs mx-auto">
                    Gracias por informarnos del problema. Hemos recibido los detalles del error y nuestro equipo lo resolverá a la brevedad.
                  </p>
                </div>
                <button 
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="w-full py-3 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
