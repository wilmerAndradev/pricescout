-- 003_srs_v4_tables.sql
-- PriceScout Chile v4.0 — Autonomous Product Name Search Engine Schemas
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tabla de entornos (environments) para clientes Pro/Business
CREATE TABLE IF NOT EXISTS public.environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'autonomous', -- 'autonomous' | 'manual'
    store_domains TEXT[] DEFAULT '{}',
    custom_domains TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de búsquedas (searches)
CREATE TABLE IF NOT EXISTS public.searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable para invitados
    query TEXT NOT NULL,
    query_normalized TEXT NOT NULL,
    category_inferred TEXT,
    environment_id UUID REFERENCES public.environments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de resultados de búsqueda (search_results)
CREATE TABLE IF NOT EXISTS public.search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
    store_domain TEXT NOT NULL,
    store_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    title TEXT NOT NULL,
    price_clp INTEGER NOT NULL,
    original_price_clp INTEGER,
    discount_pct INTEGER,
    image_url TEXT,
    description TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    extraction_method TEXT NOT NULL DEFAULT 'deterministic', -- 'deterministic' | 'llm'
    confidence_score TEXT DEFAULT 'medium', -- 'high' | 'medium' | 'low'
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de proyectos de monitoreo (projects)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    search_query TEXT NOT NULL,
    environment_id UUID REFERENCES public.environments(id) ON DELETE SET NULL,
    refresh_frequency_hours INTEGER NOT NULL DEFAULT 24,
    last_refreshed_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de historial de precios (price_history)
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    store_domain TEXT NOT NULL,
    price_clp INTEGER NOT NULL,
    original_price_clp INTEGER,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Habilitar RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Políticas RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- Políticas para environments
CREATE POLICY "Users can manage own environments" ON public.environments
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para searches
CREATE POLICY "Anyone can insert searches" ON public.searches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own or guest searches" ON public.searches
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow updating own searches" ON public.searches
    FOR UPDATE USING (user_id IS NULL OR auth.uid() = user_id) WITH CHECK (true);

-- Políticas para search_results
CREATE POLICY "Anyone can insert search_results" ON public.search_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view search_results" ON public.search_results
    FOR SELECT USING (true);

-- Políticas para projects
CREATE POLICY "Users can manage own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para price_history
CREATE POLICY "Users can view price history for own projects" ON public.price_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = price_history.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert into price_history" ON public.price_history
    FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Permisos
-- ═══════════════════════════════════════════════════════════════════════════
GRANT ALL ON TABLE public.environments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.searches TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.search_results TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.price_history TO anon, authenticated, service_role;
