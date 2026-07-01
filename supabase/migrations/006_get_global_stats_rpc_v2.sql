-- 006_get_global_stats_rpc_v2.sql
-- Actualiza la función RPC para retornar datos de crecimiento 100% reales sin fallbacks artificiales
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS json AS $$
DECLARE
    total_prices integer;
    unique_products integer;
    active_stores integer;
    prices_today_count integer;
    products_today_count integer;
    stores_this_week_count integer;
BEGIN
    -- Contar el total de precios registrados (filas en products)
    SELECT COALESCE(count(*), 0) INTO total_prices FROM public.products;
    
    -- Contar los productos comparados únicos (títulos normalizados únicos)
    SELECT COALESCE(count(DISTINCT title_normalized), 0) INTO unique_products FROM public.products;
    
    -- Contar las tiendas activas (filas en stores con active = true)
    SELECT COALESCE(count(*), 0) INTO active_stores FROM public.stores WHERE active = true;
    
    -- Contar los precios nuevos registrados hoy (últimas 24 horas)
    SELECT COALESCE(count(*), 0) INTO prices_today_count FROM public.products WHERE first_seen_at >= timezone('utc', now())::date;
    
    -- Contar los productos únicos nuevos descubiertos hoy
    SELECT COALESCE(count(DISTINCT title_normalized), 0) INTO products_today_count FROM public.products WHERE first_seen_at >= timezone('utc', now())::date;
    
    -- Contar las tiendas nuevas registradas en los últimos 7 días
    SELECT COALESCE(count(*), 0) INTO stores_this_week_count FROM public.stores WHERE created_at >= now() - interval '7 days';
    
    RETURN json_build_object(
        'prices_registered', total_prices,
        'prices_today', prices_today_count,
        'products_compared', unique_products,
        'products_today', products_today_count,
        'stores_active', active_stores,
        'stores_this_week', stores_this_week_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución para anon, authenticated y service_role
GRANT EXECUTE ON FUNCTION public.get_global_stats() TO anon, authenticated, service_role;
