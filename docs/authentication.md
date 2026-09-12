# 🔐 Autenticación y Panel de Cliente

## 📋 Estado Actual

**Sistema Demo (LocalStorage):**
- ✅ Funcional sin configuración de Supabase
- ✅ Sistema de pedidos completo
- ✅ Gestión de estados
- ✅ No requiere autenticación

**Sistema Supabase Auth (Preparado):**
- ✅ Scripts SQL creados en `database/`
- ✅ Funciones de integración preparadas
- ✅ RLS configurado en base de datos
- ⏳ Requiere configuración de credenciales

## 🚀 Configuración de Supabase Auth

### Paso 1: Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Espera a que el proyecto esté listo (aprox 2 minutos)

### Paso 2: Configurar Variables de Entorno

Copia las credenciales de tu proyecto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Paso 3: Ejecutar Scripts SQL

En el SQL Editor de Supabase, ejecuta los scripts en orden:

1. `database/01_users.sql` - Tabla de usuarios y autenticación
2. `database/02_services.sql` - Servicios
3. `database/03_orders.sql` - Pedidos y eventos
4. `database/04_tickets.sql` - Tickets de Discord
5. `database/05_testimonials.sql` - Testimonios
6. `database/06_business_settings.sql` - Configuración del negocio

### Paso 4: Configurar Email (Opcional)

Para la recuperación de contraseña:

1. Ve a Authentication → Providers
2. Habilita Email provider
3. Configura SMTP o usa el servicio de email de Supabase

### Paso 5: Habilitar OAuth (Opcional)

Para login con Google:

1. Ve a Authentication → Providers
2. Habilita Google provider
3. Configura OAuth credentials de Google Console

## 🔧 Funcionalidades Implementadas

### Sistema Demo (Actual)
- ✅ Creación de pedidos con validación
- ✅ Generación de números de pedido únicos
- ✅ Sistema de estados (6 estados)
- ✅ Consulta de pedidos por número
- ✅ Lista de todos los pedidos
- ✅ Persistencia en localStorage

### Sistema Supabase (Preparado)
- ✅ Tabla `users` con extensión de auth.users
- ✅ Trigger para crear perfil automáticamente
- ✅ Row Level Security configurado
- ✅ Funciones de integración en `lib/supabase/orders.ts`
- ✅ Callback de OAuth preparado

## 📁 Archivos Preparados para Autenticación

### Funciones de Supabase

**`lib/supabase/client.ts`** - Cliente para browser
```typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`** - Cliente para server
```typescript
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* config */ } }
  )
}
```

**`lib/supabase/orders.ts`** - Funciones de pedidos
- `createSupabaseOrder()` - Crear pedido
- `getSupabaseOrderByNumber()` - Obtener pedido
- `getSupabaseUserOrders()` - Pedidos de usuario
- `updateSupabaseOrderStatus()` - Actualizar estado

### Scripts SQL

**`database/01_users.sql`** - Configuración de usuarios
- Tabla `users` con perfil extendido
- Trigger para crear perfil automáticamente
- RLS policies para protección de datos
- Índices optimizados

**`database/03_orders.sql`** - Sistema de pedidos
- Tabla `orders` con estados
- Tabla `order_events` para historial
- Generación automática de números de pedido
- RLS policies por usuario

## 🎯 Cómo Activar Autenticación

### Opción 1: Activar Autenticación en Sistema Demo

Para mantener el sistema demo actual pero con autenticación:

1. Configura variables de entorno de Supabase
2. Ejecuta scripts SQL
3. Modifica `lib/orders.ts` para usar Supabase cuando esté configurado:
```typescript
if (isSupabaseConfigured()) {
  // Usar Supabase
} else {
  // Usar localStorage (demo)
}
```

### Opción 2: Sistema Completo con Autenticación

Para un sistema completo con autenticación:

1. Configura variables de entorno
2. Ejecuta scripts SQL
3. Habilita las páginas de autenticación
4. Modifica el sistema de pedidos para usar Supabase
5. Configura middleware para protección de rutas

## 🔒 Seguridad Implementada

### Row Level Security (RLS)

**Políticas de usuarios:**
- ✅ Usuarios pueden ver su propio perfil
- ✅ Admins pueden ver todos los perfiles
- ✅ Usuarios pueden actualizar su propio perfil
- ✅ Admins pueden actualizar cualquier perfil

**Políticas de pedidos:**
- ✅ Usuarios pueden ver sus propios pedidos
- ✅ Admins pueden ver todos los pedidos
- ✅ Usuarios pueden crear pedidos
- ✅ Admins pueden actualizar cualquier pedido

### Protección de Datos

- ✅ No exposición de service_role key
- ✅ Solo anon key en frontend
- ✅ Validación de formularios
- ✅ Verificación de propiedad de datos
- ✅ Índices para rendimiento

## 🧪 Tests de Seguridad

### Para Realizar (con Supabase configurado):

1. **Registro de usuario**
   - Crear cuenta nueva
   - Verificar email de confirmación
   - Verificar creación de perfil en `users`

2. **Login y Logout**
   - Iniciar sesión con credenciales correctas
   - Intentar login con credenciales incorrectas
   - Verificar logout funciona

3. **Protección de datos**
   - Usuario A crear pedido
   - Usuario B intentar acceder al pedido de A
   - Verificar que usuario B no pueda acceder

4. **Acceso a panel admin**
   - Usuario normal intentar acceder a rutas admin
   - Verificar redirección o error 403

5. **RLS Policies**
   - Intentar actualizar perfil de otro usuario
   - Intentar ver pedidos de otro usuario
   - Verificar que las políticas bloqueen el acceso

## 📝 Notas Importantes

### Compatibilidad Next.js 16

Debido a cambios en Next.js 16, el middleware tradicional ha sido deprecado. Para protección de rutas:

**Opción 1:** Usar protección a nivel de componente
```typescript
export default function ProtectedPage() {
  const session = await getSession()
  if (!session) redirect('/auth/login')
  // Resto del componente
}
```

**Opción 2:** Usar el nuevo sistema de proxy (recomendado)
```typescript
// proxy.ts (nuevo archivo)
export async function middleware(request: NextRequest) {
  // Lógica de middleware
}
```

### Sistema Híbrido

El proyecto actual usa un sistema híbrido:
- **Sin Supabase:** Sistema demo con localStorage
- **Con Supabase:** Sistema completo con autenticación

Esto permite desarrollo y testing sin configurar Supabase primero.

## 🚀 Próximos Pasos

Para completar la autenticación:

1. Configurar proyecto Supabase
2. Ejecutar scripts SQL
3. Configurar variables de entorno
4. Habilitar páginas de autenticación
5. Migrar sistema de pedidos a Supabase
6. Configurar protección de rutas
7. Probar flujo completo

## 📚 Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js 16 Migration](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)