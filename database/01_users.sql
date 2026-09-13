-- =====================================================
-- Tabla: users (Extensión de auth.users de Supabase)
-- =====================================================

-- Crear tabla de perfiles de usuarios
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    discord_id TEXT UNIQUE,
    discord_username TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin', 'staff', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON public.users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes para evitar errores
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;

-- Crear función para verificar rol sin recursión
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role FROM public.users
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Los admins y owners pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON public.users FOR SELECT
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'owner')
    );

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Los admins y owners pueden actualizar cualquier perfil
CREATE POLICY "Admins can update any profile"
    ON public.users FOR UPDATE
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'owner')
    );
