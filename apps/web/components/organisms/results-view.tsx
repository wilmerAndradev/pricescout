"use client";

import * as React from "react";
import { PriceCard } from "@/components/molecules/price-card";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ResultsViewProps {
  results: any[];
  lowestPrice: number | null;
}

export function ResultsView({ results, lowestPrice }: ResultsViewProps) {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="bg-[var(--color-slate-100)] p-1 rounded-md flex gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-[var(--radius-sm)] transition-colors flex items-center justify-center",
              viewMode === "grid" 
                ? "bg-white shadow-sm text-[var(--color-primary-600)]" 
                : "text-[var(--color-slate-500)] hover:text-[var(--color-slate-700)]"
            )}
            title="Vista de cuadrícula"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-[var(--radius-sm)] transition-colors flex items-center justify-center",
              viewMode === "list" 
                ? "bg-white shadow-sm text-[var(--color-primary-600)]" 
                : "text-[var(--color-slate-500)] hover:text-[var(--color-slate-700)]"
            )}
            title="Vista de lista"
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      <div className={cn(
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "flex flex-col gap-4 max-w-3xl mx-auto"
      )}>
        {results.map((result) => (
          <PriceCard
            key={result.id}
            productName={result.product_name}
            price={result.price}
            priceOriginal={result.price_original}
            imageUrl={result.image_url}
            storeName={result.store_name}
            sourceUrl={result.source_url}
            isLowest={lowestPrice !== null && result.price === lowestPrice && result.price > 0}
            extractionMethod={result.extraction_method}
            confidenceScore={result.confidence_score}
            inStock={result.in_stock}
            className={viewMode === "list" ? "flex-row h-auto w-full max-w-none" : ""}
          />
        ))}
      </div>
    </div>
  );
}
