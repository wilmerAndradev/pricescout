-- ============================================================
-- 002_search_optimization.sql
-- PostgreSQL Full-Text Search para PriceScout Chile
-- Ejecutado: 2026-06-09 en Supabase proyecto huuushbufseumwwyrphd
-- ============================================================

-- 1. Columna tsvector para búsqueda vectorizada
ALTER TABLE products
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Índice GIN para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_products_search_vector
ON products USING GIN(search_vector);

-- 3. Poblar datos existentes
UPDATE products
SET search_vector = to_tsvector('simple',
  coalesce(title_normalized, '') || ' ' || coalesce(title, '')
)
WHERE search_vector IS NULL;

-- 4. Trigger para mantener search_vector actualizado automáticamente
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.title_normalized, '') || ' ' || coalesce(NEW.title, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search_vector ON products;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- 5. Función RPC search_products — Búsqueda Jerárquica No Excluyente
--    - OR filtra: cualquier palabra del query es suficiente para aparecer
--    - Score compuesto (AND*0.7 + OR*0.3) ordena por relevancia descendente
--    - Nunca excluye estuches, variantes de ml ni productos relacionados
CREATE OR REPLACE FUNCTION search_products(
    query_text     text,
    result_limit   int  DEFAULT 50,
    result_offset  int  DEFAULT 0,
    filter_store   text DEFAULT NULL
)
RETURNS TABLE (
    id               uuid,
    title            text,
    title_normalized text,
    store_slug       text,
    store_name       text,
    price            numeric,
    currency         text,
    url              text,
    image_url        text,
    available        boolean,
    volume_ml        integer,
    last_seen_at     timestamptz,
    rank             float4
) AS $$
DECLARE
    ts_query_or  tsquery;
    ts_query_and tsquery;
    tokens text[];
BEGIN
    -- Extraer tokens del input del usuario via tsvector lexemes
    tokens := array(
        SELECT lexeme
        FROM unnest(to_tsvector('simple', query_text))
    );

    -- Si no hay tokens válidos, retornar vacío
    IF array_length(tokens, 1) IS NULL THEN
        RETURN;
    END IF;

    -- OR query: cualquier token basta para aparecer en resultados (no excluye nada)
    ts_query_or  := to_tsquery('simple', array_to_string(tokens, ' | '));
    -- AND query: usado SOLO para calcular el score de relevancia, no filtra
    ts_query_and := to_tsquery('simple', array_to_string(tokens, ' & '));

    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.title_normalized,
        p.store_slug,
        COALESCE(s.name, p.store_slug) AS store_name,
        p.price,
        p.currency,
        p.url,
        p.image_url,
        p.available,
        p.volume_ml,
        p.last_seen_at,
        -- Score compuesto: 70% AND + 30% OR
        -- Productos con MÁS palabras del query → score más alto → aparecen primero
        (
            ts_rank(p.search_vector, ts_query_and) * 0.7 +
            ts_rank(p.search_vector, ts_query_or)  * 0.3
        )::float4 AS rank
    FROM products p
    LEFT JOIN stores s ON s.slug = p.store_slug
    WHERE
        -- Filtrar SOLO por OR: cualquier palabra del query es suficiente
        p.search_vector @@ ts_query_or
        AND (filter_store IS NULL OR p.store_slug = filter_store)
        AND p.available = true
    ORDER BY
        rank DESC,
        p.price ASC
    LIMIT result_limit
    OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
