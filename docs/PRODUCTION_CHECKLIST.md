# 🚀 Checklist para Pasar a Producción - TheDulcanDesign

**Fecha:** 13/09/2026
**Objetivo:** Pasar del modo demo a modo Supabase real

---

## ✅ Configuración Actual

### Archivo `.env` (Actual)

```env
NEXT_PUBLIC_SUPABASE_URL=https://wbkgesmnyjnomctdvxqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_lJ9uroHrbNhzE8fTO2_0Cg_tQUiMseE
SUPABASE_SERVICE_ROLE_KEY=[secreto - no incluir en commits]
NEXT_PUBLIC_AUTH_MODE=supabase
```

**Estado:** ✅ Ya está configurado en modo `supabase` (no demo)

---

## ⚠️ CORRECCIONES INMEDIATAS REQUERIDAS

### 1. Proteger Secrets (CRÍTICO)

**Problema:** El archivo `.env` contiene secrets y está en el repositorio.

**Solución:**
```bash
# El .env ya está en .gitignore, pero si fue commitado por error:
# 1. Mover secrets a .env.local
mv .env .env.local

# 2. Asegurar que .env.local esté en .gitignore (ya debería estar)
echo ".env.local" >> .gitignore

# 3. Eliminar .env del repo si fue commitado
git rm --cached .env
git commit -m "Remove .env from git (secrets)"
```

### 2. Actualizar Configuración de Negocio en .env

**Cambios requeridos en `.env.local`:**

```env
# Cambiar de:
BUSINESS_NAME=FH4XDZzz OPTIMIZACION
BUSINESS_EMAIL=contact@fh4xdzz.com
BUSINESS_DISCORD=https://discord.gg/your_invite_link
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/your_invite_link

# A:
BUSINESS_NAME=TheDulcanDesign
BUSINESS_EMAIL=tu-email-real@thedulcandesign.com
BUSINESS_DISCORD=https://discord.gg/EDaCnZgC6T
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/EDaCnZgC6T
```

---

## 📋 PASOS PARA SUPABASE FUNCIONAL

### Paso 1: Ejecutar Scripts SQL en Supabase

**Acción:** Ejecutar los 7 scripts SQL en orden en el Supabase SQL Editor

1. `database/01_users.sql` - Crear tabla users y trigger
2. `database/02_services.sql` - Crear tabla services
3. `database/03_orders.sql` - Crear tabla orders y triggers
4. `database/04_tickets.sql` - Crear tabla tickets y triggers
5. `database/05_testimonials.sql` - Crear tabla testimonials
6. `database/06_business_settings.sql` - Crear tabla business_settings
7. `database/07_security_functions.sql` - Crear funciones SECURITY DEFINER y RLS

**Estado:** ⏳ PENDIENTE - Debes ejecutar estos scripts manualmente

### Paso 2: Verificar Tablas en Supabase

**Acción:** Ir a Supabase Dashboard > Database > Tables

**Deberías ver:**
- ✅ `users` (con RLS habilitado)
- ✅ `services` (con RLS habilitado)
- ✅ `orders` (con RLS habilitado)
- ✅ `order_events` (con RLS habilitado)
- ✅ `tickets` (con RLS habilitado)
- ✅ `ticket_messages` (con RLS habilitado)
- ✅ `testimonials` (con RLS habilitado)
- ✅ `business_settings` (con RLS habilitado)

**Estado:** ⏳ PENDIENTE - Verificar después de ejecutar scripts

### Paso 3: Crear Usuario Admin en Supabase Auth

**Acción:**
1. Ir a Supabase Dashboard > Authentication > Users
2. Click en "Add user" > "Create new user"
3. Email: `admin@thedulcandesign.com` (o tu email real)
4. Password: (contraseña segura)
5. Click en "Auto Confirm User"
6. Click en "Create"

**Luego en SQL Editor:**
```sql
-- Asignar rol de admin al usuario
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@thedulcandesign.com';
```

**Estado:** ⏳ PENDIENTE - Debes crear el usuario admin

### Paso 4: Ejecutar Auditoría de Permisos

**Acción:** Ejecutar `database/08_audit_permissions.sql` en Supabase SQL Editor

**Verificar:**
- ✅ Las funciones tienen `search_path = public`
- ✅ Las referencias están calificadas con `public.`
- ✅ No hay permisos PUBLIC innecesarios
- ✅ Solo authenticated tiene EXECUTE

**Estado:** ⏳ PENDIENTE - Parte de Fase 5.4.2

---

## 🧪 PRUEBAS MANUALES REQUERIDAS

### Paso 5: Ejecutar Pruebas de Fase 5.4.2

**Acción:** Seguir la guía en `web/scripts/manual-test-guide.md`

**24 pruebas requeridas:**

#### Autenticación (5 pruebas)
- [ ] Login real
- [ ] Logout real
- [ ] Registro
- [ ] Recuperación de contraseña
- [ ] Reset de contraseña

#### Middleware (4 pruebas)
- [ ] Acceso sin sesión a /dashboard
- [ ] Acceso sin sesión a /perfil
- [ ] Acceso sin sesión a /admin
- [ ] Redirect a login

#### RLS (4 pruebas)
- [ ] Usuario A no ve datos de B
- [ ] Usuario B no ve datos de A
- [ ] Usuario ve sus propios datos
- [ ] Admin ve todos los datos

#### Roles (4 pruebas)
- [ ] Usuario NO puede cambiar su rol
- [ ] Usuario NO puede cambiar rol de otro
- [ ] Admin SÍ puede cambiar roles
- [ ] Trigger funciona correctamente

#### Operaciones Legítimas (3 pruebas)
- [ ] Usuario puede actualizar full_name
- [ ] Usuario puede actualizar avatar_url
- [ ] Usuario puede actualizar email

#### Sesión (3 pruebas)
- [ ] Manipulación de localStorage no afecta
- [ ] Sesión expirada manejada correctamente
- [ ] Acceso directo a rutas protegidas bloqueado

**Estado:** ⏳ PENDIENTE - Requiere pruebas en navegador

---

## 📦 PASOS FINALES

### Paso 6: Configurar Email en Supabase (Opcional pero Recomendado)

**Para recuperación de contraseña:**

1. Ir a Supabase Dashboard > Authentication > Email Templates
2. Configurar "Confirm signup" con tu branding
3. Configurar "Reset password" con tu branding
4. Habilitar "Email confirmations" si deseas

**Estado:** ⏳ PENDIENTE - Opcional pero recomendado

### Paso 7: Desplegar Aplicación

**Opciones:**

**Opción A: Vercel (Recomendado)**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
cd web
vercel
```

**Opción B: Otro hosting**
- Configurar variables de entorno en el hosting
- Deploy de build estático

**Estado:** ⏳ PENDIENTE - Después de que todo funcione localmente

---

## 📊 RESUMEN DE ESTADO

| Paso | Descripción | Estado |
|------|-------------|--------|
| 1 | Proteger secrets (.env → .env.local) | ⏳ PENDIENTE |
| 2 | Actualizar config de negocio en .env.local | ⏳ PENDIENTE |
| 3 | Ejecutar 7 scripts SQL en Supabase | ⏳ PENDIENTE |
| 4 | Verificar tablas creadas | ⏳ PENDIENTE |
| 5 | Crear usuario admin en Supabase Auth | ⏳ PENDIENTE |
| 6 | Ejecutar auditoría de permisos | ⏳ PENDIENTE |
| 7 | Ejecutar 24 pruebas manuales | ⏳ PENDIENTE |
| 8 | Configurar email templates (opcional) | ⏳ PENDIENTE |
| 9 | Desplegar aplicación | ⏳ PENDIENTE |

---

## 🎯 LO QUE YA ESTÁ LISTO

✅ **Infraestructura:**
- ✅ Código Next.js completo
- ✅ Sistema de autenticación híbrido implementado
- ✅ Middleware de protección de rutas
- ✅ Funciones SECURITY DEFINER endurecidas
- ✅ RLS configurado en scripts SQL
- ✅ Scripts de auditoría creados
- ✅ Guía de pruebas manuales documentada

✅ **Configuración:**
- ✅ Supabase URL configurado
- ✅ Supabase ANON KEY configurado
- ✅ Modo auth configurado en 'supabase'
- ✅ Link de Discord actualizado en código
- ✅ Logo e icono integrados

✅ **Validaciones:**
- ✅ Lint: PASA
- ✅ Build: PASA
- ✅ TypeScript: PASA

---

## ⚠️ BLOQUEADORES ACTUALES

No puedes pasar a producción hasta completar:

1. ❌ Scripts SQL ejecutados en Supabase
2. ❌ Usuario admin creado en Supabase Auth
3. ❌ Pruebas manuales de Fase 5.4.2 ejecutadas
4. ❌ Permisos EXECUTE auditados
5. ❌ Secrets protegidos en .env.local

---

## 🚀 PRÓXIMA ACCIÓN RECOMENDADA

**Inmediato:**

1. **Proteger secrets:**
   ```bash
   cd "C:\Users\FH4XDZzz\Desktop\TheDulcanDesign"
   mv .env .env.local
   ```

2. **Ejecutar scripts SQL:**
   - Abrir: https://supabase.com/dashboard/project/wbkgesmnyjnomctdvxqb/sql/new
   - Ejecutar los 7 scripts en orden

3. **Crear usuario admin:**
   - En Supabase Auth > Users
   - Luego ejecutar SQL para asignar rol admin

4. **Ejecutar pruebas:**
   - `cd web && npm run dev`
   - Seguir guía en `web/scripts/manual-test-guide.md`

---

**Documento creado por:** Devin AI
**Fecha:** 13/09/2026
**Estado:** ⏳ Pendiente ejecución manual
