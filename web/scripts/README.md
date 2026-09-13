# 🧪 Scripts de Prueba - TheDulcanDesign

Scripts de validación para verificar la configuración y funcionamiento de Supabase.

## 📋 Prerequisitos

Todos los scripts requieren:
- Variables de entorno configuradas (`.env` en directorio raíz)
- Node.js instalado
- Supabase project creado

## 🔧 Configuración

Asegúrate de tener las siguientes variables en tu archivo `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wbkgesmnyjnomctdvxqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## 📊 Scripts Disponibles

### 1. test-connection.ts
**Propósito:** Verificar conexión básica a Supabase

**Ejecutar:**
```bash
cd web
npx tsx scripts/test-connection.ts
```

**Verifica:**
- ✅ Variables de entorno configuradas
- ✅ Conexión a Supabase
- ✅ Acceso a base de datos
- ✅ Estado de autenticación

**Resultado esperado:**
```
✅ Conexión exitosa a Supabase
📊 Database accesible
```

### 2. test-auth.ts
**Propósito:** Verificar configuración de autenticación

**Ejecutar:**
```bash
cd web
npx tsx scripts/test-auth.ts
```

**Verifica:**
- ✅ Estado de sesión actual
- ✅ API de autenticación disponible
- ✅ Tabla users accesible
- ✅ Usuarios existentes

**Resultado esperado:**
```
✅ Tabla users accesible
📊 X usuarios encontrados
```

### 3. test-rls.ts
**Propósito:** Verificar seguridad RLS (Row Level Security)

**Ejecutar:**
```bash
cd web
npx tsx scripts/test-rls.ts
```

**Verifica:**
- ✅ RLS habilitado (indirectamente)
- ✅ Acceso denegado sin autenticación
- ✅ Tablas con RLS configuradas
- ✅ Services accesible públicamente

**Resultado esperado:**
```
✅ Acceso denegado correctamente (sin autenticación)
✅ Services accesible (esperado para usuarios no autenticados)
```

## 🚀 Orden de Ejecución

1. **Primero:** `test-connection.ts`
   - Verifica que la conexión básica funciona
   - Requiere solo variables de entorno

2. **Segundo:** `test-auth.ts`
   - Verifica que auth está configurado
   - Requiere scripts SQL ejecutados

3. **Tercero:** `test-rls.ts`
   - Verifica seguridad RLS
   - Requiere auth y RLS configurados

## 🔍 Troubleshooting

### Error: "Variables de entorno no configuradas"
**Solución:** Crea archivo `.env` con las variables requeridas

### Error: "La tabla users no existe"
**Solución:** Ejecuta los scripts SQL en Supabase en orden:
1. `database/01_users.sql`
2. `database/02_services.sql`
3. etc.

### Error: "Acceso denegado"
**Solución:** Verifica que el anon key sea correcto y que RLS no esté bloqueando todo

### Error: "Function not available"
**Solución:** Normal al usar anon key, indica que no se puede acceder a funciones administrativas

## 📝 Notas Importantes

- Estos scripts usan el **anon key** (público), no el service role key
- El anon key tiene permisos limitados por diseño
- Para pruebas completas de RLS, necesitas autenticarte primero vía la web
- Los scripts son diagnósticos, no pruebas exhaustivas

## 🎯 Pruebas Completas

Para pruebas completas después de configurar Supabase:

1. Ejecutar scripts de diagnóstico:
   ```bash
   npx tsx scripts/test-connection.ts
   npx tsx scripts/test-auth.ts
   npx tsx scripts/test-rls.ts
   ```

2. Pruebas vía web:
   - Registrarse en `/auth/register`
   - Loguearse en `/auth/login`
   - Verificar dashboard en `/dashboard`
   - Verificar perfil en `/perfil`

3. Pruebas de RLS reales:
   - Crear dos usuarios
   - Loguearse con cada uno
   - Verificar que cada usuario solo ve sus propios datos
   - Verificar que servicios son públicos

## 📚 Documentación Relacionada

- `docs/SUPABASE_SETUP.md` - Guía de configuración
- `docs/SQL_REVIEW.md` - Revisión de scripts SQL
- `docs/STATUS_FASE5.md` - Estado actual del proyecto

---

**Última actualización:** 13/09/2026  
**Versión:** 1.0
