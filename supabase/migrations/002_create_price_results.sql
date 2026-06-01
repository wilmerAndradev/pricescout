-- 002_create_price_results.sql
-- Creates the price_results table to store scraped data.

CREATE TABLE IF NOT EXISTS public.price_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL, -- Ties to the Celery Job ID
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    price INTEGER NOT NULL,
    image_url TEXT,
    source_url TEXT NOT NULL,
    store_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.price_results ENABLE ROW LEVEL SECURITY;

-- Users can read their own results
CREATE POLICY "Users can view their own price results"
    ON public.price_results
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow background workers (Celery) using anon key to insert results
CREATE POLICY "Allow background workers to insert"
    ON public.price_results
    FOR INSERT
    TO anon, service_role, authenticated
    WITH CHECK (true);

-- Grant table-level permissions (required in addition to RLS policies)
GRANT INSERT ON public.price_results TO anon, authenticated;
GRANT SELECT ON public.price_results TO anon, authenticated;
