# 🚀 GUÍA DE CONFIGURACIÓN DE SUPABASE
## TheDulcanDesign - Fase 5.1

**Fecha:** 13/09/2026  
**Objetivo:** Guía paso a paso para configurar Supabase para TheDulcanDesign

---

## 1. 📋 PRERREQUISITOS

### Cuenta de Supabase
- Cuenta gratuita o paga en [supabase.com](https://supabase.com)
- Acceso a la consola de Supabase

### Información del Proyecto
- **Nombre del proyecto:** `fh4xdzz-optimizacion` (recomendado)
- **Región:** Recomendada según ubicación de usuarios
- **Usuario admin:** Email para administrador inicial

---

## 2. 🌐 CREACIÓN DEL PROYECTO SUPABASE

### Paso 1: Crear Cuenta

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Regístrate con tu email (GitHub o Google también disponibles)
4. Verifica tu email

### Paso 2: Crear Nuevo Proyecto

1. Inicia sesión en la consola de Supabase
2. Haz clic en "New Project"
3. Llena el formulario:

**Nombre del Proyecto:**
```
fh4xdzz-optimizacion
```

**Contraseña de Base de Datos:**
- Debe ser segura (mínimo 12 caracteres)
- Guárdala en un lugar seguro
- La necesitarás para conexiones directas a la DB

**Región:**
- **Recomendada:** Selecciona la región más cercana a tus usuarios
- **Opciones comunes:**
  - `US East` (Noreste de EE.UU.)
  - `US West` (Oeste de EE.UU.)
  - `EU West` (Europa Oeste)
  - `AP Northeast` (Asia Nordeste)
- **Para TheDulcanDesign:** Si tus clientes son principalmente hispanohablantes, considera `US East` o `EU West`

**Precio Plan:**
- **Free Tier:** Suficiente para empezar
- **Pro Tier:** Si necesitas más recursos
- **Recomendación:** Comenzar con Free Tier

4. Haz clic en "Create new project"
5. Espera aproximadamente 2 minutos mientras se crea el proyecto

---

## 3. 🔑 OBTENER CREDENCIALES

### Paso 1: Obtener Project URL

1. En la consola de Supabase, selecciona tu proyecto
2. Ve a **Settings** → **API**
3. Copia el **Project URL**
   - Formato: `https://xxxxxxxxxxxxx.supabase.co`
   - Guárdala para configurar variables de entorno

### Paso 2: Obtener Anon Key

1. En la misma página (Settings → API)
2. En la sección "Project API keys"
3. Copia el **anon public key**
   - Formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Esta key es segura para usar en el frontend
   - Guárdala para configurar variables de entorno

### Paso 3: Obtener Service Role Key

1. En la misma página (Settings → API)
2. En la sección "Project API keys"
3. Copia el **service_role secret key**
   - Formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ⚠️ **CRÍTICO:** Esta key es solo para el servidor
   - ⚠️ **Nunca** la uses en el frontend
   - ⚠️ **Nunca** la compartas públicamente
   - Guárdala en un lugar seguro

### Diferencia entre Anon Key y Service Role Key

| Key | Uso | Seguridad | Ubicación |
|-----|-----|-----------|-----------|
| **Anon Key** | Frontend, navegador | Pública (con limitaciones) | `.env.local`, variables de entorno públicas |
| **Service Role Key** | Servidor, backend | Privada (sin limitaciones) | `.env`, variables de entorno privadas |

**Analogía:**
- **Anon Key:** Como una llave de recepción - puede entrar pero solo a áreas públicas
- **Service Role Key:** Como la llave del dueño - puede entrar a cualquier lugar

---

## 4. 🔐 CONFIGURACIÓN DE AUTENTICACIÓN

### Paso 1: Habilitar Email Provider

1. En la consola de Supabase, ve a **Authentication**
2. Haz clic en **Providers**
3. Habilita **Email** provider
4. Configura según necesidad:

**Opciones de Email:**
- **Confirm email:** Requiere que los usuarios verifiquen su email
- **Secure email change:** Requiere verificación al cambiar email
- **Double opt-in:** Requiere confirmación antes de crear cuenta

**Recomendación para TheDulcanDesign:**
- ✅ Habilitar "Confirm email"
- ✅ Habilitar "Secure email change"
- ❌ No habilitar "Double opt-in" (puede reducir conversiones)

### Paso 2: Configurar SMTP (Opcional pero Recomendado)

1. En **Authentication** → **Providers** → **Email**
2. Ve a "SMTP Settings"
3. Configura con tu proveedor de email:

**Opciones de SMTP:**
- **Supabase Email:** Servicio de email de Supabase (limitado en free tier)
- **SendGrid:** Requiere cuenta de SendGrid
- **AWS SES:** Requiere cuenta de AWS
- **Mailgun:** Requiere cuenta de Mailgun
- **Custom:** Tu propio servidor SMTP

**Recomendación para empezar:**
- 🟡 Usar **Supabase Email** (más simple)
- 🟢 Si necesitas más envíos, migrar a **SendGrid** o **Mailgun**

### Paso 3: Habilitar OAuth (Opcional)

**Google OAuth:**
1. Ve a **Authentication** → **Providers**
2. Habilita **Google**
3. Ve a [Google Cloud Console](https://console.cloud.google.com)
4. Crea OAuth 2.0 credentials
5. Copia Client ID y Client Secret
6. Configura en Supabase

**Recomendación:**
- 🟡 Implementar en fase posterior
- 🟢 Email authentication es suficiente para empezar

---

## 5. 🗄️ EJECUCIÓN DE SCRIPTS SQL

### Paso 1: Acceder al SQL Editor

1. En la consola de Supabase, ve a **SQL Editor**
2. Haz clic en "New query"
3. Verás un editor de SQL

### Paso 2: Ejecutar Scripts en Orden

**ORDEN CRÍTICO:**
```
1. 01_users.sql
2. 02_services.sql
3. 03_orders.sql
4. 04_tickets.sql
5. 05_testimonials.sql
6. 06_business_settings.sql
```

### Paso 3: Ejecutar 01_users.sql

1. Abre el archivo `database/01_users.sql` en tu editor
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en "Run"
5. Verifica que no haya errores
6. Verifica que la tabla `users` se creó en **Database** → **Tables**

**Tablas creadas:**
- ✅ `users` (public.users)

**Triggers creados:**
- ✅ `update_users_updated_at`
- ✅ `on_auth_user_created`

**Functions creadas:**
- ✅ `update_updated_at_column()`
- ✅ `handle_new_user()`

### Paso 4: Crear Usuario Admin Inicial

**IMPORTANTE:** Después de ejecutar 01_users.sql, necesitas crear un usuario admin.

**Opción A: Manual en Consola Supabase**

1. Ve a **Authentication** → **Users**
2. Haz clic en "Add user"
3. Crea un usuario con tu email
4. Ve a **Database** → **Tables** → **users**
5. Encuentra el usuario que acabas de crear
6. Actualiza el campo `role` a `admin`
7. Haz clic en "Save"

**Opción B: SQL Manual**

```sql
-- Después de ejecutar 01_users.sql
-- Primero registra el usuario en Supabase Auth
-- Luego ejecuta este SQL:

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'tu@email.com';
```

### Paso 5: Ejecutar 02_services.sql

1. Abre el archivo `database/02_services.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor
4. Haz clic en "Run"
5. Verifica que no haya errores
6. Verifica que la tabla `services` se creó

**Tablas creadas:**
- ✅ `services`

**Datos insertados:**
- 7 servicios de ejemplo

**Nota:** Si no quieres los datos de ejemplo, comenta el INSERT al final del script.

### Paso 6: Ejecutar 03_orders.sql

1. Abre el archivo `database/03_orders.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor
4. Haz clic en "Run"
5. Verifica que no haya errores
6. Verifica que las tablas se crearon

**Tablas creadas:**
- ✅ `orders`
- ✅ `order_events`

**Functions creadas:**
- ✅ `generate_order_number()`

**Triggers creados:**
- ✅ `update_orders_updated_at`
- ✅ `generate_order_number_trigger`

### Paso 7: Ejecutar 04_tickets.sql

1. Abre el archivo `database/04_tickets.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor
4. Haz clic en "Run"
5. Verifica que no haya errores
6. Verifica que las tablas se crearon

**Tablas creadas:**
- ✅ `tickets`
- ✅ `ticket_messages`

**Functions creadas:**
- ✅ `generate_ticket_number()`

**Triggers creados:**
- ✅ `update_tickets_updated_at`
- ✅ `generate_ticket_number_trigger`

### Paso 8: Ejecutar 05_testimonials.sql

1. Abre el archivo `database/05_testimonials.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor
4. Haz clic en "Run"
5. Verifica que no haya errores
6. Verifica que la tabla se creó

**Tablas creadas:**
- ✅ `testimonials`

**Datos insertados:**
- 4 testimonios de ejemplo

**Nota:** Si no quieres los datos de ejemplo, comenta el INSERT al final del script.

### Paso 9: Ejecutar 06_business_settings.sql

1. Abre el archivo `database/06_business_settings.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor
4. Haz clic en "Run"
5. Verifica que no haya errores
6. Verifica que la tabla se creó

**Tablas creadas:**
- ✅ `business_settings`

**Datos insertados:**
- 5 configuraciones iniciales

**Nota:** Estos datos son necesarios para el funcionamiento del sistema.

---

## 6. ⚙️ CONFIGURACIÓN DE VARIABLES DE ENTORNO

### Paso 1: Crear Archivo .env

1. Ve al directorio raíz del proyecto
2. Crea un archivo llamado `.env`
3. Copia el contenido de `.env.example`
4. Reemplaza los valores placeholder con tus credenciales reales

### Paso 2: Configurar Variables de Web

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**IMPORTANTE:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Tu Project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Tu anon key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Tu service role key (solo server)

### Paso 3: Configurar Variables de Bot

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=tu_discord_bot_token
DISCORD_CLIENT_ID=tu_discord_client_id
DISCORD_GUILD_ID=tu_discord_guild_id
DISCORD_STAFF_ROLE_ID=tu_staff_role_id
DISCORD_ADMIN_ROLE_ID=tu_admin_role_id
```

### Paso 4: Configurar Variables de OAuth (Opcional)

```env
# Discord OAuth2 (for web integration)
NEXT_PUBLIC_DISCORD_CLIENT_ID=tu_discord_client_id
DISCORD_CLIENT_SECRET=tu_discord_client_secret
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
```

### Paso 5: Configurar Variables de Aplicación

```env
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/EDaCnZgC6T
```

### Paso 6: Configurar Variables de Negocio

```env
# Business Configuration
BUSINESS_NAME=TheDulcanDesign
BUSINESS_EMAIL=contact@fh4xdzz.com
BUSINESS_DISCORD=https://discord.gg/EDaCnZgC6T
```

---

## 7. ✅ VERIFICACIÓN DE CONFIGURACIÓN

### Paso 1: Verificar Tablas Creadas

1. En la consola de Supabase, ve a **Database** → **Tables**
2. Verifica que las siguientes tablas existan:
   - ✅ `users`
   - ✅ `services`
   - ✅ `orders`
   - ✅ `order_events`
   - ✅ `tickets`
   - ✅ `ticket_messages`
   - ✅ `testimonials`
   - ✅ `business_settings`

### Paso 2: Verificar Triggers

1. Ve a **Database** → **Triggers**
2. Verifica que los siguientes triggers existan:
   - ✅ `update_users_updated_at`
   - ✅ `on_auth_user_created`
   - ✅ `update_services_updated_at`
   - ✅ `update_orders_updated_at`
   - ✅ `generate_order_number_trigger`
   - ✅ `update_tickets_updated_at`
   - ✅ `generate_ticket_number_trigger`
   - ✅ `update_testimonials_updated_at`
   - ✅ `update_business_settings_updated_at`

### Paso 3: Verificar Policies

1. Ve a **Database** → **Policies**
2. Verifica que cada tabla tenga policies configuradas
3. Verifica que RLS esté habilitado en todas las tablas

### Paso 4: Verificar Datos Iniciales

1. Ve a **Database** → **Tables** → **services**
2. Verifica que haya 7 servicios insertados
3. Ve a **Database** → **Tables** → **testimonials**
4. Verifica que haya 4 testimonios insertados
5. Ve a **Database** → **Tables** → **business_settings**
6. Verifica que haya 5 configuraciones insertadas

---

## 8. 🧪 TESTING DE CONEXIÓN

### Paso 1: Test de Conexión Web

1. Ve al directorio `web`
2. Ejecuta:
```bash
npm run dev
```
3. Abre el navegador en `http://localhost:3000`
4. Intenta crear una cuenta (cuando esté implementado)
5. Verifica que el usuario se cree en Supabase

### Paso 2: Test de RLS Policies

1. Crea dos usuarios de prueba en Supabase
2. Inicia sesión con el usuario A
3. Intenta acceder a datos del usuario B
4. Verifica que el acceso sea denegado
5. Inicia sesión con el usuario admin
6. Verifica que puedas ver todos los datos

### Paso 3: Test de Supabase Client

1. Crea un archivo de test en `web/test-supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testConnection() {
  const { data, error } = await supabase.from('services').select('*')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Services:', data)
  }
}

testConnection()
```

2. Ejecuta el test
3. Verifica que no haya errores

---

## 9. 🔒 SEGURIDAD Y MEJORES

### Rotación de Keys

**Recomendado cada 90 días:**
1. Ve a **Settings** → **API**
2. Regenera service role key
3. Actualiza variables de entorno
4. Reinicia aplicación

### Backup de Base de Datos

**Recomendado diariamente:**
1. Ve a **Database** → **Backups**
2. Configura backups automáticos
3. O haz backups manuales regulares

### Monitoring

**Recomendado:**
1. Ve a **Database** → **Logs**
2. Configura alertas para errores
3. Monitoriza uso de recursos

---

## 10. 📝 RESUMEN DE CONFIGURACIÓN

### Checklist de Configuración

- [ ] Cuenta de Supabase creada
- [ ] Proyecto creado
- [ ] Región seleccionada
- [ ] Project URL obtenido
- [ ] Anon key obtenido
- [ ] Service role key obtenido
- [ ] Email provider habilitado
- [ ] SMTP configurado (opcional)
- [ ] Scripts SQL ejecutados en orden
- [ ] Tablas verificadas
- [ ] Triggers verificados
- [� Policies verificadas
- [ ] Usuario admin creado
- [ ] Variables de entorno configuradas
- [ ] Archivo .env creado
- [ ] Conexión testada
- [ ] RLS policies testadas

---

## 11. 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "Connection refused"

**Causa:** Supabase URL incorrecta o proyecto no accesible

**Solución:**
1. Verifica que el Project URL sea correcto
2. Verifica que el proyecto esté activo
3. Verifica tu conexión a internet

### Error: "Invalid API key"

**Causa:** Anon key incorrecta o service role key en frontend

**Solución:**
1. Verifica que la anon key sea correcta
2. Verifica que no estés usando service role key en frontend
3. Regenera la key si es necesario

### Error: "RLS policy violation"

**Causa:** Usuario no tiene permisos según policies

**Solución:**
1. Verifica que el usuario esté autenticado
2. Verifica que el usuario tenga el rol correcto
3. Revisa las policies para verificar que sean correctas

### Error: "Trigger does not exist"

**Causa:** Script SQL no se ejecutó correctamente

**Solución:**
1. Re-ejecuta el script SQL
2. Verifica que no haya errores
3. Verifica que el trigger se creó

---

## 12. 📚 REFERENCIAS

### Documentación Oficial

- [Supabase Quickstart](https://supabase.com/docs/guides/getting-started)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

### Proyecto TheDulcanDesign

- [Auditoría Técnica](./AUDITORIA_FASE5.md)
- [Revisión de Scripts SQL](./SQL_REVIEW.md)
- [Documentación de Autenticación](./authentication.md)

---

## 13. ✅ CONCLUSIÓN

### Estado de Configuración

- ✅ Guía completa de configuración
- ✅ Pasos detallados para cada etapa
- ✅ Solución de problemas incluida
- ✅ Referencias a documentación oficial

### Próximos Pasos

1. Crear proyecto en Supabase
2. Ejecutar scripts SQL en orden
3. Configurar variables de entorno
4. Test de conexión
5. Implementar autenticación en web

---

**Guía creada por:** Devin AI  
**Fecha:** 13/09/2026  
**Versión:** 1.0
