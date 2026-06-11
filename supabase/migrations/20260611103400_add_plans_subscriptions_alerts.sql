-- ═══════════════════════════════════════════════════════════════════════════
-- PriceScout Chile v4.0 — plans, subscriptions, payment_transactions, alerts & alert_events
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tabla de planes (plans)
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_clp INTEGER NOT NULL,
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
    searches_per_month INTEGER NOT NULL, -- -1 para ilimitado
    stores_per_search INTEGER NOT NULL,  -- -1 para ilimitado
    projects_max INTEGER NOT NULL,       -- -1 para ilimitado
    refresh_frequency_hours INTEGER,      -- Frecuencia de refresco en horas (NULL para Gratis)
    price_monthly_clp INTEGER NOT NULL,  -- Requerido por reglas de @database
    price_annual_clp INTEGER NOT NULL,   -- Requerido por reglas de @database
    alerts_limit INTEGER NOT NULL,       -- Límite de alertas para compatibilidad
    history_days INTEGER NOT NULL,       -- Días de historial para compatibilidad
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.plans IS 'Catálogo de planes SaaS con sus límites de búsquedas, proyectos, frecuencia de refresco y precios.';

-- 2. Poblar la tabla de planes con compatibilidad para facturación mensual/anual
INSERT INTO public.plans (id, name, price_clp, billing_interval, searches_per_month, stores_per_search, projects_max, refresh_frequency_hours, price_monthly_clp, price_annual_clp, alerts_limit, history_days, features)
VALUES
  ('gratis', 'Gratis', 0, 'month', 10, 5, 0, NULL, 0, 0, 0, 0, '["Imagen y descripción", "Dashboard básico"]'::jsonb),
  
  ('starter_monthly', 'Starter Mensual', 4990, 'month', 100, 10, 5, 24, 4990, 47904, 5, 30, '["Búsquedas avanzadas", "Historial 30 días", "Exportación CSV", "Dashboard completo"]'::jsonb),
  ('starter_yearly', 'Starter Anual', 47904, 'year', 100, 10, 5, 24, 4990, 47904, 5, 30, '["Búsquedas avanzadas", "Historial 30 días", "Exportación CSV", "Dashboard completo", "20% Descuento"]'::jsonb),
  
  ('pro_monthly', 'Pro Mensual', 12990, 'month', -1, 20, 50, 6, 12990, 124704, -1, 365, '["Búsquedas ilimitadas", "Modo Configurado", "Historial 1 año", "Exportación Excel/PDF", "Soporte prioritario"]'::jsonb),
  ('pro_yearly', 'Pro Anual', 124704, 'year', -1, 20, 50, 6, 12990, 124704, -1, 365, '["Búsquedas ilimitadas", "Modo Configurado", "Historial 1 año", "Exportación Excel/PDF", "Soporte prioritario", "20% Descuento"]'::jsonb),
  
  ('business_monthly', 'Business Mensual', 29990, 'month', -1, -1, -1, 2, 29990, 287904, -1, 1095, '["Sin límites de tiendas", "Dominios personalizados", "Acceso API", "Soporte dedicado", "Resumen semanal"]'::jsonb),
  ('business_yearly', 'Business Anual', 287904, 'year', -1, -1, -1, 2, 29990, 287904, -1, 1095, '["Sin límites de tiendas", "Dominios personalizados", "Acceso API", "Soporte dedicado", "Resumen semanal", "20% Descuento"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_clp = EXCLUDED.price_clp,
  billing_interval = EXCLUDED.billing_interval,
  searches_per_month = EXCLUDED.searches_per_month,
  stores_per_search = EXCLUDED.stores_per_search,
  projects_max = EXCLUDED.projects_max,
  refresh_frequency_hours = EXCLUDED.refresh_frequency_hours,
  price_monthly_clp = EXCLUDED.price_monthly_clp,
  price_annual_clp = EXCLUDED.price_annual_clp,
  alerts_limit = EXCLUDED.alerts_limit,
  history_days = EXCLUDED.history_days,
  features = EXCLUDED.features;

-- 3. Modificar la tabla profiles para asociar a plans
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'plan_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN plan_id TEXT REFERENCES public.plans(id) DEFAULT 'gratis' NOT NULL;
    END IF;
END $$;

-- 4. Tabla de suscripciones (subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE, -- Una suscripción activa/cancelada por usuario
    plan_id TEXT REFERENCES public.plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    transbank_token TEXT,
    transbank_buy_order TEXT,
    payment_method TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.subscriptions IS 'Historial y suscripción activa de los usuarios de PriceScout Chile.';

-- 5. Tabla de transacciones de pago (payment_transactions)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES public.plans(id) ON DELETE RESTRICT,
    is_annual BOOLEAN NOT NULL DEFAULT FALSE,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('initiated', 'approved', 'rejected', 'failed')),
    buy_order TEXT UNIQUE NOT NULL,
    session_id TEXT,
    token TEXT UNIQUE,
    authorization_code TEXT,
    payment_type_code TEXT,
    response_code INTEGER,
    transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.payment_transactions IS 'Registro de transacciones de pago iniciadas y confirmadas en Transbank.';

-- 6. Tabla de alertas (alerts)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('price_drop', 'new_market_low', 'price_change', 'restock')),
    threshold_value NUMERIC, -- Umbral de precio para alerta de bajada de precio
    channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'slack', 'all')) DEFAULT 'email',
    slack_webhook_url TEXT,  -- Webhook de Slack opcional para integraciones de plan Business
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.alerts IS 'Alertas de precios o stock configuradas por los usuarios para proyectos específicos.';

-- 7. Tabla de registro de alertas disparadas (alert_events)
CREATE TABLE IF NOT EXISTS public.alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
    triggered_price NUMERIC NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.alert_events IS 'Log y registro histórico de alertas disparadas.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Índices para optimización de consultas
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_buy_order ON public.payment_transactions(buy_order);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_project_id ON public.alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON public.alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_events_alert_id ON public.alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_triggered_at ON public.alert_events(triggered_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- Habilitar RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Políticas RLS con comentarios
-- ═══════════════════════════════════════════════════════════════════════════

-- Políticas para plans
-- Permite a cualquier usuario (anon u authenticated) consultar la lista de planes y sus límites para mostrar en UI/onboarding
CREATE POLICY "Allow public read access on plans" ON public.plans
    FOR SELECT USING (true);

-- Políticas para subscriptions
-- Permite a los usuarios visualizar su propio estado de suscripción activa y límites correspondientes
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Políticas para payment_transactions
-- Permite a los usuarios visualizar sus propias transacciones de pago históricas
CREATE POLICY "Users can view own payment transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Políticas para alerts
-- Permite a los usuarios ver las alertas que han configurado
CREATE POLICY "Users can view own alerts" ON public.alerts
    FOR SELECT USING (auth.uid() = user_id);

-- Permite a los usuarios insertar alertas asociadas a su propio perfil
CREATE POLICY "Users can insert own alerts" ON public.alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permite a los usuarios actualizar los criterios de sus propias alertas
CREATE POLICY "Users can update own alerts" ON public.alerts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Permite a los usuarios eliminar sus alertas configuradas
CREATE POLICY "Users can delete own alerts" ON public.alerts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para alert_events
-- Permite a los usuarios visualizar el historial de eventos que se hayan disparado para sus propias alertas
CREATE POLICY "Users can view own alert events" ON public.alert_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.alerts
            WHERE alerts.id = alert_events.alert_id
              AND alerts.user_id = auth.uid()
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- Triggers y funciones SQL
-- ═══════════════════════════════════════════════════════════════════════════

-- Triggers de timestamp updated_at
CREATE TRIGGER plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER payment_transactions_updated_at
    BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER alerts_updated_at
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Función y trigger para sincronizar el plan activo del usuario en la tabla profiles
CREATE OR REPLACE FUNCTION public.sync_user_plan_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_default_plan_id TEXT := 'gratis'; -- Plan Gratis
    v_new_plan_id TEXT;
BEGIN
    -- Si la suscripción insertada o actualizada está activa o trialing, asignamos el plan correspondiente
    IF NEW.status IN ('active', 'trialing') THEN
        v_new_plan_id := NEW.plan_id;
    ELSE
        -- Si pasa a cancelado, expirado o mora, buscamos si tiene otra suscripción activa
        SELECT plan_id INTO v_new_plan_id
        FROM public.subscriptions
        WHERE user_id = NEW.user_id 
          AND status IN ('active', 'trialing') 
          AND id <> NEW.id
        ORDER BY created_at DESC
        LIMIT 1;

        -- Si no hay ninguna suscripción activa, se degrada al plan Gratis por defecto
        IF v_new_plan_id IS NULL THEN
            v_new_plan_id := v_default_plan_id;
        END IF;
    END IF;

    -- Actualizar plan en profiles
    UPDATE public.profiles
    SET plan_id = v_new_plan_id
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_subscription_changes
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_plan_from_subscription();

-- Manejar la remoción de suscripciones de manera segura para restaurar el plan default
CREATE OR REPLACE FUNCTION public.sync_user_plan_from_subscription_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_default_plan_id TEXT := 'gratis'; -- Plan Gratis
    v_new_plan_id TEXT;
BEGIN
    -- Buscar si tiene alguna otra suscripción activa
    SELECT plan_id INTO v_new_plan_id
    FROM public.subscriptions
    WHERE user_id = OLD.user_id 
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si no hay suscripciones vigentes, restaurar plan Gratis
    IF v_new_plan_id IS NULL THEN
        v_new_plan_id := v_default_plan_id;
    END IF;

    -- Actualizar plan en profiles
    UPDATE public.profiles
    SET plan_id = v_new_plan_id
    WHERE id = OLD.user_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_subscription_delete
    AFTER DELETE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_plan_from_subscription_delete();

-- ═══════════════════════════════════════════════════════════════════════════
-- Permisos a roles de Supabase
-- ═══════════════════════════════════════════════════════════════════════════
GRANT ALL ON TABLE public.plans TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.payment_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.alerts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.alert_events TO anon, authenticated, service_role;
