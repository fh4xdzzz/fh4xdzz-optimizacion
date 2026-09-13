# 🧪 Pruebas de RLS con Usuarios Autenticados

**Fecha:** 13/09/2026
**Versión:** 1.0
**Ubicación:** docs/RLS_AUTHENTICATED_TESTS.md

---

## 📋 Pruebas de Row Level Security con Usuarios Reales

### Pruebas Requieren Ejecución Manual con Supabase Real

---

## TABLA: users

### RLS-USERS-01: Usuario puede ver su propio perfil
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como userA@test.com
2. Ejecuta: `SELECT * FROM public.users WHERE email = 'userA@test.com'`
3. Verifica que devuelva tu perfil

### RLS-USERS-02: Usuario NO puede ver otros perfiles
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como userA@test.com
2. Ejecuta: `SELECT * FROM public.users WHERE email = 'userB@test.com'`
3. Verifica que devuelva 0 filas o error

### RLS-USERS-03: Admin puede ver todos los perfiles
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como admin
2. Ejecuta: `SELECT * FROM public.users`
3. Verifica que devuelva todos los usuarios

### RLS-USERS-04: Usuario puede actualizar su propio perfil
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como userA@test.com
2. Ejecuta: `UPDATE public.users SET full_name = 'Test' WHERE email = 'userA@test.com'`
3. Verifique que se actualice correctamente

### RLS-USERS-05: Usuario NO puede actualizar otros perfiles
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como userA@test.com
2. Ejecuta: `UPDATE public.users SET full_name = 'Hack' WHERE email = 'userB@test.com'`
3. Verifique que se reciba error o 0 filas afectadas

### RLS-USERS-06: Admin puede actualizar cualquier perfil
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como admin
2. Ejecuta: `UPDATE public.users SET full_name = 'AdminTest' WHERE email = 'userA@test.com'`
3. Verifique que se actualice correctamente

### RLS-USERS-07: Trigger bloquea cambio de rol
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como admin
2. Ejecuta: `UPDATE public.users SET role = 'admin' WHERE email = 'userA@test.com'`
3. Verifique que se reciba error del trigger `prevent_role_change`

---

## TABLA: services

### RLS-SERVICES-01: Cualquiera puede ver servicios activos
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** No

**Instrucciones:**
1. Sin autenticación o como usuario normal
2. Ejecuta: `SELECT * FROM public.services WHERE is_active = true`
3. Verifique que devuelva todos los servicios activos

### RLS-SERVICES-02: Servicios inactivos NO son visibles públicamente
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** No

**Instrucciones:**
1. Sin autenticación o como usuario normal
2. Ejecuta: `SELECT * FROM public.services WHERE is_active = false`
3. Verifique que devuelva 0 filas o error

### RLS-SERVICES-03: Admin puede ver todos los servicios
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** No

**Instrucciones:**
1. Logueate como admin
2. Ejecuta: `SELECT * FROM public.services`
3. Verifique que devuelva todos los servicios (activos e inactivos)

---

## TABLA: orders

### RLS-ORDERS-01: Usuario puede ver sus propios pedidos
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como userA@test.com
2. Crea un pedido
3. Ejecuta: `SELECT * FROM public.orders WHERE user_id = auth.uid()`
4. Verifique que devuelva tu pedido

### RLS-ORDERS-02: Usuario NO puede ver pedidos de otros
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como userA@test.com
2. Ejecuta: `SELECT * FROM public.orders WHERE user_id != auth.uid()`
3. Verifique que devuelva 0 filas o error

### RLS-ORDERS-03: Admin puede ver todos los pedidos
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

**Instrucciones:**
1. Logueate como admin
2. Ejecuta: `SELECT * FROM public.orders`
3. Verifique que devuelva todos los pedidos

---

## 📊 Resumen

- **Total:** 13 pruebas
- **PASS:** 0 (0%)
- **PENDIENTE:** 13 (100%)
- **FAIL:** 0

---

## 🎯 Instrucciones Generales para Pruebas RLS

### Preparación
1. Crea 3 usuarios en Supabase:
   - userA@test.com (cliente)
   - userB@test.com (cliente)
   - admin@test.com (admin)
2. Asigna roles correctamente en Supabase
3. Verifica que las políticas RLS estén activas

### Ejecución
1. Usa Supabase SQL Editor o Supabase Client en el navegador
2. Ejecuta cada query en la tabla correspondiente
3. Documenta el resultado en este archivo

### Herramientas
- Supabase Dashboard > SQL Editor
- Supabase Client (window.supabase en DevTools)
- Browser Console con Supabase JS Client

---

**Generado por:** Devin AI
**Fecha:** 13/09/2026
