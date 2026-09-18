# Sistema de Chat de Soporte Profesional - Instrucciones de Instalación

## 📋 Resumen

He implementado un sistema completo de chat de soporte en tiempo real para tu sitio web TheDulcanDesign. El sistema incluye:

- ✅ Burbuja de chat flotante premium (diseño amarillo/dorado)
- ✅ Panel de soporte en `/admin` con inbox
- ✅ Supabase Realtime para mensajes en tiempo real
- ✅ API routes completas para todas las operaciones
- ✅ RLS (Row Level Security) para seguridad
- ✅ Sistema de archivos adjuntos
- ✅ Sistema de calificación de soporte
- ✅ Notas internas del cliente
- ✅ Métricas y dashboard

## 🚀 Pasos de Instalación

### 1. Instalar Dependencias npm

Abre una terminal en `E:\WEB DESIGN\TheDulcanDesign\web` y ejecuta:

```bash
npm install
```

Esto instalará las nuevas dependencias:
- `lucide-react` - Iconos
- `zustand` - State management

### 2. Ejecutar Migraciones SQL en Supabase

Ve al panel de Supabase y abre el **SQL Editor**. Ejecuta los siguientes archivos en orden:

#### 2.1. Migración principal
```sql
-- Ejecuta el contenido de: database/21_chat_system_init.sql
```

Este archivo:
- Extiende la tabla `users` con campos de soporte
- Crea tablas: `chat_sessions`, `chat_messages`, `chat_attachments`, `chat_ratings`, `canned_responses`, `internal_notes`, `chat_audit_logs`
- Crea índices para optimización
- Crea triggers automáticos

#### 2.2. Políticas de seguridad RLS
```sql
-- Ejecuta el contenido de: database/22_chat_system_rls.sql
```

Este archivo:
- Habilita RLS en todas las tablas
- Crea políticas para clientes, staff, admin y owner
- Implementa seguridad basada en roles

#### 2.3. Habilitar Realtime
```sql
-- Ejecuta el contenido de: database/23_chat_system_realtime.sql
```

Este archivo:
- Habilita Supabase Realtime para `chat_sessions` y `chat_messages`
- Permite actualizaciones en tiempo real sin polling

#### 2.4. Configurar Storage (opcional - para archivos adjuntos)
```sql
-- Ejecuta el contenido de: database/24_chat_system_storage.sql
```

**IMPORTANTE:** Antes de ejecutar este SQL, debes crear el bucket manualmente:
1. Ve a **Storage** en Supabase
2. Crea un nuevo bucket llamado `chat-attachments`
3. Marca como **Private** (no público)
4. Luego ejecuta el SQL

### 3. Configurar Usuarios como Agentes de Soporte

Para que un usuario pueda ver y responder chats, debes configurarlo como agente de soporte:

```sql
-- Convertir usuario en agente de soporte
UPDATE public.users
SET is_support_agent = true,
    online = true,
    accepting_chats = true,
    languages = ARRAY['es', 'en'],
    specializations = ARRAY['general', 'streaming', 'obs', 'gaming']
WHERE email = 'tu@email.com';

-- O para el owner/admin existente
UPDATE public.users
SET is_support_agent = true,
    online = true
WHERE role IN ('admin', 'owner');
```

### 4. Verificar Instalación

#### 4.1. Verificar build
```bash
cd E:\WEB DESIGN\TheDulcanDesign\web
npm run build
```

#### 4.2. Verificar typecheck
```bash
npm run typecheck
```

#### 4.3. Verificar lint
```bash
npm run lint
```

## 🎯 Cómo Usar el Sistema

### Para Clientes:

1. **Abrir el sitio web**
2. **Hacer clic en la burbuja de chat** (esquina inferior derecha)
3. **Escribir un mensaje**
4. **El chat se crea automáticamente** y aparece en el panel de soporte

### Para Agentes de Soporte:

1. **Ir a `/admin`**
2. **Hacer clic en la pestaña "Soporte"**
3. **Ver la cola de chats esperando**
4. **Hacer clic en "Reclamar"** para tomar un chat
5. **Responder al cliente**
6. **Cerrar el chat** cuando esté resuelto

## 🔧 Funcionalidades Implementadas

### API Routes Creadas:

- `POST /api/chat/sessions` - Crear sesión
- `GET /api/chat/sessions` - Obtener sesiones
- `POST /api/chat/messages` - Enviar mensaje
- `GET /api/chat/messages` - Obtener mensajes
- `POST /api/chat/claim` - Reclamar conversación
- `POST /api/chat/transfer` - Transferir conversación
- `POST /api/chat/close` - Cerrar conversación
- `GET /api/chat/queue` - Obtener cola de chats
- `POST /api/chat/attachments/sign` - Firmar URL de upload
- `POST /api/chat/attachments/complete` - Completar upload
- `POST /api/chat/rating` - Calificar soporte
- `GET /api/chat/notes` - Obtener notas internas
- `POST /api/chat/notes` - Crear nota interna
- `GET /api/support/metrics` - Obtener métricas

### Características del Widget:

- ✅ Diseño premium amarillo/dorado
- ✅ Tabs: Conversación / Artículos
- ✅ Avatares del equipo
- ✅ Indicador online/offline
- ✅ Badge de mensajes no leídos
- ✅ Emojis predefinidos
- ✅ Mensaje de bienvenida configurable
- ✅ Responsive (mobile, tablet, desktop)
- ✅ Supabase Realtime integrado

### Características del Panel de Soporte:

- ✅ Métricas en tiempo real
- ✅ Cola de chats por estado
- ✅ Reclamación de chats
- ✅ Transferencia entre agentes
- ✅ Cierre de conversaciones
- ✅ Notas internas del cliente
- ✅ Calificación de soporte
- ✅ Historial de conversaciones

## 🔒 Seguridad

El sistema implementa:

- **RLS (Row Level Security)** - Políticas de seguridad a nivel de base de datos
- **Roles:** client, staff, admin, owner
- **Clientes:** Solo ven sus propias conversaciones
- **Staff:** Ven todas las conversaciones
- **Admin/Owner:** Acceso completo + gestión de agentes
- **Validación en backend** - No confiamos solo en el frontend

## 📊 Base de Datos

### Tablas Creadas:

- `chat_sessions` - Sesiones de chat
- `chat_messages` - Mensajes individuales
- `chat_attachments` - Archivos adjuntos
- `chat_ratings` - Calificaciones de soporte
- `canned_responses` - Respuestas rápidas
- `internal_notes` - Notas internas
- `chat_audit_logs` - Auditoría de acciones

### Campos Añadidos a `users`:

- `vip_level` - Nivel VIP (0-2)
- `is_support_agent` - Si es agente de soporte
- `online` - Estado online
- `accepting_chats` - Si acepta nuevos chats
- `max_concurrent_chats` - Máximo de chats simultáneos
- `languages` - Idiomas que habla
- `specializations` - Especializaciones
- `last_assigned_at` - Última asignación

## 🚨 Problemas Conocidos

1. **Storage Bucket** - Debe crearse manualmente en Supabase antes de ejecutar el SQL de storage
2. **PowerShell Scripts** - Si tienes problemas con npm, usa Git Bash o CMD
3. **Realtime** - Asegúrate de que Realtime esté habilitado en tu proyecto Supabase

## 📝 Variables de Entorno

No se requieren nuevas variables de entorno. El sistema usa las existentes:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (para API routes)

## 🎨 Personalización

### Cambiar colores del widget:

Edita `web/components/support-chat-widget.tsx`:
- Cambia `from-yellow-400 to-amber-500` a tu gradiente preferido

### Cambiar mensaje de bienvenida:

Edita el mensaje en `web/components/support-chat-widget.tsx` línea ~200

### Cambiar artículos de ayuda:

Edita el array `articles` en `web/components/support-chat-widget.tsx`

## 📞 Soporte

Si encuentras algún problema:

1. Verifica que las migraciones SQL se ejecutaron correctamente
2. Verifica que Realtime esté habilitado en Supabase
3. Verifica que los usuarios tengan los roles correctos
4. Revisa la consola del navegador para errores
5. Revisa los logs de Supabase

## ✅ Checklist de Producción

Antes de usar en producción:

- [ ] Ejecutar todas las migraciones SQL
- [ ] Crear bucket de Storage
- [ ] Configurar al menos un usuario como agente de soporte
- [ ] Verificar que npm install se ejecutó correctamente
- [ ] Verificar que npm run build funciona
- [ ] Verificar que npm run typecheck funciona
- [ ] Probar el chat widget como cliente
- [ ] Probar el panel de soporte como admin
- [ ] Verificar que Supabase Realtime funciona
- [ ] Configurar webhook de Discord (opcional)

## 🎉 ¡Listo!

Una vez completados estos pasos, tu sistema de chat de soporte estará completamente funcional. Los clientes podrán chatear desde la burbuja y los agentes podrán responder desde el panel de administración.
