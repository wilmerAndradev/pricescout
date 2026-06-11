import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceCard } from "@/components/molecules/price-card";

// MockformatPrice and cn utilities if needed, or rely on actual implementation
// Since cn is just clsx + tailwind-merge, it should run fine.
describe("PriceCard Component", () => {
  const defaultProps = {
    productName: "Perfume Valentino Born In Roma 100ml",
    price: 89990,
    priceOriginal: 109990,
    imageUrl: "https://example.com/perfume.jpg",
    storeName: "Falabella",
    sourceUrl: "https://falabella.com/perfume-123",
    inStock: true,
  };

  it("renders basic product information correctly", () => {
    render(<PriceCard {...defaultProps} />);
    
    // Check product name and store name
    expect(screen.getByText(defaultProps.productName)).toBeDefined();
    expect(screen.getByText(defaultProps.storeName)).toBeDefined();
    
    // Check price formatting (formatPrice converts 89990 to Chilean CLP format e.g. "$89.990")
    expect(screen.getByText(/\$89[\.,]990/)).toBeDefined();
    expect(screen.getByText(/\$109[\.,]990/)).toBeDefined();
    
    // Check link to store exists
    const link = screen.getByRole("link", { name: /Ver tienda/i });
    expect(link.getAttribute("href")).toBe(defaultProps.sourceUrl);
  });

  it("renders 'Mejor Precio' banner when isLowest is true", () => {
    render(<PriceCard {...defaultProps} isLowest={true} />);
    expect(screen.getByText("Mejor Precio")).toBeDefined();
  });

  it("renders 'Extraído con IA' badge when extractionMethod is llm", () => {
    render(<PriceCard {...defaultProps} extractionMethod="llm" />);
    expect(screen.getByText("Extraído con IA")).toBeDefined();
  });

  it("renders 'Confianza baja' badge when confidenceScore is low", () => {
    render(<PriceCard {...defaultProps} confidenceScore="low" />);
    expect(screen.getByText("Confianza baja")).toBeDefined();
  });

  it("renders 'Sin stock' badge and 'No disponible' text when inStock is false", () => {
    render(<PriceCard {...defaultProps} inStock={false} />);
    expect(screen.getByText("Sin stock")).toBeDefined();
    expect(screen.getByText("No disponible")).toBeDefined();
  });
});
