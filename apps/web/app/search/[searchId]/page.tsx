"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowRight, Search, Loader2, Sparkles, Check, 
  ExternalLink, ShoppingBag, 
  X, ShieldAlert, Award, LogOut, Bell, Filter
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/organisms/header";
import { Footer } from "@/components/organisms/footer";

// Mappings for store names and icons
const STORES_LIST = [
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

const BRAND_SYNONYMS: Record<string, string[]> = {
  "Dior": ["dior", "christian dior"],
  "Chanel": ["chanel"],
  "Giorgio Armani": ["giorgio armani", "armani", "giorgioarmani"],
  "Paco Rabanne": ["paco rabanne", "rabanne", "pacorabanne"],
  "Carolina Herrera": ["carolina herrera", "ch", "carolinaherrera"],
  "Versace": ["versace"],
  "Hugo Boss": ["hugo boss", "boss", "hugoboss"],
  "Calvin Klein": ["calvin klein", "ck", "calvinklein"],
  "Yves Saint Laurent": ["yves saint laurent", "ysl", "yves saint-laurent", "yvessaintlaurent"],
  "Guerlain": ["guerlain"],
  "Givenchy": ["givenchy"],
  "Tom Ford": ["tom ford", "tf", "tomford"],
  "Creed": ["creed"],
  "Bvlgari": ["bvlgari", "bulgari"],
  "Dolce & Gabbana": ["dolce & gabbana", "dolce and gabbana", "d&g", "dg", "dolce&gabbana"],
  "Jean Paul Gaultier": ["jean paul gaultier", "jpg", "jeanpaulgaultier"],
  "Montblanc": ["montblanc", "mont blanc"],
  "Ralph Lauren": ["ralph lauren", "polo ralph lauren", "polo"],
  "Hermes": ["hermes", "hermès"],
  "Prada": ["prada"],
  "Mugler": ["mugler", "thierry mugler"],
  "Valentino": ["valentino"],
  "Nautica": ["nautica"],
  "Issey Miyake": ["issey miyake", "isseymiyake"],
  "Kenzo": ["kenzo"],
  "Lacoste": ["lacoste"],
  "Antonio Banderas": ["antonio banderas", "banderas", "antoniobanderas"],
  "Diesel": ["diesel"],
  "Elizabeth Arden": ["elizabeth arden", "arden"],
  "Estee Lauder": ["estee lauder", "estée lauder", "esteelauder"],
  "Clinique": ["clinique"],
  "Shiseido": ["shiseido"],
  "Victoria's Secret": ["victoria's secret", "victorias secret", "vs"],
  "Oster": ["oster"],
  "Asus": ["asus"],
  "Nike": ["nike"]
};

function smartCapitalize(text: string): string {
  const words = text.split(/\s+/);
  const capitalized = words.map(w => {
    const wClean = w.replace(/[^\w]/g, '').toLowerCase();
    if (["edt", "edp", "edc", "cologne", "parfum", "deo"].includes(wClean)) {
      return w.toUpperCase();
    }
    if (wClean.endsWith("ml") && !isNaN(Number(wClean.slice(0, -2)))) {
      const val = wClean.slice(0, -2);
      return `${val}ML`;
    }
    // Si la palabra contiene paréntesis o caracteres especiales al inicio, respetar
    const firstLetter = w.charAt(0);
    if (/[^\w]/.test(firstLetter)) {
      return firstLetter + w.slice(1).charAt(0).toUpperCase() + w.slice(2).toLowerCase();
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
  return capitalized.join(" ");
}

function cleanProductTitle(rawTitle: string, detectedBrand: string, sku: string | null): string {
  let clean = rawTitle.trim();

  // Remover SKU del final si existe
  if (sku) {
    const escapedSku = sku.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const skuPattern = new RegExp(`\\b${escapedSku}\\b$`, 'i');
    clean = clean.replace(skuPattern, '').trim();
  } else {
    clean = clean.replace(/\b[a-zA-Z]+\d+\b$/gi, '').trim();
  }

  // Remover todos los sinónimos de la marca detectada
  if (detectedBrand && detectedBrand !== "Genérico") {
    const synonyms = BRAND_SYNONYMS[detectedBrand] || [detectedBrand];
    synonyms.forEach(syn => {
      const escaped = syn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = syn.length <= 3 
        ? new RegExp(`\\b${escaped}\\b`, 'gi')
        : new RegExp(`\\b${escaped}\\b|\\b${escaped.replace(/\\s+/g, '')}\\b`, 'gi');
      clean = clean.replace(pattern, '');
    });
  }

  // Limpiar espacios extra y guiones
  clean = clean.replace(/\s+/g, ' ').replace(/-+/g, '-').trim();
  clean = clean.replace(/^[- \s]+|[- \s]+$/g, '');

  if (clean) {
    return smartCapitalize(clean);
  }
  return "Producto";
}

interface ProductMetadata {
  brand: string;
  gender: string;
  volume: string | null;
  type: string;
  sku: string | null;
}

function parseDescription(description: string, rawTitle: string): ProductMetadata {
  let brand = "Genérico";
  let gender = "Unisex";
  let volume: string | null = null;
  let type = "Regular";
  let sku: string | null = null;

  if (description && description.includes("brand=")) {
    const parts = description.split(";");
    parts.forEach(part => {
      const [key, val] = part.split("=");
      if (key && val !== undefined) {
        if (key === "brand") brand = val;
        else if (key === "gender") gender = val;
        else if (key === "volume") volume = val || null;
        else if (key === "type") type = val;
        else if (key === "sku") sku = val || null;
      }
    });
  } else {
    // Fallback compatible con búsquedas previas
    if (description) {
      if (description.includes("|")) {
        const parts = description.split("|");
        const brandPart = parts[0].replace("Marca:", "").trim();
        const volPart = parts[1].trim();
        brand = brandPart;
        volume = volPart;
      } else if (description.startsWith("Marca: ")) {
        brand = description.replace("Marca: ", "").trim();
      } else {
        brand = description;
      }
    }

    if (brand === "Genérico" || !brand) {
      const titleLower = rawTitle.toLowerCase();
      const sortedBrands = Object.keys(BRAND_SYNONYMS).sort((a, b) => b.length - a.length);
      for (const brandKey of sortedBrands) {
        const synonyms = BRAND_SYNONYMS[brandKey];
        let found = false;
        for (const syn of synonyms) {
          const escaped = syn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const pattern = syn.length <= 3 
            ? new RegExp(`\\b${escaped}\\b`, 'i')
            : new RegExp(`\\b${escaped}\\b|\\b${escaped.replace(/\\s+/g, '')}\\b`, 'i');
          if (pattern.test(titleLower)) {
            brand = brandKey;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    const volMatch = rawTitle.match(/\b(\d+)\s*ml\b/i);
    if (volMatch) {
      volume = `${volMatch[1]}ml`;
    }

    const titleLower = rawTitle.toLowerCase();
    if (/\b(mujer|women|woman|femme|ella|girl|lady)\b/i.test(titleLower)) {
      gender = "Mujer";
    } else if (/\b(hombre|men|man|homme|él|boy|gentleman)\b/i.test(titleLower)) {
      gender = "Hombre";
    }

    if (/(set|estuche|pack|cofre|kit|deo|desodorante)/i.test(titleLower)) {
      type = "Estuche/Set";
    } else if (/(tester|probador)/i.test(titleLower)) {
      type = "Tester";
    }

    const skuMatch = rawTitle.match(/\b([a-zA-Z]+\d+)\b$/);
    if (skuMatch) {
      sku = skuMatch[1].toUpperCase();
    }
  }

  return { brand, gender, volume, type, sku };
}

function getProductKey(product: any): string {
  const { brand, gender, volume, type, sku } = parseDescription(product.description, product.title);
  if (sku) {
    return `sku_${sku.trim().toLowerCase()}`;
  }
  
  const cleanTitle = cleanProductTitle(product.title, brand, sku);
  const stopWords = ["perfume", "set", "estuche", "tester", "probador", "de", "para", "for", "men", "women", "hombre", "mujer", "unisex", "edt", "edp", "edc", "ml", "original", "exclusivo"];
  const significantWords = cleanTitle.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w && !stopWords.includes(w) && isNaN(Number(w)))
    .sort();
    
  const titleKey = significantWords.join("_");
  return `key_${brand.toLowerCase()}_${titleKey}_${(volume || "").toLowerCase()}_${gender.toLowerCase()}_${type.toLowerCase()}`;
}

export default function SearchResultsPage() {
  const { searchId } = useParams();
  const router = useRouter();
  
  const [status, setStatus] = React.useState("pending");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [kpis, setKpis] = React.useState<any>({ min_price: 0, max_price: 0, avg_price: 0, stores_found: 0 });
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [showRegisterModal, setShowRegisterModal] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<any>(null);
  const [highlightedProductId, setHighlightedProductId] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const [guestSearchCount, setGuestSearchCount] = React.useState(0);
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const suggestionsFetchedRef = React.useRef<string | null>(null);

  const [prevSearchId, setPrevSearchId] = React.useState(searchId);
  if (searchId !== prevSearchId) {
    setPrevSearchId(searchId);
    setSearchInput("");
    setIsSearching(false);
    setSuggestions([]);
  }

  const scrollToCheapestProduct = () => {
    if (!results || results.length === 0) return;
    
    const sortedResults = [...results].filter(r => r.price_clp > 0);
    if (sortedResults.length === 0) return;

    const cheapestProduct = sortedResults.reduce((min, p) => 
      (p.price_clp < min.price_clp) ? p : min
    , sortedResults[0]);

    if (cheapestProduct) {
      const elementId = `product-${cheapestProduct.id}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        
        setHighlightedProductId(cheapestProduct.id);
        setTimeout(() => {
          setHighlightedProductId(null);
        }, 2200);
      } else {
        toast.error("No se pudo ubicar el producto en la lista");
      }
    }
  };

  // Filtros activos
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = React.useState<string[]>([]);
  const [selectedVolumes, setSelectedVolumes] = React.useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedStores, setSelectedStores] = React.useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = React.useState<number | "">("");
  const [minPriceFilter, setMinPriceFilter] = React.useState<number | "">("");
  const [onlyInStock, setOnlyInStock] = React.useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = React.useState(false);

  // Extraer opciones de filtro disponibles en caliente
  const filterOptions = React.useMemo(() => {
    const brandsSet = new Set<string>();
    const gendersSet = new Set<string>();
    const volumesSet = new Set<string>();
    const typesSet = new Set<string>();
    const storesSet = new Set<string>();
    let absoluteMin = Infinity;
    let absoluteMax = -Infinity;

    results.forEach(product => {
      const { brand, gender, volume, type } = parseDescription(product.description, product.title);
      if (brand && brand !== "Genérico") brandsSet.add(brand);
      if (gender) gendersSet.add(gender);
      if (volume) volumesSet.add(volume);
      if (type) typesSet.add(type);
      if (product.store_name) storesSet.add(product.store_name);
      
      if (product.price_clp > 0) {
        if (product.price_clp < absoluteMin) absoluteMin = product.price_clp;
        if (product.price_clp > absoluteMax) absoluteMax = product.price_clp;
      }
    });

    return {
      brands: Array.from(brandsSet).sort(),
      genders: Array.from(gendersSet).sort(),
      volumes: Array.from(volumesSet).sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      }),
      types: Array.from(typesSet).sort(),
      stores: Array.from(storesSet).sort(),
      minPrice: absoluteMin === Infinity ? 0 : absoluteMin,
      maxPrice: absoluteMax === -Infinity ? 0 : absoluteMax
    };
  }, [results]);

  // Cantidad de filtros activos
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (selectedGenders.length > 0) count += selectedGenders.length;
    if (selectedVolumes.length > 0) count += selectedVolumes.length;
    if (selectedTypes.length > 0) count += selectedTypes.length;
    if (selectedStores.length > 0) count += selectedStores.length;
    if (minPriceFilter !== "") count += 1;
    if (maxPriceFilter !== "") count += 1;
    if (onlyInStock) count += 1;
    return count;
  }, [selectedBrands, selectedGenders, selectedVolumes, selectedTypes, selectedStores, minPriceFilter, maxPriceFilter, onlyInStock]);

  // Filtrado de resultados en memoria
  const filteredResults = React.useMemo(() => {
    return results.filter(product => {
      const { brand, gender, volume, type } = parseDescription(product.description, product.title);
      
      if (selectedBrands.length > 0 && !selectedBrands.includes(brand)) return false;
      if (selectedGenders.length > 0 && !selectedGenders.includes(gender)) return false;
      if (selectedVolumes.length > 0 && volume && !selectedVolumes.includes(volume)) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(type)) return false;
      if (selectedStores.length > 0 && !selectedStores.includes(product.store_name)) return false;
      
      if (minPriceFilter !== "" && product.price_clp < minPriceFilter) return false;
      if (maxPriceFilter !== "" && product.price_clp > maxPriceFilter) return false;
      
      if (onlyInStock && !product.in_stock) return false;
      
      return true;
    });
  }, [results, selectedBrands, selectedGenders, selectedVolumes, selectedTypes, selectedStores, minPriceFilter, maxPriceFilter, onlyInStock]);

  // KPIs dinámicos basados en la selección filtrada
  const dynamicKpis = React.useMemo(() => {
    const validPrices = filteredResults.map(r => r.price_clp).filter(p => p > 0);
    return {
      min_price: validPrices.length > 0 ? Math.min(...validPrices) : 0,
      max_price: validPrices.length > 0 ? Math.max(...validPrices) : 0,
      avg_price: validPrices.length > 0 ? Math.floor(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : 0,
      stores_found: validPrices.length
    };
  }, [filteredResults]);

  // Insight de IA dinámico basado en la selección filtrada
  const dynamicAiInsight = React.useMemo(() => {
    const validPrices = filteredResults.map(r => r.price_clp).filter(p => p > 0);
    if (validPrices.length === 0) return null;
    
    const minP = Math.min(...validPrices);
    const maxP = Math.max(...validPrices);
    const minIdx = filteredResults.findIndex(r => r.price_clp === minP);
    const cheapestStore = minIdx !== -1 ? filteredResults[minIdx].store_name : "tienda";
    const savings = maxP - minP;

    if (savings > 0) {
      return `¡Gran oportunidad! El precio más bajo de la selección actual está en ${cheapestStore}, lo que representa un ahorro de $${savings.toLocaleString("es-CL")} CLP en comparación con el precio más alto del mercado.`;
    }
    return `Los precios para la selección actual están parejos. La mejor oferta actual está en ${cheapestStore}.`;
  }, [filteredResults]);

  // No agrupar, mostrar cada tienda/producto en su propia tarjeta
  const groupedProducts = React.useMemo(() => {
    return filteredResults.map(product => {
      const { brand, gender, volume, type, sku } = parseDescription(product.description, product.title);
      const cleanTitle = cleanProductTitle(product.title, brand, sku);
      
      return {
        id: product.id,
        brand: brand,
        title: cleanTitle,
        gender: gender,
        volume: volume,
        type: type,
        sku: sku,
        image_url: product.image_url || "",
        in_stock: product.in_stock,
        min_price: product.price_clp,
        max_price: product.price_clp,
        cheapestPrice: product.price_clp,
        stores: [
          {
            id: product.id,
            store_name: product.store_name,
            store_domain: product.store_domain,
            product_url: product.product_url,
            price: product.price_clp,
            original_price: product.original_price_clp,
            discount_pct: product.discount_pct,
            in_stock: product.in_stock
          }
        ]
      };
    });
  }, [filteredResults]);

  // Poll intervals
  const pollIntervalRef = React.useRef<any>(null);

  const fetchSuggestions = React.useCallback(async (searchQuery: string, id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/search/suggestions?query=${encodeURIComponent(searchQuery)}&search_id=${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions.slice(0, 6));
        }
      }
    } catch (err) {
      console.warn("Error fetching suggestions:", err);
    }
  }, []);

  const fetchResults = React.useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/search/${searchId}/results`);
      
      if (!response.ok) {
        if (response.status === 404) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          toast.error("Búsqueda no encontrada");
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch results");
      }
      
      const data = await response.json();
      setQuery(data.query || "");
      setSearchInput(prev => prev || data.query || "");
      setStatus(data.status || "pending");
      setCategory(data.category_inferred || "");
      setResults(data.results || []);
      setKpis(data.kpis || { min_price: 0, max_price: 0, avg_price: 0, stores_found: 0 });
      setAiInsight(data.ai_insight);

      if (data.query && suggestionsFetchedRef.current !== searchId) {
        suggestionsFetchedRef.current = searchId as string;
        fetchSuggestions(data.query, searchId as string);
      }
      
      if (data.status === "completed" || data.status === "failed") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.warn("Polling error:", err);
    }
  }, [searchId, fetchSuggestions, router]);

  React.useEffect(() => {
    // Reset suggestions cache ref
    suggestionsFetchedRef.current = null;

    // Check if user is logged in
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setProfile(profile);
      }
    };
    checkUser();
    
    // Retrieve search count from localStorage
    const count = parseInt(localStorage.getItem("pricescout_guest_searches") || "0", 10);
    setTimeout(() => {
      setGuestSearchCount(count);
    }, 0);
    
    // Start polling search results
    setTimeout(() => {
      fetchResults();
    }, 0);
    pollIntervalRef.current = setInterval(fetchResults, 1800);
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [searchId, fetchResults]);

  const executeNewSearch = async (searchQuery: string) => {
    // Clear previous suggestions immediately
    setSuggestions([]);
    suggestionsFetchedRef.current = null;

    // If the user is a guest, enforce the 5 searches limit
    if (!user) {
      const currentCount = parseInt(localStorage.getItem("pricescout_guest_searches") || "0", 10);
      if (currentCount >= 5) {
        setShowLimitModal(true);
        return;
      }
    }

    setIsSearching(true);
    const toastId = toast.loading("Iniciando búsqueda inteligente...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { "Authorization": `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ query: searchQuery })
      });

      if (!response.ok) {
        throw new Error("Error de conexión con el motor de scraping");
      }

      const data = await response.json();
      
      if (data.search_id) {
        // Increment search count if anonymous
        if (!user) {
          const nextCount = guestSearchCount + 1;
          localStorage.setItem("pricescout_guest_searches", nextCount.toString());
          setGuestSearchCount(nextCount);
        }

        toast.success("Búsqueda en curso", { id: toastId });
        router.push(`/search/${data.search_id}`);
      } else {
        throw new Error("ID de búsqueda no recibido");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con la API de búsqueda", { id: toastId });
      setIsSearching(false);
    }
  };

  const handleNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      toast.error("Por favor, ingresa el nombre de un producto");
      return;
    }
    executeNewSearch(searchInput.trim());
  };

  const handleSuggestionClick = (suggestionQuery: string) => {
    setSearchInput(suggestionQuery);
    executeNewSearch(suggestionQuery);
  };

  const handleSaveProject = async () => {
    if (!user) {
      setShowRegisterModal(true);
      return;
    }
    
    setIsSaving(true);
    const toastId = toast.loading("Guardando proyecto de monitoreo...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          name: `Monitoreo: ${query}`,
          search_query: query
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo crear el proyecto");
      }

      toast.success("Proyecto de monitoreo guardado con éxito", { id: toastId });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el proyecto", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Determine active stores based on inferred category or results
  const getExpectedStores = () => {
    // If we have results, use the domains present
    if (results.length > 0) {
      return STORES_LIST.filter(s => results.some(r => r.store_domain === s.domain));
    }
    
    // Otherwise return a standard default set of stores
    return STORES_LIST.slice(0, 5);
  };

  const expectedStores = getExpectedStores();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--color-slate-50)] flex flex-col justify-between">
      {/* ── Adaptive Sticky Navbar ── */}
      <Header displayName={user ? displayName : undefined} initials={user ? initials : undefined} />

      {/* ── Main Content Area ── */}
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* ── Redesigned Search / Navigation Area ── */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <form onSubmit={handleNewSearch} className="flex-1 flex gap-2 max-w-2xl bg-white p-1.5 rounded-xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] focus-within:ring-2 focus-within:ring-[var(--color-primary-100)] focus-within:border-[var(--color-primary-600)] transition-all">
                <div className="flex-1 flex items-center gap-2 px-2">
                  <Search size={18} className="text-[var(--color-slate-400)] flex-shrink-0" />
                  <input 
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar otro producto... Ej: Lattafa Yara, Nike Air Max..."
                    className="w-full bg-transparent border-0 outline-none text-[var(--color-slate-900)] font-body text-sm placeholder-[var(--color-slate-400)] h-9 focus:ring-0 focus:outline-none"
                    disabled={isSearching}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="text-[var(--color-slate-400)] hover:text-[var(--color-slate-600)] p-1 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button 
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-md whitespace-nowrap disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <span>Buscar</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Guest Search Limit Indicator */}
              {!user && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-slate-100)] rounded-full text-xs font-semibold text-[var(--color-slate-500)] border border-[var(--color-slate-200)] h-fit w-fit">
                  <span>Restantes:</span>
                  <span className="font-extrabold text-[var(--color-primary-600)]">{Math.max(0, 5 - guestSearchCount)} de 5</span>
                </div>
              )}
            </div>

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 pb-6 border-b border-[var(--color-slate-200)]">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="font-display text-3xl font-extrabold text-[var(--color-slate-900)] tracking-tight">
                    Resultados para: <span className="text-[var(--color-primary-600)]">&quot;{query || "Buscando..."}&quot;</span>
                  </h1>
                  {category && (
                    <span className="px-3 py-1 bg-[var(--color-primary-50)] text-[var(--color-primary-600)] text-xs font-semibold rounded-full border border-[var(--color-primary-100)] uppercase tracking-wider">
                      {category}
                    </span>
                  )}
                </div>
                <p className="text-[var(--color-slate-500)] text-sm font-body">
                  ID de rastreo: <code className="bg-[var(--color-slate-100)] px-1.5 py-0.5 rounded text-xs font-mono text-[var(--color-slate-600)]">{searchId}</code>
                </p>
              </div>

              {status === "completed" && (
                <button 
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap rounded-xl transition-all duration-150 h-12 px-6 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-[var(--shadow-sm)] hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Award size={18} />
                  Guardar y Monitorear
                </button>
              )}
            </div>

            {/* ── Suggestions Chips ── */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-8 animate-fade-in">
                <span className="text-sm text-[var(--color-slate-500)] font-medium font-body mr-1">Ver también:</span>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.query)}
                    disabled={isSearching}
                    className="inline-flex items-center px-3.5 py-1.5 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] hover:text-[var(--color-slate-900)] text-sm font-medium rounded-full border border-[var(--color-slate-200)] transition-colors cursor-pointer font-body disabled:opacity-50"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Loading State / Skeleton Screen ── */}
            {(status === "pending" || status === "processing") && (
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                {/* Left Side: Store Status List */}
                <div className="md:col-span-1 bg-white rounded-2xl border border-[var(--color-slate-200)] p-6 shadow-[var(--shadow-sm)] h-fit">
                  <h3 className="font-display font-bold text-lg text-[var(--color-slate-900)] mb-4 flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-[var(--color-primary-600)]" />
                    Buscando en vivo...
                  </h3>
                  <p className="text-xs text-[var(--color-slate-400)] mb-6 font-body leading-relaxed">
                    Nuestros rastreadores están simulando visitas humanas para evadir bloqueos en tiempo real.
                  </p>
                  
                  <div className="space-y-4">
                    {expectedStores.map((store) => {
                      const hasResult = results.some(r => r.store_domain === store.domain);
                      return (
                        <div key={store.domain} className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-slate-100)] bg-[var(--color-slate-50)]">
                          <div className="flex items-center gap-3">
                            <img 
                              src={`https://www.google.com/s2/favicons?sz=64&domain=${store.domain}`} 
                              alt={store.name}
                              className="w-5 h-5 rounded-md object-contain"
                            />
                            <span className="text-sm font-semibold text-[var(--color-slate-700)]">{store.name}</span>
                          </div>
                          
                          {hasResult ? (
                            <div className="w-6 h-6 rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-600)] flex items-center justify-center">
                              <Check size={14} className="stroke-[3]" />
                            </div>
                          ) : (
                            <Loader2 size={16} className="animate-spin text-[var(--color-slate-400)]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side: Skeletons for Cards */}
                <div className="md:col-span-2 space-y-6">
                  <div className="text-center p-12 bg-white rounded-2xl border border-[var(--color-slate-200)] flex flex-col items-center justify-center shadow-[var(--shadow-sm)] animate-pulse">
                    <Loader2 size={40} className="animate-spin text-[var(--color-primary-600)] mb-4" />
                    <h3 className="text-xl font-bold text-[var(--color-slate-900)] mb-2 font-display">
                      Extrayendo especificaciones y stock
                    </h3>
                    <p className="text-sm text-[var(--color-slate-400)] max-w-sm font-body leading-relaxed">
                      Estamos parseando los precios actuales con Inteligencia Artificial. Esto tomará menos de 20 segundos...
                    </p>
                  </div>

                  {/* Loader Card Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-4 h-48 animate-pulse flex flex-col justify-between">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-[var(--color-slate-100)] rounded-xl" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-[var(--color-slate-200)] rounded w-3/4" />
                            <div className="h-3 bg-[var(--color-slate-200)] rounded w-1/2" />
                          </div>
                        </div>
                        <div className="h-8 bg-[var(--color-slate-200)] rounded w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Final Results View ── */}
            {status === "completed" && results.length > 0 && (
              <>
                {/* KPIs & IA Insight */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {/* KPIs */}
                  <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    {/* Min price */}
                    <button 
                      onClick={scrollToCheapestProduct}
                      className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-5 shadow-[var(--shadow-sm)] text-left hover:border-[var(--color-primary-500)] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-98 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] group"
                    >
                      <div className="text-xs font-semibold text-[var(--color-slate-400)] uppercase tracking-wider mb-2 group-hover:text-[var(--color-primary-500)] transition-colors">Precio Mínimo</div>
                      <div className="text-2xl font-extrabold text-[var(--color-primary-600)]">
                        ${dynamicKpis.min_price.toLocaleString("es-CL")}
                      </div>
                      <div className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                        <span>Mejor opción</span>
                        <span className="text-[10px] text-[var(--color-primary-400)] opacity-0 group-hover:opacity-100 transition-opacity font-normal">(ver producto)</span>
                      </div>
                    </button>

                    {/* Avg price */}
                    <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-5 shadow-[var(--shadow-sm)]">
                      <div className="text-xs font-semibold text-[var(--color-slate-400)] uppercase tracking-wider mb-2">Precio Promedio</div>
                      <div className="text-2xl font-extrabold text-[var(--color-slate-900)]">
                        ${dynamicKpis.avg_price.toLocaleString("es-CL")}
                      </div>
                      <div className="text-xs text-[var(--color-slate-400)] mt-1">Media del mercado</div>
                    </div>

                    {/* Max price */}
                    <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] p-5 shadow-[var(--shadow-sm)]">
                      <div className="text-xs font-semibold text-[var(--color-slate-400)] uppercase tracking-wider mb-2">Precio Máximo</div>
                      <div className="text-2xl font-extrabold text-[var(--color-danger-500)]">
                        ${dynamicKpis.max_price.toLocaleString("es-CL")}
                      </div>
                      <div className="text-xs text-[var(--color-slate-400)] mt-1">Tienda más cara</div>
                    </div>
                  </div>

                  {/* IA Insight Card */}
                  {dynamicAiInsight && (
                    <button 
                      onClick={scrollToCheapestProduct}
                      className="md:col-span-1 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-accent-100)] border border-[var(--color-primary-100)] rounded-2xl p-5 shadow-[var(--shadow-sm)] flex flex-col justify-between text-left hover:border-[var(--color-primary-300)] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-98 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] group w-full"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-[var(--color-primary-600)] animate-pulse" />
                        <span className="font-display font-bold text-sm text-[var(--color-primary-700)]">Insight de IA</span>
                      </div>
                      <p className="text-xs text-[var(--color-slate-700)] font-body leading-relaxed mb-1 flex-1 group-hover:text-[var(--color-primary-900)] transition-colors">
                        {dynamicAiInsight}
                      </p>
                      <div className="text-[10px] text-[var(--color-primary-600)] font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                        Haz click para ver la oferta más barata ↓
                      </div>
                    </button>
                  )}
                </div>

                {/* Botón de Filtros para Móviles (Solo visible en md o menores) */}
                <div className="lg:hidden mb-2">
                  <button
                    onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-[var(--color-slate-50)] text-[var(--color-slate-800)] font-bold text-xs rounded-2xl border border-[var(--color-slate-200)] transition-all shadow-[var(--shadow-xs)] cursor-pointer"
                  >
                    <Filter size={14} className="text-[var(--color-slate-500)]" />
                    {showFiltersMobile ? "Ocultar Filtros" : "Mostrar Filtros"}
                    {activeFiltersCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-[10px] font-bold rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Main section: Sidebar + Grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                  
                  {/* Sidebar Lateral de Filtros (Colapsable en móviles, visible por defecto en lg) */}
                  <div className={`lg:col-span-1 bg-white p-6 rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] space-y-6 lg:block ${
                    showFiltersMobile ? "block" : "hidden"
                  }`}>
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--color-slate-100)]">
                      <h4 className="font-display font-bold text-[var(--color-slate-900)] text-sm uppercase tracking-wider">Filtros</h4>
                      {(selectedBrands.length > 0 || selectedGenders.length > 0 || selectedVolumes.length > 0 || selectedTypes.length > 0 || selectedStores.length > 0 || minPriceFilter !== "" || maxPriceFilter !== "" || onlyInStock) && (
                        <button 
                          onClick={() => {
                            setSelectedBrands([]);
                            setSelectedGenders([]);
                            setSelectedVolumes([]);
                            setSelectedTypes([]);
                            setSelectedStores([]);
                            setMinPriceFilter("");
                            setMaxPriceFilter("");
                            setOnlyInStock(false);
                          }}
                          className="text-xs text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-bold cursor-pointer transition-colors"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

                    {/* Filtro de Stock */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-[var(--color-slate-700)]">
                        <input 
                          type="checkbox" 
                          checked={onlyInStock}
                          onChange={(e) => setOnlyInStock(e.target.checked)}
                          className="rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] border-[var(--color-slate-300)] w-4 h-4 cursor-pointer"
                        />
                        <span>Solo En Stock</span>
                      </label>
                    </div>

                    {/* Filtro de Marca */}
                    {filterOptions.brands.length > 1 && (
                      <div className="space-y-2.5 pt-4 border-t border-[var(--color-slate-100)]">
                        <h5 className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Marca</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                          {filterOptions.brands.map(brand => (
                            <label key={brand} className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[var(--color-slate-600)] font-body">
                              <input 
                                type="checkbox" 
                                checked={selectedBrands.includes(brand)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedBrands([...selectedBrands, brand]);
                                  else setSelectedBrands(selectedBrands.filter(b => b !== brand));
                                }}
                                className="rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] border-[var(--color-slate-300)] w-4 h-4 cursor-pointer"
                              />
                              <span>{brand}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filtro de Tienda */}
                    {filterOptions.stores.length > 1 && (
                      <div className="space-y-2.5 pt-4 border-t border-[var(--color-slate-100)]">
                        <h5 className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Tienda</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                          {filterOptions.stores.map(store => (
                            <label key={store} className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[var(--color-slate-600)] font-body">
                              <input 
                                type="checkbox" 
                                checked={selectedStores.includes(store)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedStores([...selectedStores, store]);
                                  else setSelectedStores(selectedStores.filter(s => s !== store));
                                }}
                                className="rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] border-[var(--color-slate-300)] w-4 h-4 cursor-pointer"
                              />
                              <span>{store}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filtro de Género */}
                    {filterOptions.genders.length > 1 && (
                      <div className="space-y-2.5 pt-4 border-t border-[var(--color-slate-100)]">
                        <h5 className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Género</h5>
                        <div className="space-y-2">
                          {filterOptions.genders.map(gender => (
                            <label key={gender} className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[var(--color-slate-600)] font-body">
                              <input 
                                type="checkbox" 
                                checked={selectedGenders.includes(gender)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedGenders([...selectedGenders, gender]);
                                  else setSelectedGenders(selectedGenders.filter(g => g !== gender));
                                }}
                                className="rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] border-[var(--color-slate-300)] w-4 h-4 cursor-pointer"
                              />
                              <span>{gender}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filtro de Volumen */}
                    {filterOptions.volumes.length > 1 && (
                      <div className="space-y-2.5 pt-4 border-t border-[var(--color-slate-100)]">
                        <h5 className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Volumen</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                          {filterOptions.volumes.map(vol => (
                            <label key={vol} className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[var(--color-slate-600)] font-body">
                              <input 
                                type="checkbox" 
                                checked={selectedVolumes.includes(vol)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedVolumes([...selectedVolumes, vol]);
                                  else setSelectedVolumes(selectedVolumes.filter(v => v !== vol));
                                }}
                                className="rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] border-[var(--color-slate-300)] w-4 h-4 cursor-pointer"
                              />
                              <span>{vol}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filtro de Presentación (Tipo) */}
                    {filterOptions.types.length > 1 && (
                      <div className="space-y-2.5 pt-4 border-t border-[var(--color-slate-100)]">
                        <h5 className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Tipo</h5>
                        <div className="space-y-2">
                          {filterOptions.types.map(t => (
                            <label key={t} className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[var(--color-slate-600)] font-body">
                              <input 
                                type="checkbox" 
                                checked={selectedTypes.includes(t)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedTypes([...selectedTypes, t]);
                                  else setSelectedTypes(selectedTypes.filter(type => type !== t));
                                }}
                                className="rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] border-[var(--color-slate-300)] w-4 h-4 cursor-pointer"
                              />
                              <span>{t}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filtro de Rango de Precio */}
                    <div className="space-y-2.5 pt-4 border-t border-[var(--color-slate-100)]">
                      <h5 className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider">Precio (CLP)</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-[var(--color-slate-400)] block font-bold uppercase mb-0.5">Min</label>
                          <input 
                            type="number" 
                            placeholder={filterOptions.minPrice > 0 ? filterOptions.minPrice.toString() : "Min"}
                            value={minPriceFilter}
                            onChange={(e) => setMinPriceFilter(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full text-xs p-2 rounded-xl border border-[var(--color-slate-200)] focus:outline-none focus:border-[var(--color-primary-500)] font-body"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-[var(--color-slate-400)] block font-bold uppercase mb-0.5">Max</label>
                          <input 
                            type="number" 
                            placeholder={filterOptions.maxPrice > 0 ? filterOptions.maxPrice.toString() : "Max"}
                            value={maxPriceFilter}
                            onChange={(e) => setMaxPriceFilter(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full text-xs p-2 rounded-xl border border-[var(--color-slate-200)] focus:outline-none focus:border-[var(--color-primary-500)] font-body"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results Grid container */}
                  <div className="lg:col-span-3">
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                      {groupedProducts.map((group: any) => {
                        return (
                          <div 
                            id={`product-${group.id}`}
                            key={group.id} 
                            className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-500 ${
                              highlightedProductId === group.id 
                                ? "border-[var(--color-primary-500)] ring-4 ring-[var(--color-primary-100)] scale-[1.03] shadow-[var(--shadow-md)] z-10" 
                                : "border-[var(--color-slate-200)] hover:border-[var(--color-primary-600)] shadow-[var(--shadow-sm)] hover:shadow-md hover:-translate-y-0.5"
                            }`}
                          >
                            
                            {/* Top: Image & Tag */}
                            <div className="p-5 border-b border-[var(--color-slate-100)] relative flex items-center justify-center min-h-[160px] bg-[var(--color-slate-50)]">
                              {group.image_url ? (
                                <img 
                                  src={group.image_url} 
                                  alt={group.title} 
                                  className="max-h-32 max-w-full object-contain mix-blend-multiply"
                                />
                              ) : (
                                <ShoppingBag size={48} className="text-[var(--color-slate-300)]" />
                              )}

                              {/* Store Favicon Tag (Only if 1 store) */}
                              {group.stores.length === 1 && (
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border border-[var(--color-slate-200)] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-[var(--shadow-xs)]">
                                  <img 
                                    src={`https://www.google.com/s2/favicons?sz=64&domain=${group.stores[0].store_domain}`} 
                                    alt={group.stores[0].store_name}
                                    className="w-4 h-4 rounded-sm object-contain"
                                  />
                                  <span className="text-[10px] font-bold text-[var(--color-slate-700)] tracking-tight">{group.stores[0].store_name}</span>
                                </div>
                              )}

                              {/* Stock Status Badge */}
                              <div className="absolute top-4 right-4">
                                {group.in_stock ? (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 uppercase">
                                    Stock
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200 uppercase">
                                    Agotado
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Middle: Details */}
                            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                              <div className="space-y-2">
                                {/* Marca arriba en mayúsculas (Referencia Imagen) */}
                                {group.brand && group.brand !== "Genérico" && (
                                  <span className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider block mb-1">
                                    {group.brand}
                                  </span>
                                )}

                                {/* Título limpio y formateado con volumen, etc. */}
                                <h3 className="font-display font-bold text-[var(--color-slate-900)] text-sm line-clamp-3 leading-snug hover:text-[var(--color-primary-700)] transition-colors">
                                  {group.title}
                                </h3>

                                {/* Código / SKU abajo del título (Referencia Imagen) */}
                                {group.sku && (
                                  <span className="text-[10px] text-[var(--color-slate-400)] block font-body mt-1.5">
                                    Código: {group.sku}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-1.5 pt-2">
                                <div className="flex items-center justify-between">
                                  {/* Price Section destacado en Verde Oscuro (Referencia Imagen) */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {group.min_price > 0 ? (
                                      <>
                                        <div className="text-2xl font-extrabold text-[#15803d] tracking-tight leading-none">
                                          ${group.min_price.toLocaleString("es-CL")}
                                        </div>
                                        {group.stores.length > 1 && (
                                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded-full border border-green-200 whitespace-nowrap">
                                            {group.stores.length} tienda(s)
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-xs font-semibold text-[var(--color-slate-400)] font-body">Sin resultados</span>
                                    )}
                                  </div>

                                  {/* Discount Badge */}
                                  {group.stores[0].discount_pct && group.stores[0].discount_pct > 0 ? (
                                    <span className="px-2 py-1 bg-[var(--color-danger-50)] text-[var(--color-danger-500)] text-xs font-extrabold rounded-lg border border-[var(--color-danger-50)]">
                                      -{group.stores[0].discount_pct}%
                                    </span>
                                  ) : null}
                                </div>

                                {/* Diferencia máxima si hay más de 1 tienda */}
                                {group.stores.length > 1 && group.max_price > group.min_price && (
                                  <div className="text-[11px] text-[var(--color-slate-500)] font-medium font-body">
                                    Diferencia máxima: ${(group.max_price - group.min_price).toLocaleString("es-CL")}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bottom: Action Link or Stores List */}
                            {group.stores.length > 1 ? (
                              <div className="mx-5 mb-5 space-y-2 pt-3 border-t border-[var(--color-slate-100)] border-dashed">
                                <span className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider block mb-1">Ofertas por Tienda:</span>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                                  {group.stores.map((store: any) => (
                                    <div key={store.id} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-[var(--color-slate-100)] last:border-b-0">
                                      <div className="flex items-center gap-2">
                                        <img 
                                          src={`https://www.google.com/s2/favicons?sz=32&domain=${store.store_domain}`} 
                                          alt={store.store_name}
                                          className="w-3.5 h-3.5 rounded-sm object-contain flex-shrink-0"
                                        />
                                        <span className="font-semibold text-[var(--color-slate-700)]">{store.store_name}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-[#15803d]">${store.price.toLocaleString("es-CL")}</span>
                                        <a 
                                          href={store.product_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2 py-0.5 bg-[var(--color-slate-100)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] text-[var(--color-slate-700)] font-bold rounded-lg transition-colors flex items-center gap-1"
                                        >
                                          Ver <ExternalLink size={10} />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : group.stores[0]?.product_url ? (
                              <a 
                                href={group.stores[0].product_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="m-5 mt-0 h-10 bg-[var(--color-slate-100)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] text-[var(--color-slate-700)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                Ver en tienda
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <div className="m-5 mt-0 h-10 bg-[var(--color-slate-50)] text-[var(--color-slate-400)] font-semibold text-xs rounded-xl flex items-center justify-center select-none border border-[var(--color-slate-100)] font-body">
                                No disponible
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Empty State ── */}
            {status === "completed" && results.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] max-w-xl mx-auto flex flex-col items-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-slate-900)] mb-2 font-display">No se encontraron resultados</h3>
                <p className="text-[var(--color-slate-500)] text-sm max-w-sm mb-6 leading-relaxed font-body">
                  No hemos podido extraer coincidencias de este producto en ninguna de las tiendas correspondientes a esta categoría. Intenta buscar con términos más amplios o marcas específicas.
                </p>
                <Link 
                  href={user ? "/dashboard" : "/"}
                  className="px-5 py-2.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-sm rounded-xl shadow transition-all cursor-pointer"
                >
                  Nueva Búsqueda
                </Link>
              </div>
            )}

            {/* ── Hard Failure State ── */}
            {status === "failed" && (
              <div className="text-center py-20 bg-white rounded-2xl border border-[var(--color-slate-200)] shadow-[var(--shadow-sm)] max-w-xl mx-auto flex flex-col items-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-slate-900)] mb-2 font-display">Error en la orquestación del rastreador</h3>
                <p className="text-[var(--color-slate-500)] text-sm max-w-sm mb-6 leading-relaxed font-body">
                  Ocurrió un problema técnico interno al despachar los workers en segundo plano. La tarea se dio de baja.
                </p>
                <button 
                  onClick={() => { setStatus("pending"); fetchResults(); pollIntervalRef.current = setInterval(fetchResults, 1800); }}
                  className="px-5 py-2.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-sm rounded-xl shadow transition-all cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <Footer />

      {/* ── Register Modal for Guest Users ── */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] max-w-md w-full p-8 shadow-[var(--shadow-lg)] relative flex flex-col gap-6">
            <button 
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 text-[var(--color-slate-400)] hover:text-[var(--color-slate-600)] cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] flex items-center justify-center mx-auto">
                <Sparkles size={24} />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-[var(--color-slate-900)]">
                Guarda este monitoreo
              </h3>
              <p className="text-sm text-[var(--color-slate-500)] font-body leading-relaxed">
                ¡Registra tu cuenta gratis hoy para guardar este producto como proyecto analítico, graficar su evolución de precios histórica y recibir alertas instantáneas por email!
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link 
                href="/register" 
                className="w-full py-3.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-center rounded-xl text-sm transition-all shadow hover:shadow-md cursor-pointer"
              >
                Registrarme Gratis
              </Link>
              <Link 
                href="/login" 
                className="w-full py-3.5 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl text-sm transition-colors cursor-pointer"
              >
                Tengo Cuenta (Iniciar Sesión)
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Register Limit Modal for Guest Users ── */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[var(--color-slate-200)] max-w-md w-full p-8 shadow-[var(--shadow-lg)] relative flex flex-col gap-6">
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-[var(--color-slate-400)] hover:text-[var(--color-slate-600)] cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert size={24} />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-[var(--color-slate-900)]">
                Límite de Invitado Alcanzado
              </h3>
              <p className="text-sm text-[var(--color-slate-500)] font-body leading-relaxed">
                Has alcanzado tu límite de **5 búsquedas gratuitas** como invitado. ¡Registra tu cuenta gratis en menos de 30 segundos para desbloquear búsquedas ilimitadas, alertas de precio e histórico completo!
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link 
                href="/register" 
                className="w-full py-3.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold text-center rounded-xl text-sm transition-all shadow hover:shadow-md cursor-pointer"
              >
                Crear Mi Cuenta Gratis
              </Link>
              <Link 
                href="/login" 
                className="w-full py-3.5 bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] text-[var(--color-slate-700)] font-bold text-center rounded-xl text-sm transition-colors cursor-pointer"
              >
                Ya tengo cuenta (Iniciar Sesión)
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
