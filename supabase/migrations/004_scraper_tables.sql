-- 004_scraper_tables.sql
-- PriceScout Chile — Individual Store Scraper Schemas
-- ═══════════════════════════════════════════════════════════════════════════

-- Tiendas registradas
CREATE TABLE IF NOT EXISTS public.stores (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    sync_method TEXT NOT NULL,
    catalog_url TEXT,
    active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_sync_products_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos normalizados (uno por tienda)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_slug TEXT REFERENCES public.stores(slug) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_normalized TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'CLP',
    url TEXT NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    volume_ml INTEGER,
    variants JSONB DEFAULT '[]',
    raw_data JSONB,
    sync_method TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_slug, title_normalized)
);

-- Historial de precios (serie temporal para productos de tiendas)
-- Se renombra a product_price_history para evitar colisión con la tabla price_history de monitoreo de proyectos
CREATE TABLE IF NOT EXISTS public.product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    store_slug TEXT NOT NULL,
    title_normalized TEXT NOT NULL,
    price NUMERIC NOT NULL,
    available BOOLEAN DEFAULT true,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_products_title_normalized ON public.products(title_normalized);
CREATE INDEX IF NOT EXISTS idx_products_store_slug ON public.products(store_slug);
CREATE INDEX IF NOT EXISTS idx_product_price_history_product_id ON public.product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_recorded_at ON public.product_price_history(recorded_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir lectura pública
CREATE POLICY "Allow public read access on stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Allow public read access on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public read access on product_price_history" ON public.product_price_history FOR SELECT USING (true);

-- Permitir escritura total a service_role (Celery worker / backend admin)
CREATE POLICY "Allow service_role write on stores" ON public.stores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role write on products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role write on product_price_history" ON public.product_price_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Otorgar permisos de tabla
GRANT ALL ON TABLE public.stores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_price_history TO anon, authenticated, service_role;
