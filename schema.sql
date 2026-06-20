-- ====================================================================
-- ESQUEMA DE BASE DE DATOS - GESTOR DE CRÉDITOS Y COBRANZA (VIKOTECH)
-- ====================================================================

-- 1. Habilitar la extensión para generación de UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Perfiles (profiles)
-- Vinculado a la tabla de autenticación de Supabase (auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    role TEXT DEFAULT 'owner' NOT NULL CHECK (role IN ('owner', 'admin')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Deudores/Clientes (debtors)
CREATE TABLE IF NOT EXISTS public.debtors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    phone TEXT NOT NULL CHECK (length(trim(phone)) >= 8),
    total_debt NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (total_debt >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Planes de Pago (payment_plans)
-- Define las cuotas programadas para cada deudor
CREATE TABLE IF NOT EXISTS public.payment_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debtor_id UUID REFERENCES public.debtors(id) ON DELETE CASCADE NOT NULL,
    amount_due NUMERIC(10, 2) NOT NULL CHECK (amount_due > 0),
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Historial de Abonos/Pagos (payments)
-- Registra cada abono físico en efectivo hecho a un plan de pagos
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES public.payment_plans(id) ON DELETE CASCADE NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
    paid_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- CONFIGURACIÓN DE SEGURIDAD (RLS - Row Level Security)
-- ====================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir todas las operaciones solo a usuarios autenticados
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a usuarios autenticados" ON public.debtors
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a usuarios autenticados" ON public.payment_plans
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a usuarios autenticados" ON public.payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================================================
-- TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ====================================================================

-- Función para crear el perfil automáticamente cuando un usuario se registra en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para asociar auth.users con profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ====================================================================
-- MIGRACIONES INDIVIDUALES (Para bases de datos ya existentes)
-- ====================================================================
-- ALTER TABLE public.payment_plans ADD COLUMN IF NOT EXISTS description TEXT;

