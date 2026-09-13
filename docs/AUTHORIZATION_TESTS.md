# 🧪 Pruebas de Autorización

**Fecha:** 13/09/2026
**Versión:** 1.0
**Ubicación:** docs/AUTHORIZATION_TESTS.md

---

## 📋 Pruebas de Autorización

### AUTH-10: Solo admins pueden consultar datos administrativos
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** No

### AUTH-11: Solo admins pueden gestionar usuarios
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** No

### AUTH-12: Solo admins pueden modificar roles
- **Estado:** ✅ PASS
- **Evidencia:** RLS policies + trigger en 07_security_functions.sql
- **Responsable:** Devin
- **Bloqueo Crítico:** Sí

### AUTH-13: Un cliente no puede modificar su role
- **Estado:** ✅ PASS
- **Evidencia:** Trigger `prevent_role_change` en 07_security_functions.sql
- **Responsable:** Devin
- **Bloqueo Crítico:** Sí

### AUTH-14: Un cliente no puede convertirse en admin desde el navegador
- **Estado:** ✅ PASS
- **Evidencia:** RLS policies UPDATE bloquean cambios
- **Responsable:** Devin
- **Bloqueo Crítico:** Sí

### AUTH-15: Un cliente no puede consultar datos privados de otros usuarios
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

### AUTH-16: Las políticas RLS bloquean accesos directos desde Supabase
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

### AUTH-17: No existe bypass mediante localStorage
- **Estado:** ✅ PASS
- **Evidencia:** Modo demo desactivado: `NEXT_PUBLIC_AUTH_MODE=supabase`
- **Responsable:** Devin
- **Bloqueo Crítico:** No

### AUTH-18: No existe bypass mediante DevTools
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

### AUTH-19: No existe bypass mediante llamadas directas a la API
- **Estado:** ⏳ PENDIENTE
- **Evidencia:** - Requiere prueba manual
- **Responsable:** Usuario
- **Bloqueo Crítico:** Sí

---

## 📊 Resumen

- **Total:** 10 pruebas
- **PASS:** 4 (40%)
- **PENDIENTE:** 6 (60%)
- **FAIL:** 0

---

## 🎯 Pruebas Pendientes Requieren Ejecución Manual

### AUTH-15: Aislamiento entre usuarios
**Instrucciones:**
1. Crea dos usuarios en Supabase: userA@test.com y userB@test.com
2. Logueate como userA
3. Intenta acceder a datos de userB vía API directa en DevTools
4. Verifica que se reciba error 403 o datos vacíos

### AUTH-16: Políticas RLS desde Supabase Dashboard
**Instrucciones:**
1. Abre Supabase Dashboard > SQL Editor
2. Intenta ejecutar `SELECT * FROM public.users` sin autenticación
3. Verifica que se reciba error de permisos
4. Intenta ejecutar `SELECT * FROM public.services` sin autenticación
5. Verifica que se reciban datos (servicios son públicos)

### AUTH-18: Bypass mediante DevTools
**Instrucciones:**
1. Logueate como cliente normal
2. Abre DevTools > Console
3. Intenta modificar localStorage para cambiar role a 'admin'
4. Recarga la página
5. Verifica que el cambio no tenga efecto (validación server-side)

### AUTH-19: Llamadas directas a la API
**Instrucciones:**
1. Logueate como cliente normal
2. Usa Postman o curl para llamar a `/api/admin/users`
3. Verifica que se reciba error 401 o 403
4. Intenta actualizar role vía PATCH a `/api/admin/users/:id`
5. Verifica que se reciba error 401 o 403

---

**Generado por:** Devin AI
**Fecha:** 13/09/2026
