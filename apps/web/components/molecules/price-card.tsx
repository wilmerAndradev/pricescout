import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ExternalLink } from "@/components/atoms/icons";
import { Badge } from "@/components/atoms/badge";
import { formatPrice } from "@/lib/utils/format-price";

/* ═══════════════════════════════════════════════════════
   M-02 · Price Card
   Displays a scraped product with image, title, price,
   and store source.
   ═══════════════════════════════════════════════════════ */

export interface PriceCardProps {
  productName: string;
  price: number;
  priceOriginal?: number | null;
  imageUrl?: string;
  storeName: string;
  sourceUrl: string;
  isLowest?: boolean;
  className?: string;
  extractionMethod?: string;
  confidenceScore?: string | null;
  inStock?: boolean;
}

export function PriceCard({
  productName,
  price,
  priceOriginal,
  imageUrl,
  storeName,
  sourceUrl,
  isLowest,
  className,
  extractionMethod,
  confidenceScore,
  inStock = true,
}: PriceCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-[var(--radius-lg)] border p-4 flex flex-col gap-4 relative overflow-hidden transition-all duration-200 hover:shadow-[var(--shadow-md)]",
      isLowest ? "border-[var(--color-primary-400)] shadow-[var(--shadow-sm)]" : "border-[var(--color-slate-200)]",
      !inStock && "opacity-75 grayscale-[0.5]",
      className
    )}>
      {isLowest && (
        <div className="absolute top-0 right-0 bg-[var(--color-primary-500)] text-white text-xs font-bold px-3 py-1 rounded-bl-[var(--radius-md)]">
          Mejor Precio
        </div>
      )}

      {/* Image Container */}
      <div className="w-full sm:w-32 h-32 bg-[var(--color-slate-50)] rounded-[var(--radius-md)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--color-slate-100)]">
        {imageUrl ? (
          <img src={imageUrl} alt={productName} className="object-contain w-full h-full p-2" />
        ) : (
          <span className="text-[var(--color-slate-400)] text-sm">Sin imagen</span>
        )}
      </div>

      {/* Content Container */}
      <div className="flex flex-col flex-grow justify-between py-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-full font-body text-[10px] font-semibold leading-none h-5 px-2 bg-white border border-[var(--color-slate-200)] text-[var(--color-slate-500)] uppercase tracking-wider">
              {storeName}
            </span>
            {extractionMethod === "llm" && (
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 text-[10px]">
                Extraído con IA
              </Badge>
            )}
            {confidenceScore === "low" && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px]">
                Confianza baja
              </Badge>
            )}
            {!inStock && (
              <span className="inline-flex items-center rounded-full font-body text-[10px] font-semibold leading-none h-5 px-2 bg-red-50 text-red-600 border border-red-100">
                Sin stock
              </span>
            )}
          </div>
          <h3 className="font-body text-base font-medium text-[var(--color-slate-900)] line-clamp-2 leading-tight">
            {productName}
          </h3>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="flex flex-col">
            <div className="font-display text-2xl font-bold text-[var(--color-slate-900)] flex items-center gap-2">
              {formatPrice(price)}
              {priceOriginal && priceOriginal > price && (
                <span className="text-sm text-[var(--color-slate-400)] line-through font-normal">
                  {formatPrice(priceOriginal)}
                </span>
              )}
            </div>
            {!inStock && (
              <span className="text-red-500 text-xs font-medium">No disponible</span>
            )}
          </div>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md border border-[var(--color-slate-300)] text-[var(--color-slate-700)] hover:bg-[var(--color-slate-50)] transition-colors duration-150 cursor-pointer"
          >
            Ver tienda <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
