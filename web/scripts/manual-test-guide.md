# 🧪 Guía de Pruebas Manuales - Fase 5.4.2

**Fecha:** 13/09/2026
**Objetivo:** Ejecutar pruebas reales de autenticación y RLS antes de migrar pedidos

---

## 📋 Prerrequisitos

1. ✅ Supabase configurado y accesible
2. ✅ Aplicación web corriendo localmente
3. ✅ Script SQL de auditoría ejecutado en Supabase SQL Editor
4. ✅ Usuarios de prueba creados en Supabase Auth

---

## 🔍 Paso 1: Auditoría de Permisos (SQL)

### Ejecutar en Supabase SQL Editor

1. Abrir [Supabase SQL Editor](https://supabase.com/dashboard/project/wbkgesmnyjnomctdvxqb/sql/new)
2. Copiar contenido de `database/08_audit_permissions.sql`
3. Pegar y ejecutar
4. Documentar resultados

### Resultados Esperados

```sql
-- Debe mostrar:
-- - search_path = public en todas las funciones
-- - Referencias calificadas con public.users
-- - Permisos EXECUTE solo para authenticated
-- - Sin permisos PUBLIC o anon
```

---

## 👥 Paso 2: Crear Usuarios de Prueba

### Crear en Supabase Auth

1. Ir a Authentication > Users en Supabase Dashboard
2. Crear estos usuarios:

| Email | Password | Role (manual en SQL) |
|-------|----------|----------------------|
| usuario-a@testing.local | Test123! | user |
| usuario-b@testing.local | Test123! | user |
| admin@testing.local | Admin123! | admin |

### Asignar Roles en SQL

```sql
-- Para usuario-a
UPDATE public.users SET role = 'user' WHERE email = 'usuario-a@testing.local';

-- Para usuario-b
UPDATE public.users SET role = 'user' WHERE email = 'usuario-b@testing.local';

-- Para admin
UPDATE public.users SET role = 'admin' WHERE email = 'admin@testing.local';
```

---

## 🌐 Paso 3: Pruebas de Autenticación

### 3.1 Login con usuario-a

1. Abrir navegador en `http://localhost:3000/auth/login`
2. Ingresar `usuario-a@testing.local` / `Test123!`
3. Click en "Iniciar Sesión"
4. **Resultado esperado:** ✅ Redirigido a dashboard
5. **Documentar:** PASS/FAIL

### 3.2 Logout

1. Estar logueado como usuario-a
2. Click en "Cerrar Sesión" en navbar
3. **Resultado esperado:** ✅ Redirigido a home, sesión eliminada
4. **Documentar:** PASS/FAIL

### 3.3 Registro de nuevo usuario

1. Abrir `http://localhost:3000/auth/register`
2. Ingresar email/contraseña válidos
3. Click en "Registrarse"
4. **Resultado esperado:** ✅ Usuario creado, redirigido a login
5. **Documentar:** PASS/FAIL

### 3.4 Recuperación de Contraseña

1. Abrir `http://localhost:3000/auth/forgot-password`
2. Ingresar email registrado
3. Click en "Enviar"
4. **Resultado esperado:** ✅ Mensaje de éxito, email enviado
5. **Documentar:** PASS/FAIL

---

## 🚧 Paso 4: Pruebas de Middleware

### 4.1 Acceso sin sesión a /dashboard

1. Asegurarse de estar logout
2. Navegar directamente a `http://localhost:3000/dashboard`
3. **Resultado esperado:** ✅ Redirigido a /auth/login
4. **Documentar:** PASS/FAIL

### 4.2 Acceso sin sesión a /perfil

1. Asegurarse de estar logout
2. Navegar directamente a `http://localhost:3000/perfil`
3. **Resultado esperado:** ✅ Redirigido a /auth/login
4. **Documentar:** PASS/FAIL

### 4.3 Acceso sin sesión a /admin

1. Asegurarse de estar logout
2. Navegar directamente a `http://localhost:3000/admin`
3. **Resultado esperado:** ✅ Redirigido a /auth/login o error 404
4. **Documentar:** PASS/FAIL

---

## 🔒 Paso 5: Pruebas de Aislamiento de Datos (RLS)

### 5.1 Login como usuario-a

1. Login con `usuario-a@testing.local`
2. Navegar a dashboard
3. Verificar que solo ve sus propios datos
4. **Resultado esperado:** ✅ Solo datos de usuario-a
5. **Documentar:** PASS/FAIL

### 5.2 Login como usuario-b (en navegador distinto o incognito)

1. Login con `usuario-b@testing.local`
2. Navegar a dashboard
3. Verificar que solo ve sus propios datos
4. **Resultado esperado:** ✅ Solo datos de usuario-b
5. **Documentar:** PASS/FAIL

### 5.3 Verificar aislamiento

1. En sesión de usuario-a, intentar acceder a datos de usuario-b
2. **Resultado esperado:** ✅ No puede ver datos de usuario-b
3. **Documentar:** PASS/FAIL

### 5.4 Login como admin

1. Login con `admin@testing.local`
2. Navegar a dashboard
3. Verificar que puede ver todos los usuarios
4. **Resultado esperado:** ✅ Puede ver todos los datos
5. **Documentar:** PASS/FAIL

---

## 🛡️ Paso 6: Pruebas de Protección de Roles

### 6.1 Usuario intenta cambiar su propio rol

1. Login como usuario-a
2. Abrir DevTools Console
3. Intentar ejecutar:

```javascript
// Intento directo (no debería funcionar via API)
// Pero verifica que la UI no permita cambiar roles
```

4. **Resultado esperado:** ✅ No hay UI para cambiar roles, trigger bloquea
5. **Documentar:** PASS/FAIL

### 6.2 Admin puede cambiar roles

1. Login como admin
2. Si existe UI de admin, intentar cambiar rol de usuario-a
3. **Resultado esperado:** ✅ Admin puede cambiar roles
4. **Documentar:** PASS/FAIL

---

## ✏️ Paso 7: Pruebas de Operaciones Legítimas

### 7.1 Usuario actualiza full_name

1. Login como usuario-a
2. Navegar a `/perfil`
3. Cambiar nombre
4. Guardar
5. **Resultado esperado:** ✅ Nombre actualizado exitosamente
6. **Documentar:** PASS/FAIL

### 7.2 Usuario actualiza avatar_url

1. En perfil, cambiar avatar
2. Guardar
3. **Resultado esperado:** ✅ Avatar actualizado exitosamente
4. **Documentar:** PASS/FAIL

---

## 🔐 Paso 8: Pruebas de Seguridad de Sesión

### 8.1 Manipulación de localStorage

1. Login como usuario-a
2. Abrir DevTools > Application > Local Storage
3. Intentar modificar manualmente la sesión
4. **Resultado esperado:** ✅ Cambios no afectan auth real de Supabase
5. **Documentar:** PASS/FAIL

### 8.2 Sesión expirada

1. Login como usuario-a
2. Esperar 1 hora o invalidar token en Supabase
3. Intentar navegar a dashboard
4. **Resultado esperado:** ✅ Redirigido a login, error de sesión
5. **Documentar:** PASS/FAIL

---

## 📊 Tabla de Resultados

### Copiar y llenar esta tabla

| Prueba | Resultado | Evidencia/Observaciones |
|--------|-----------|-------------------------|
| Permisos EXECUTE auditados | ⏳ | |
| Login usuario-a | ⏳ | |
| Logout | ⏳ | |
| Registro | ⏳ | |
| Recuperación contraseña | ⏳ | |
| Middleware /dashboard | ⏳ | |
| Middleware /perfil | ⏳ | |
| Middleware /admin | ⏳ | |
| RLS A vs B | ⏳ | |
| RLS B vs A | ⏳ | |
| Admin access | ⏳ | |
| Usuario cambiar rol propio | ⏳ | |
| Admin cambiar rol | ⏳ | |
| Actualizar full_name | ⏳ | |
| Actualizar avatar_url | ⏳ | |
| Manipulación localStorage | ⏳ | |
| Sesión expirada | ⏳ | |

---

## ✅ Criterio de Aceptación

### Para proceder a Fase 6

Todas las pruebas deben ser **PASS**:

- [ ] Permisos EXECUTE auditados y seguros
- [ ] Login/Logout funcionan
- [ ] Middleware protege rutas
- [ ] RLS aísla datos A/B
- [ ] Usuario NO puede cambiar roles
- [ ] Admin puede cambiar roles
- [ ] Usuario puede actualizar fields legítimos
- [ ] Sesión expirada manejada correctamente

Si alguna prueba es **FAIL**, investigar y corregir antes de continuar.

---

**Guía creada por:** Devin AI
**Fecha:** 13/09/2026
**Estado:** ⏳ Pendiente ejecución manual
