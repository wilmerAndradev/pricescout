"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Input } from "@/components/atoms/input";
import { Skeleton, Spinner, ProgressBar } from "@/components/atoms/skeleton";
import {
  Search,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Bell,
  Filter,
  Mail,
  Lock,
  Check,
  AlertCircle,
  Star,
  Clock,
  TrendingDown,
  TrendingUp,
  Settings,
  ICON_SIZE,
  ICON_STROKE_WIDTH,
} from "@/components/atoms/icons";
import { formatPrice } from "@/lib/utils/format-price";

/* ═══════════════════════════════════════════════════════
   /design-system — Local Storybook
   Renders all atoms from FDS Section 3.1
   ═══════════════════════════════════════════════════════ */

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-[var(--color-slate-900)] border-b border-[var(--color-slate-200)] pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-[var(--color-slate-500)] uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function DesignSystemPage() {
  const [progress, setProgress] = useState(65);
  const [chipVisible, setChipVisible] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--color-slate-50)]">
      {/* ── Header ─────────────────────────────────── */}
      <header className="bg-white border-b border-[var(--color-slate-200)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-primary-700)]">
              PriceScout Chile
            </h1>
            <p className="font-body text-sm text-[var(--color-slate-500)]">
              Design System — FDS v1.0 Atoms
            </p>
          </div>
          <Badge variant="plan">Design System</Badge>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* ── Color Tokens ───────────────────────────── */}
        <Section id="colors" title="🎨 Design Tokens — Colores (FDS 2.1)">
          <SubSection title="Brand">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "primary-700", hex: "#1D4ED8", var: "--color-primary-700" },
                { name: "primary-600", hex: "#2563EB", var: "--color-primary-600" },
                { name: "primary-100", hex: "#DBEAFE", var: "--color-primary-100" },
                { name: "primary-50", hex: "#EFF6FF", var: "--color-primary-50" },
                { name: "accent-600", hex: "#059669", var: "--color-accent-600" },
                { name: "accent-100", hex: "#D1FAE5", var: "--color-accent-100" },
                { name: "danger-500", hex: "#EF4444", var: "--color-danger-500" },
                { name: "danger-50", hex: "#FEF2F2", var: "--color-danger-50" },
                { name: "warning-500", hex: "#F59E0B", var: "--color-warning-500" },
                { name: "warning-50", hex: "#FFFBEB", var: "--color-warning-50" },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-2 bg-white rounded-[var(--radius-lg)] border border-[var(--color-slate-200)]">
                  <div
                    className="w-10 h-10 rounded-[var(--radius-md)] border border-[var(--color-slate-200)] shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div>
                    <p className="font-body text-xs font-semibold text-[var(--color-slate-700)]">
                      {c.name}
                    </p>
                    <p className="font-mono text-xs text-[var(--color-slate-400)]">
                      {c.hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SubSection>

          <SubSection title="Neutros (Slate)">
            <div className="flex gap-1 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-slate-200)]">
              {[
                { name: "900", hex: "#0F172A" },
                { name: "700", hex: "#334155" },
                { name: "500", hex: "#64748B" },
                { name: "400", hex: "#94A3B8" },
                { name: "200", hex: "#E2E8F0" },
                { name: "100", hex: "#F1F5F9" },
                { name: "50", hex: "#F8FAFC" },
              ].map((c) => (
                <div key={c.name} className="flex-1 h-16 flex flex-col items-center justify-end pb-1" style={{ backgroundColor: c.hex }}>
                  <span className={`font-mono text-[10px] ${parseInt(c.name) > 400 ? "text-white" : "text-[var(--color-slate-700)]"}`}>
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

        {/* ── Typography ──────────────────────────────── */}
        <Section id="typography" title="🔤 Tipografía (FDS 2.2)">
          <div className="space-y-4 bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)]">
            <p className="font-display text-4xl font-bold text-[var(--color-slate-900)]">
              Display — Plus Jakarta Sans 36-48px Bold
            </p>
            <p className="font-display text-2xl font-bold text-[var(--color-slate-900)]">
              Heading 1 — Plus Jakarta Sans 28px Bold
            </p>
            <p className="font-display text-xl font-semibold text-[var(--color-slate-900)]">
              Heading 2 — Plus Jakarta Sans 22px Semibold
            </p>
            <p className="font-display text-lg font-semibold text-[var(--color-slate-900)]">
              Heading 3 — Plus Jakarta Sans 18px Semibold
            </p>
            <p className="font-body text-base text-[var(--color-slate-700)]">
              Body Large — DM Sans 16px Regular — Para cuerpo de texto principal y descripciones.
            </p>
            <p className="font-body text-sm text-[var(--color-slate-700)]">
              Body — DM Sans 14px Regular — UI labels, contenido de cards, metadata.
            </p>
            <p className="font-body text-xs text-[var(--color-slate-500)]">
              Small — DM Sans 12px — Captions, timestamps, notas de pie.
            </p>
            <div className="pt-2 border-t border-[var(--color-slate-100)]">
              <p className="font-body text-sm text-[var(--color-slate-500)] mb-1">
                Precios en JetBrains Mono (siempre monoespacio):
              </p>
              <p className="font-mono text-2xl font-bold text-[var(--color-slate-900)]">
                {formatPrice(1234567)} · {formatPrice(99990)} · {formatPrice(0)}
              </p>
            </div>
          </div>
        </Section>

        {/* ── A-01: Buttons ──────────────────────────── */}
        <Section id="buttons" title="A-01 · Botones">
          <SubSection title="Variantes (tamaño md)">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">
                <Download size={ICON_SIZE.button} strokeWidth={ICON_STROKE_WIDTH} />
                Exportar Excel
              </Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">
                <Trash2 size={ICON_SIZE.button} strokeWidth={ICON_STROKE_WIDTH} />
                Eliminar
              </Button>
              <Button variant="icon" aria-label="Buscar">
                <Search size={ICON_SIZE.button} strokeWidth={ICON_STROKE_WIDTH} />
              </Button>
              <Button variant="icon" aria-label="Actualizar">
                <RefreshCw size={ICON_SIZE.button} strokeWidth={ICON_STROKE_WIDTH} />
              </Button>
            </div>
          </SubSection>

          <SubSection title="Tamaños">
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="primary" size="sm">Small (h-8)</Button>
              <Button variant="primary" size="md">Medium (h-10)</Button>
              <Button variant="primary" size="lg">Large (h-12)</Button>
            </div>
          </SubSection>

          <SubSection title="Estados">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Normal</Button>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="secondary" disabled>Disabled</Button>
              <Button variant="accent" disabled>Disabled</Button>
              <Button variant="primary">
                <Spinner size={16} />
                Cargando...
              </Button>
            </div>
          </SubSection>
        </Section>

        {/* ── A-02: Badges ───────────────────────────── */}
        <Section id="badges" title="A-02 · Badges y Chips">
          <SubSection title="Badges de precio">
            <div className="flex flex-wrap gap-2">
              <Badge variant="precio-minimo">PRECIO MÁS BAJO</Badge>
              <Badge variant="precio-maximo">PRECIO MÁS ALTO</Badge>
            </div>
          </SubSection>

          <SubSection title="Badges de plan y coincidencia">
            <div className="flex flex-wrap gap-2">
              <Badge variant="plan">Pro</Badge>
              <Badge variant="plan">Business</Badge>
              <Badge variant="match-alto">Coincidencia Alta</Badge>
              <Badge variant="match-medio">Coincidencia Media</Badge>
              <Badge variant="match-bajo">Coincidencia Baja</Badge>
            </div>
          </SubSection>

          <SubSection title="Estado de Job (Scraping)">
            <div className="flex flex-wrap gap-2">
              <Badge variant="job-pending">Pendiente</Badge>
              <Badge variant="job-running">Extrayendo</Badge>
              <Badge variant="job-done">Completado</Badge>
              <Badge variant="job-error">Error</Badge>
            </div>
          </SubSection>

          <SubSection title="Chips de filtro (removibles)">
            <div className="flex flex-wrap gap-2">
              {chipVisible && (
                <Badge variant="filter-chip" onRemove={() => setChipVisible(false)}>
                  Falabella
                </Badge>
              )}
              <Badge variant="filter-chip" onRemove={() => {}}>
                Con oferta
              </Badge>
              <Badge variant="filter-chip" onRemove={() => {}}>
                Disponible
              </Badge>
              {!chipVisible && (
                <button
                  className="text-xs text-[var(--color-primary-700)] font-body underline"
                  onClick={() => setChipVisible(true)}
                >
                  Restaurar chip
                </button>
              )}
            </div>
          </SubSection>
        </Section>

        {/* ── A-03: Inputs ───────────────────────────── */}
        <Section id="inputs" title="A-03 · Inputs y Formularios">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)]">
            <Input
              label="Email"
              placeholder="tu@email.com"
              iconLeft={<Mail size={ICON_SIZE.button} strokeWidth={ICON_STROKE_WIDTH} />}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              iconLeft={<Lock size={ICON_SIZE.button} strokeWidth={ICON_STROKE_WIDTH} />}
            />
            <Input
              label="Con error"
              error="Este campo es obligatorio"
              defaultValue="texto inválido"
            />
            <Input
              label="Con éxito"
              success="Email verificado"
              defaultValue="usuario@email.com"
            />
            <Input
              label="Deshabilitado"
              disabled
              defaultValue="No editable"
            />
            <Input
              label="Con hint"
              hint="Ingresa una URL válida de e-commerce chileno"
              placeholder="https://falabella.com/producto/..."
            />
            <div className="sm:col-span-2">
              <Input
                label="Búsqueda principal (tamaño lg)"
                inputSize="lg"
                placeholder="Ej: iPhone 15 Pro 256GB, Samsung S24..."
                iconLeft={<Search size={ICON_SIZE.button} strokeWidth={ICON_STROKE_WIDTH} />}
              />
            </div>
          </div>
        </Section>

        {/* ── A-04: Icons ────────────────────────────── */}
        <Section id="icons" title="A-04 · Iconografía (Lucide)">
          <p className="font-body text-sm text-[var(--color-slate-500)]">
            Todos los íconos: strokeWidth 1.5px, color currentColor.
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4 bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)]">
            {[
              { icon: Search, name: "Search" },
              { icon: Filter, name: "Filter" },
              { icon: Download, name: "Download" },
              { icon: RefreshCw, name: "RefreshCw" },
              { icon: ExternalLink, name: "ExternalLink" },
              { icon: TrendingDown, name: "TrendingDown" },
              { icon: TrendingUp, name: "TrendingUp" },
              { icon: Bell, name: "Bell" },
              { icon: Clock, name: "Clock" },
              { icon: Star, name: "Star" },
              { icon: Trash2, name: "Trash2" },
              { icon: Settings, name: "Settings" },
              { icon: Check, name: "Check" },
              { icon: AlertCircle, name: "AlertCircle" },
            ].map(({ icon: Icon, name }) => (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-slate-50)] text-[var(--color-slate-600)]">
                  <Icon size={ICON_SIZE.nav} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <span className="font-mono text-[10px] text-[var(--color-slate-400)]">
                  {name}
                </span>
              </div>
            ))}
          </div>

          <SubSection title="Tamaños de ícono">
            <div className="flex items-end gap-6 bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)]">
              {[
                { size: ICON_SIZE.inline, label: "16px (inline)" },
                { size: ICON_SIZE.button, label: "20px (button)" },
                { size: ICON_SIZE.nav, label: "24px (nav)" },
                { size: ICON_SIZE.empty, label: "32px (empty)" },
                { size: ICON_SIZE.hero, label: "48px (hero)" },
              ].map(({ size, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <Search size={size} strokeWidth={ICON_STROKE_WIDTH} className="text-[var(--color-primary-700)]" />
                  <span className="font-mono text-[10px] text-[var(--color-slate-400)]">{label}</span>
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

        {/* ── A-05: Skeleton / Spinner / Progress ──── */}
        <Section id="loaders" title="A-05 · Skeleton / Spinner / Progress Bar">
          <SubSection title="Skeleton Loading">
            <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)] space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton shape="circle" width="w-10" height="h-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton width="w-48" height="h-4" />
                  <Skeleton width="w-32" height="h-3" />
                </div>
                <Skeleton width="w-24" height="h-6" />
              </div>
              <Skeleton width="w-full" height="h-4" />
              <Skeleton width="w-3/4" height="h-4" />
              <Skeleton width="w-1/2" height="h-4" />
            </div>
          </SubSection>

          <SubSection title="Spinner (para botones)">
            <div className="flex items-center gap-6 bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)]">
              <div className="flex items-center gap-2 text-[var(--color-primary-700)]">
                <Spinner size={16} />
                <span className="font-body text-sm">16px</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-primary-700)]">
                <Spinner size={20} />
                <span className="font-body text-sm">20px</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-primary-700)]">
                <Spinner size={24} />
                <span className="font-body text-sm">24px</span>
              </div>
              <Button variant="primary" disabled>
                <Spinner size={16} className="text-white" />
                Comparando...
              </Button>
            </div>
          </SubSection>

          <SubSection title="Progress Bar">
            <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)] space-y-4">
              <ProgressBar value={progress} showLabel />
              <ProgressBar value={25} />
              <ProgressBar value={100} showLabel />
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setProgress((p) => Math.max(0, p - 10))}
                >
                  -10%
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setProgress((p) => Math.min(100, p + 10))}
                >
                  +10%
                </Button>
              </div>
            </div>
          </SubSection>
        </Section>

        {/* ── Price Format Demo ──────────────────────── */}
        <Section id="prices" title="💰 Formato de Precios (CLP)">
          <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--color-slate-200)]">
            <p className="font-body text-sm text-[var(--color-slate-500)] mb-3">
              Siempre en JetBrains Mono, formato <code className="font-mono text-xs bg-[var(--color-slate-100)] px-1.5 py-0.5 rounded">$1.234.567</code> (punto como separador de miles, CLP).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1234567, 99990, 549000, 0, 15990, 1299990].map((price) => (
                <div key={price} className="text-center p-3 bg-[var(--color-slate-50)] rounded-[var(--radius-md)]">
                  <p className="font-mono text-xl font-bold text-[var(--color-slate-900)]">
                    {formatPrice(price)}
                  </p>
                  <p className="font-mono text-xs text-[var(--color-slate-400)] mt-1">
                    raw: {price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Shadows & Radii ──────────────────────── */}
        <Section id="shadows" title="🌓 Sombras y Radios (FDS 2.4–2.5)">
          <SubSection title="Sombras">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { name: "xs", style: "shadow-xs" },
                { name: "sm", style: "shadow-sm" },
                { name: "md", style: "shadow-md" },
                { name: "lg", style: "shadow-lg" },
                { name: "focus", style: "shadow-focus" },
              ].map((s) => (
                <div
                  key={s.name}
                  className={`bg-white p-4 rounded-[var(--radius-lg)] flex items-center justify-center h-20`}
                  style={{ boxShadow: `var(--${s.style})` }}
                >
                  <span className="font-mono text-xs text-[var(--color-slate-500)]">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </SubSection>

          <SubSection title="Border Radius">
            <div className="flex flex-wrap gap-4">
              {[
                { name: "sm (4px)", radius: "var(--radius-sm)" },
                { name: "md (8px)", radius: "var(--radius-md)" },
                { name: "lg (12px)", radius: "var(--radius-lg)" },
                { name: "xl (16px)", radius: "var(--radius-xl)" },
                { name: "full", radius: "var(--radius-full)" },
              ].map((r) => (
                <div
                  key={r.name}
                  className="bg-[var(--color-primary-100)] text-[var(--color-primary-700)] w-20 h-20 flex items-center justify-center"
                  style={{ borderRadius: r.radius }}
                >
                  <span className="font-mono text-[10px] text-center">
                    {r.name}
                  </span>
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

      </main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-[var(--color-slate-200)] bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="font-body text-xs text-[var(--color-slate-400)]">
            PriceScout Chile — Design System v1.0
          </p>
          <p className="font-mono text-xs text-[var(--color-slate-400)]">
            FDS v1.0 · Abril 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
