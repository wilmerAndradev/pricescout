-- ═══════════════════════════════════════════════════════════════════════════
-- PriceScout Chile v4.0 — Security Hardening Migration
-- Revokes excessive table privileges and tightens RLS policies
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Revoke public/anon/authenticated excessive privileges on all public tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 2. Grant SELECT only on public lookup/catalog tables
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_price_history TO anon, authenticated;

-- 3. Grant SELECT on user tables (RLS policies will filter rows accordingly)
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.alert_events TO authenticated;
GRANT SELECT ON public.price_results TO authenticated;
GRANT SELECT ON public.price_history TO authenticated;
GRANT SELECT ON public.search_results TO anon, authenticated;

-- 4. Grant write/read permissions on user managed tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.environments TO authenticated;
GRANT SELECT, INSERT ON public.comparison_jobs TO authenticated;
GRANT SELECT, INSERT ON public.searches TO anon, authenticated;

-- 5. Correct RLS policies for searches
DROP POLICY IF EXISTS "Allow updating own searches" ON public.searches;
CREATE POLICY "Allow service_role to update searches" ON public.searches
    FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- 6. Correct RLS policies for price_results
DROP POLICY IF EXISTS "Allow background workers to insert" ON public.price_results;
CREATE POLICY "Allow background workers to insert" ON public.price_results
    FOR INSERT TO service_role WITH CHECK (true);

-- 7. Correct RLS policies for search_results
DROP POLICY IF EXISTS "Anyone can insert search_results" ON public.search_results;
CREATE POLICY "Allow service_role to insert search_results" ON public.search_results
    FOR INSERT TO service_role WITH CHECK (true);

-- 8. Correct RLS policies for price_history
DROP POLICY IF EXISTS "Anyone can insert into price_history" ON public.price_history;
CREATE POLICY "Allow service_role to insert into price_history" ON public.price_history
    FOR INSERT TO service_role WITH CHECK (true);
