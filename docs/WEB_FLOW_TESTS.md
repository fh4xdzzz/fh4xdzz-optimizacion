# 🌐 WEB_FLOW_TESTS.md
## Pruebas del Flujo Completo de la Web - FH4XDZzz OPTIMIZACION

**Fecha:** 13/09/2026  
**Fase:** 5.4  
**Estado:** ⏳ Pendiente de Ejecución Manual

---

## 📋 Configuración Requerida

```env
NEXT_PUBLIC_AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://wbkgesmnyjnomctdvxqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

---

## 🧪 Casos de Prueba

### Test 1: Registro
**Objetivo:** Verificar que el registro funcione correctamente

**Pasos:**
1. Navega a `http://localhost:3000/auth/register`
2. Ingresa email válido
3. Ingresa contraseña (mínimo 6 caracteres)
4. Haz clic en "Registrarse"
5. Verifica que el registro sea exitoso

**Resultado esperado:**
- ✅ Usuario registrado en Supabase Auth
- ✅ Perfil creado en `public.users` (por trigger)
- ✅ Redirigido a `/dashboard` o `/login`
- ✅ Email de confirmación enviado (si está configurado)

**Estado:** ⏳ NO EJECUTADO

---

### Test 2: Login
**Objetivo:** Verificar que el login funcione correctamente

**Pasos:**
1. Navega a `http://localhost:3000/auth/login`
2. Ingresa email registrado
3. Ingresa contraseña correcta
4. Haz clic en "Iniciar Sesión"
5. Verifica que el login sea exitoso

**Resultado esperado:**
- ✅ Sesión establecida
- ✅ Redirigido a `/dashboard`
- ✅ Navbar muestra usuario autenticado
- ✅ Indicador de modo Supabase visible

**Estado:** ⏳ NO EJECUTADO

---

### Test 3: Logout
**Objetivo:** Verificar que el logout funcione correctamente

**Pasos:**
1. Inicia sesión
2. Haz clic en "Cerrar Sesión" en `/perfil`
3. Verifica que la sesión se cierre

**Resultado esperado:**
- ✅ Sesión eliminada
- ✅ Redirigido a `/` o `/auth/login`
- ✅ Navbar no muestra usuario autenticado
- ✅ No se puede acceder a rutas protegidas

**Estado:** ⏳ NO EJECUTADO

---

### Test 4: Dashboard con Sesión
**Objetivo:** Verificar que el dashboard funcione con sesión válida

**Pasos:**
1. Inicia sesión
2. Navega a `/dashboard`
3. Verifica que el dashboard cargue correctamente

**Resultado esperado:**
- ✅ Dashboard cargado
- ✅ Información de usuario mostrada
- ✅ Pedidos (si existen) mostrados
- ✅ No hay error de autenticación

**Estado:** ⏳ NO EJECUTADO

---

### Test 5: Perfil con Sesión
**Objetivo:** Verificar que el perfil funcione con sesión válida

**Pasos:**
1. Inicia sesión
2. Navega a `/perfil`
3. Verifica que el perfil cargue correctamente

**Resultado esperado:**
- ✅ Perfil cargado
- ✅ Información del usuario mostrada
- ✅ Rol mostrado
- ✅ Botón de logout funcional

**Estado:** ⏳ NO EJECUTADO

---

### Test 6: Dashboard sin Sesión
**Objetivo:** Verificar que el middleware proteja `/dashboard`

**Pasos:**
1. Cierra sesión
2. Intenta navegar a `/dashboard`
3. Verifica que seas redirigido

**Resultado esperado:**
- ✅ Redirigido a `/auth/login?redirect=/dashboard`
- ✅ No se muestra el dashboard
- ✅ Middleware funciona correctamente

**Estado:** ⏳ NO EJECUTADO

---

### Test 7: Perfil sin Sesión
**Objetivo:** Verificar que el middleware proteja `/perfil`

**Pasos:**
1. Cierra sesión
2. Intenta navegar a `/perfil`
3. Verifica que seas redirigido

**Resultado esperado:**
- ✅ Redirigido a `/auth/login?redirect=/perfil`
- ✅ No se muestra el perfil
- ✅ Middleware funciona correctamente

**Estado:** ⏳ NO EJECUTADO

---

### Test 8: Sesión Expirada
**Objetivo:** Verificar el manejo de sesión expirada

**Pasos:**
1. Inicia sesión
2. Espera a que la sesión expire (o eliminar cookies manualmente)
3. Intenta navegar a `/dashboard`
4. Verifica el manejo del error

**Resultado esperado:**
- ✅ Redirigido a `/auth/login`
- ✅ Mensaje de sesión expirada (opcional)
- ✅ No error crítico

**Estado:** ⏳ NO EJECUTADO

---

### Test 9: Recuperación de Contraseña
**Objetivo:** Verificar que la recuperación de contraseña funcione

**Pasos:**
1. Navega a `/auth/forgot-password`
2. Ingresa email registrado
3. Haz clic en "Enviar Enlace"
4. Verifica que el email sea enviado

**Resultado esperado:**
- ✅ Email de recuperación enviado
- ✅ Mensaje de éxito mostrado
- ✅ Link de reset funciona (si probado manualmente)

**Estado:** ⏳ NO EJECUTADO

---

### Test 10: Reset de Contraseña
**Objetivo:** Verificar que el reset de contraseña funcione

**Pasos:**
1. Recibe email de recuperación
2. Haz clic en el link de reset
3. Ingresa nueva contraseña
4. Haz clic en "Actualizar Contraseña"
5. Verifica que la contraseña se actualice

**Resultado esperado:**
- ✅ Contraseña actualizada
- ✅ Puede iniciar sesión con nueva contraseña
- ✅ No puede iniciar sesión con contraseña antigua

**Estado:** ⏳ NO EJECUTADO

---

### Test 11: Manipulación de localStorage
**Objetivo:** Verificar que localStorage no bypass auth

**Pasos:**
1. Cierra sesión
2. Abre DevTools → Application → Local Storage
3. Intenta añadir datos de sesión falsos
4. Intenta navegar a `/dashboard`
5. Verifica que el middleware bloquee el acceso

**Resultado esperado:**
- ✅ Middleware ignora localStorage
- ✅ Redirigido a `/auth/login`
- ✅ No se puede bypass auth con localStorage

**Estado:** ⏳ NO EJECUTADO

---

### Test 12: Cambio de Rol desde DevTools
**Objetivo:** Verificar que no se pueda cambiar rol desde cliente

**Pasos:**
1. Inicia sesión como usuario normal
2. Abre DevTools → Console
3. Intenta ejecutar código para cambiar rol
4. Intenta acceder a `/admin`
5. Verifica que el acceso sea denegado

**Resultado esperado:**
- ✅ No se puede cambiar rol desde cliente
- ✅ Middleware bloquea acceso a `/admin`
- ✅ RLS bloquea operaciones de admin

**Estado:** ⏳ NO EJECUTADO

---

## 📊 Plantilla de Resultados

```markdown
## Resultados de Pruebas del Flujo Web - [FECHA]

### Test 1: Registro
- **Estado:** [✅ PASADO / ❌ FALLADO]
- **Resultado:** [Descripción]
- **Notas:** [Observaciones]

### Test 2: Login
- **Estado:** [✅ PASADO / ❌ FALLADO]
- **Resultado:** [Descripción]
- **Notas:** [Observaciones]

[... continuar con todos los tests ...]
```

---

## 🚨 Problemas Comunes

### Problema 1: Middleware No Funciona
**Solución:** Verifica que `middleware.ts` esté en la raíz de `web/` y no en `app/`.

### Problema 2: RLS Bloquea Todo
**Solución:** Verifica que las políticas RLS estén configuradas correctamente en Supabase.

### Problema 3: Session Cookie No Se Establece
**Solución:** Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configurados.

### Problema 4: Redirección Incorrecta
**Solución:** Verifica que el parámetro `redirect` se maneje correctamente en `/auth/login`.

---

## 📝 Notas Importantes

- ⚠️ Estas pruebas requieren ejecución manual
- ⚠️ El servidor de desarrollo debe estar corriendo (`npm run dev`)
- ⚠️ Supabase debe estar configurado y accesible
- ✅ Documenta todos los resultados
- ✅ Reporta cualquier anomalía

---

**Documento creado por:** Devin AI  
**Fecha:** 13/09/2026  
**Versión:** 1.0
