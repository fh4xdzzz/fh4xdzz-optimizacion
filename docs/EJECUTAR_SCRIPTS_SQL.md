# 📋 Guía para Ejecutar Scripts SQL en Supabase

**Proyecto:** TheDulcanDesign
**Fecha:** 13/09/2026
**Objetivo:** Ejecutar los 7 scripts SQL para crear la base de datos

---

## 🎯 Instrucciones Paso a Paso

### Paso 1: Abrir Supabase SQL Editor

1. Ve a: https://supabase.com/dashboard/project/wbkgesmnyjnomctdvxqb/sql/new
2. Deberías ver un editor SQL vacío

### Paso 2: Ejecutar Script 1 - 01_users.sql

1. Copia el siguiente código SQL completo:

```sql
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
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin', 'staff')),
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

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Los admins pueden actualizar cualquier perfil
CREATE POLICY "Admins can update any profile"
    ON public.users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

2. Pégalo en el SQL Editor
3. Click en el botón "Run" (presiona Ctrl+Enter)
4. Espera a que termine (debería decir "Success" en verde)
5. **No cierres el editor**, sigue al siguiente script

### Paso 3: Ejecutar Script 2 - 02_services.sql

1. Copia el código de `database/02_services.sql` del proyecto
2. Pégalo en el SQL Editor
3. Click en "Run"
4. Espera "Success"

### Paso 4: Ejecutar Script 3 - 03_orders.sql

1. Copia el código de `database/03_orders.sql` del proyecto
2. Pégalo en el SQL Editor
3. Click en "Run"
4. Espera "Success"

### Paso 5: Ejecutar Script 4 - 04_tickets.sql

1. Copia el código de `database/04_tickets.sql` del proyecto
2. Pégalo en el SQL Editor
3. Click en "Run"
4. Espera "Success"

### Paso 6: Ejecutar Script 5 - 05_testimonials.sql

1. Copia el código de `database/05_testimonials.sql` del proyecto
2. Pégalo en el SQL Editor
3. Click en "Run"
4. Espera "Success"

### Paso 7: Ejecutar Script 6 - 06_business_settings.sql

1. Copia el código de `database/06_business_settings.sql` del proyecto
2. Pégalo en el SQL Editor
3. Click en "Run"
4. Espera "Success"

### Paso 8: Ejecutar Script 7 - 07_security_functions.sql

1. Copia el código de `database/07_security_functions.sql` del proyecto
2. Pégalo en el SQL Editor
3. Click en "Run"
4. Espera "Success"

---

## ✅ Verificación

Después de ejecutar todos los scripts, verifica:

1. Ve a Supabase Dashboard > Database > Tables
2. Deberías ver estas 8 tablas:
   - ✅ `users`
   - ✅ `services`
   - ✅ `orders`
   - ✅ `order_events`
   - ✅ `tickets`
   - ✅ `ticket_messages`
   - ✅ `testimonials`
   - ✅ `business_settings`

3. Click en cada tabla y verifica que tiene:
   - ✅ Columnas correctas
   - ✅ RLS habilitado (badge verde "RLS")
   - ✅ Índices creados

---

## ⚠️ Errores Comunes

### Error: "relation already exists"
**Solución:** Normal si ejecutas el script más de una vez. Los scripts usan `CREATE TABLE IF NOT EXISTS` por seguridad.

### Error: "function already exists"
**Solución:** Los scripts usan `CREATE OR REPLACE FUNCTION`, es normal.

### Error: "policy already exists"
**Solución:** Los scripts eliminan policies existentes antes de crear nuevas, es normal.

### Error: "trigger already exists"
**Solución:** Los scripts eliminan triggers existentes antes de crear nuevos, es normal.

---

## 📋 Siguiente Paso

Después de ejecutar todos los scripts con éxito:

1. **Crear usuario admin:**
   - Ve a Supabase Dashboard > Authentication > Users
   - Click "Add user" > "Create new user"
   - Email: `admin@thedulcandesign.com`
   - Password: (contraseña segura)
   - Click "Auto Confirm User"
   - Click "Create"

2. **Asignar rol admin:**
   - Ve al SQL Editor
   - Ejecuta: `UPDATE public.users SET role = 'admin' WHERE email = 'admin@thedulcandesign.com';`

3. **Avisarme** cuando termines para continuar con las pruebas

---

**Documento creado por:** Devin AI
**Fecha:** 13/09/2026
**Estado:** Listo para ejecución manual
