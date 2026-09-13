# 🧪 RLS_AUTHENTICATED_TESTS.md
## Guía de Pruebas RLS con Usuarios Autenticados - FH4XDZzz OPTIMIZACION

**Fecha:** 13/09/2026  
**Fase:** 5.4  
**Objetivo:** Documentar cómo probar RLS con usuarios autenticados

---

## 📋 Prerrequisitos

### Configuración Requerida
```env
NEXT_PUBLIC_AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://wbkgesmnyjnomctdvxqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### Supabase Project
- ✅ Scripts SQL ejecutados (7/7)
- ✅ RLS habilitado en todas las tablas
- ✅ Políticas creadas
- ✅ Funciones de seguridad implementadas

---

## 👥 Usuarios de Prueba

### Usuario A (Cliente Normal)
- **Email:** `usuario-a@testing.local`
- **Contraseña:** `TestPass123!`
- **Rol esperado:** `client`
- **Propósito:** Probar acceso limitado

### Usuario B (Cliente Normal)
- **Email:** `usuario-b@testing.local`
- **Contraseña:** `TestPass456!`
- **Rol esperado:** `client`
- **Propósito:** Probar aislamiento entre usuarios

### Usuario C (Administrador)
- **Email:** `admin@testing.local`
- **Contraseña:** `AdminPass789!`
- **Rol esperado:** `admin`
- **Propósito:** Probar acceso administrativo

---

## 🚀 Pasos para Ejecutar Pruebas

### Paso 1: Registrar Usuarios

Usa la interfaz web para registrar los usuarios:

1. Navega a `http://localhost:3000/auth/register`
2. Registra Usuario A:
   - Email: `usuario-a@testing.local`
   - Contraseña: `TestPass123!`
   - Nombre: Usuario A
3. Registra Usuario B:
   - Email: `usuario-b@testing.local`
   - Contraseña: `TestPass456!`
   - Nombre: Usuario B
4. Registra Usuario C:
   - Email: `admin@testing.local`
   - Contraseña: `AdminPass789!`
   - Nombre: Admin

### Paso 2: Configurar Rol de Admin

Como el trigger crea usuarios con rol `client` por defecto, necesitas cambiar el rol del Usuario C a admin manualmente en Supabase:

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta:
```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@testing.local';
```

### Paso 3: Crear Datos de Prueba

#### Crear Pedidos para Usuario A
1. Inicia sesión como Usuario A
2. Crea 2-3 pedidos desde `/contacto` o `/dashboard`
3. Nota los IDs de los pedidos

#### Crear Pedidos para Usuario B
1. Cierra sesión
2. Inicia sesión como Usuario B
3. Crea 2-3 pedidos desde `/contacto` o `/dashboard`
4. Nota los IDs de los pedidos

---

## 🔬 Pruebas de Aislamiento

### Test 1: Usuario A No Puede Ver Datos de Usuario B

**Objetivo:** Verificar que Usuario A no pueda ver pedidos de Usuario B

**Pasos:**
1. Inicia sesión como Usuario A
2. Navega a `/dashboard`
3. Intenta acceder a un pedido de Usuario B (si conoces el ID)
4. Verifica que solo veas tus propios pedidos

**Resultado esperado:**
- ✅ Usuario A solo ve sus propios pedidos
- ❌ Usuario A no puede ver pedidos de Usuario B
- ❌ Usuario A no puede acceder a datos de Usuario B

**Cómo verificar en Supabase:**
```sql
-- Como Usuario A (con su sesión), esto debería fallar o devolver vacío
SELECT * FROM public.orders WHERE user_id = 'usuario-b-id';

-- Como Usuario A, esto debería funcionar
SELECT * FROM public.orders WHERE user_id = 'usuario-a-id';
```

---

### Test 2: Usuario B No Puede Ver Datos de Usuario A

**Objetivo:** Verificar que Usuario B no pueda ver pedidos de Usuario A

**Pasos:**
1. Cierra sesión
2. Inicia sesión como Usuario B
3. Navega a `/dashboard`
4. Verifica que solo veas tus propios pedidos

**Resultado esperado:**
- ✅ Usuario B solo ve sus propios pedidos
- ❌ Usuario B no puede ver pedidos de Usuario A

---

### Test 3: Usuario A No Puede Modificar Datos de Usuario B

**Objetivo:** Verificar que Usuario A no pueda modificar pedidos de Usuario B

**Pasos:**
1. Inicia sesión como Usuario A
2. Intenta modificar un pedido de Usuario B (si hay una interfaz)
3. Verifica que la operación falle

**Resultado esperado:**
- ❌ Usuario A no puede modificar pedidos de Usuario B
- ❌ Usuario A no puede cambiar estado de pedidos de Usuario B
- ❌ Usuario A no puede asignar pedidos de Usuario B

---

### Test 4: Usuario A No Puede Cambiar Su Propio Rol

**Objetivo:** Verificar que Usuario A no pueda cambiar su rol a admin

**Pasos:**
1. Inicia sesión como Usuario A
2. Navega a `/perfil`
3. Intenta cambiar tu rol a admin (si hay una interfaz)
4. Verifica que la operación falle

**Resultado esperado:**
- ❌ Usuario A no puede cambiar su propio rol
- ❌ El trigger `prevent_role_change()` bloquea la operación
- ❌ RLS no permite cambios de rol desde el cliente

**Cómo verificar en Supabase:**
```sql
-- Como Usuario A, esto debería fallar
UPDATE public.users SET role = 'admin' WHERE id = 'usuario-a-id';
```

---

### Test 5: Usuario A No Puede Cambiar Rol de Usuario B

**Objetivo:** Verificar que Usuario A no pueda cambiar el rol de Usuario B

**Pasos:**
1. Inicia sesión como Usuario A
2. Intenta cambiar el rol de Usuario B (si hay una interfaz)
3. Verifica que la operación falle

**Resultado esperado:**
- ❌ Usuario A no puede cambiar el rol de Usuario B
- ❌ RLS no permite cambios de rol desde el cliente
- ❌ Solo admins pueden cambiar roles

---

### Test 6: Usuario A No Puede Modificar business_settings

**Objetivo:** Verificar que Usuario A no pueda modificar configuraciones del negocio

**Pasos:**
1. Inicia sesión como Usuario A
2. Intenta acceder a `/admin/settings` (si existe)
3. Verifica que el acceso sea denegado

**Resultado esperado:**
- ❌ Usuario A no puede acceder a `/admin/settings`
- ❌ Usuario A no puede modificar `business_settings`
- ❌ Middleware redirige a `/dashboard`

---

### Test 7: Admin Puede Ver Todos los Datos

**Objetivo:** Verificar que el admin pueda ver todos los datos

**Pasos:**
1. Cierra sesión
2. Inicia sesión como Usuario C (admin)
3. Navega a `/dashboard` o `/admin`
4. Verifica que puedas ver pedidos de Usuario A y Usuario B

**Resultado esperado:**
- ✅ Admin puede ver todos los pedidos
- ✅ Admin puede ver todos los usuarios
- ✅ Admin puede ver todos los tickets
- ✅ RLS permite acceso admin

**Cómo verificar en Supabase:**
```sql
-- Como Admin, esto debería funcionar
SELECT * FROM public.orders;
SELECT * FROM public.users;
```

---

### Test 8: Admin Puede Modificar Datos

**Objetivo:** Verificar que el admin pueda modificar datos

**Pasos:**
1. Inicia sesión como Usuario C (admin)
2. Intenta modificar un pedido de Usuario A
3. Verifica que la operación tenga éxito

**Resultado esperado:**
- ✅ Admin puede modificar pedidos de cualquier usuario
- ✅ Admin puede cambiar estados
- ✅ Admin puede asignar pedidos

---

### Test 9: Usuario Sin Sesión No Puede Ver Datos Privados

**Objetivo:** Verificar que usuarios sin sesión no puedan ver datos privados

**Pasos:**
1. Cierra sesión
2. Intenta acceder a `/dashboard`
3. Verifica que seas redirigido a `/auth/login`

**Resultado esperado:**
- ❌ Usuario sin sesión no puede acceder a `/dashboard`
- ❌ Usuario sin sesión no puede acceder a `/perfil`
- ✅ Middleware redirige a `/auth/login`

---

### Test 10: Usuario Sin Sesión No Puede Modificar Datos

**Objetivo:** Verificar que usuarios sin sesión no puedan modificar datos

**Pasos:**
1. Cierra sesión
2. Intenta crear un pedido (si hay una API pública)
3. Verifica que la operación falle o requiera auth

**Resultado esperado:**
- ❌ Usuario sin sesión no puede crear pedidos
- ❌ Usuario sin sesión no puede modificar datos
- ✅ RLS bloquea operaciones sin auth

---

## 📊 Plantilla de Resultados

Usa esta plantilla para documentar tus resultados:

```markdown
## Resultados de Pruebas RLS - [FECHA]

### Test 1: Usuario A No Puede Ver Datos de Usuario B
- **Estado:** [✅ PASADO / ❌ FALLADO]
- **Resultado:** [Descripción del resultado]
- **Notas:** [Observaciones adicionales]

### Test 2: Usuario B No Puede Ver Datos de Usuario A
- **Estado:** [✅ PASADO / ❌ FALLADO]
- **Resultado:** [Descripción del resultado]
- **Notas:** [Observaciones adicionales]

[... continuar con todos los tests ...]
```

---

## 🚨 Problemas Comunes

### Problema 1: Usuario No Se Puede Registrar
**Solución:** Verifica que Supabase Auth esté habilitado y que el email provider esté activo.

### Problema 2: Usuario No Tiene Perfil en public.users
**Solución:** El trigger `on_auth_user_created` debería crear el perfil automáticamente. Si no funciona, verifica el trigger en Supabase.

### Problema 3: RLS No Funciona
**Solución:** Verifica que RLS esté habilitado en cada tabla en Supabase Dashboard → Database → Tables → [Tabla] → RLS.

### Problema 4: Admin No Puede Ver Todo
**Solución:** Verifica que el rol del usuario sea 'admin' en `public.users`. Recuerda cambiarlo manualmente después del registro.

---

## 📝 Notas Importantes

- ⚠️ **No uses contraseñas reales** en producción
- ⚠️ **Elimina usuarios de prueba** después de las pruebas
- ⚠️ **No guardes contraseñas en Git**
- ⚠️ **Usa el entorno de testing** para estas pruebas
- ✅ **Documenta todos los resultados**
- ✅ **Reporta cualquier anomalía**

---

**Documento creado por:** Devin AI  
**Fecha:** 13/09/2026  
**Versión:** 1.0
