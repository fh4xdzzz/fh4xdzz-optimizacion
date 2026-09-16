# 🗄️ Base de Datos - TheDulcanDesign

Documentación del esquema de base de datos en Supabase.

## 📋 Tablas

### 1. `users`
Extensión de `auth.users` de Supabase con información adicional del perfil.

**Campos principales:**
- `id` (UUID) - Referencia a auth.users
- `email` (TEXT) - Email del usuario
- `full_name` (TEXT) - Nombre completo
- `discord_id` (TEXT) - ID de Discord (opcional)
- `discord_username` (TEXT) - Usuario de Discord
- `role` (TEXT) - Rol: 'client', 'admin', 'staff'
- `created_at`, `updated_at` - Timestamps

**RLS Policies:**
- Usuarios pueden ver su propio perfil
- Admins pueden ver todos los perfiles
- Usuarios pueden actualizar su propio perfil
- Admins pueden actualizar cualquier perfil

### 2. `services`
Catálogo de servicios ofrecidos.

**Campos principales:**
- `id` (UUID) - Identificador único
- `name` (TEXT) - Nombre del servicio
- `slug` (TEXT) - URL-friendly identifier
- `description` (TEXT) - Descripción detallada
- `category` (TEXT) - Categoría: obs, streaming, pc_windows, gaming, design, support, custom
- `benefits` (TEXT[]) - Lista de beneficios
- `includes` (TEXT[]) - Lista de qué incluye
- `price` (DECIMAL) - Precio del servicio
- `duration_estimate` (TEXT) - Tiempo estimado
- `is_active` (BOOLEAN) - Si está activo
- `is_featured` (BOOLEAN) - Si es destacado

**RLS Policies:**
- Cualquiera puede ver servicios activos
- Admins pueden ver todos los servicios
- Solo admins pueden crear/actualizar/eliminar servicios

### 3. `orders`
Pedidos de servicios realizados por clientes.

**Campos principales:**
- `id` (UUID) - Identificador único
- `order_number` (TEXT) - Número de pedido único (auto-generado)
- `user_id` (UUID) - Cliente que realizó el pedido
- `service_id` (UUID) - Servicio solicitado
- `status` (TEXT) - Estado: pending, reviewing, in_progress, waiting_client, completed, cancelled
- `client_name`, `client_email`, `client_discord` - Información del cliente
- `description` (TEXT) - Descripción de lo que necesita
- `price` (DECIMAL) - Precio final
- `assigned_to` (UUID) - Staff asignado
- `estimated_completion`, `actual_completion` - Fechas de completion

**RLS Policies:**
- Usuarios pueden ver sus propios pedidos
- Admins pueden ver todos los pedidos
- Usuarios pueden crear pedidos
- Admins pueden actualizar cualquier pedido

### 4. `order_events`
Historial de cambios en los pedidos.

**Campos principales:**
- `id` (UUID) - Identificador único
- `order_id` (UUID) - Referencia al pedido
- `event_type` (TEXT) - Tipo de evento
- `old_status`, `new_status` - Cambios de estado
- `description` (TEXT) - Descripción del evento
- `created_by` (UUID) - Quién creó el evento

**RLS Policies:**
- Usuarios pueden ver eventos de sus pedidos
- Admins pueden ver todos los eventos
- Solo admins pueden crear eventos

### 5. `tickets`
Tickets de soporte creados desde Discord.

**Campos principales:**
- `id` (UUID) - Identificador único
- `ticket_number` (TEXT) - Número único (auto-generado)
- `user_id` (UUID) - Usuario asociado
- `discord_channel_id` (TEXT) - Canal de Discord del ticket
- `discord_user_id`, `discord_username` - Info de Discord
- `category` (TEXT) - Categoría del ticket
- `subject`, `description` - Contenido del ticket
- `status` (TEXT) - Estado: open, in_progress, waiting_client, resolved, closed
- `priority` (TEXT) - Prioridad: low, normal, high, urgent
- `assigned_to` (UUID) - Staff asignado

**RLS Policies:**
- Usuarios pueden ver sus propios tickets
- Admins y staff pueden ver todos los tickets
- Usuarios pueden crear tickets
- Admins y staff pueden actualizar tickets

### 6. `ticket_messages`
Mensajes dentro de los tickets.

**Campos principales:**
- `id` (UUID) - Identificador único
- `ticket_id` (UUID) - Referencia al ticket
- `discord_message_id` (TEXT) - ID del mensaje en Discord
- `discord_user_id`, `discord_username` - Info del autor
- `is_staff` (BOOLEAN) - Si es mensaje de staff
- `content` (TEXT) - Contenido del mensaje

**RLS Policies:**
- Usuarios pueden ver mensajes de sus tickets
- Admins y staff pueden ver todos los mensajes
- Solo staff puede crear mensajes del sistema

### 7. `testimonials`
Testimonios de clientes satisfechos.

**Campos principales:**
- `id` (UUID) - Identificador único
- `user_id` (UUID) - Usuario que dejó el testimonio
- `order_id` (UUID) - Pedido relacionado
- `client_name`, `client_avatar` - Info del cliente
- `rating` (INTEGER) - Calificación 1-5
- `title`, `content` - Contenido del testimonio
- `is_verified` (BOOLEAN) - Si es verificado
- `is_displayed` (BOOLEAN) - Si se muestra públicamente

**RLS Policies:**
- Cualquiera puede ver testimonios mostrados
- Usuarios pueden ver sus propios testimonios
- Admins pueden ver/actualizar/eliminar todos los testimonios

### 8. `business_settings`
Configuración del negocio.

**Campos principales:**
- `id` (UUID) - Identificador único
- `key` (TEXT) - Clave única de configuración
- `value` (JSONB) - Valor de configuración
- `description` (TEXT) - Descripción

**Configuraciones incluidas:**
- `public_business_info` - Información pública del negocio
- `public_contact_info` - Información de contacto
- `public_features` - Características y beneficios
- `admin_notification_settings` - Configuración de notificaciones
- `admin_order_settings` - Configuración de pedidos
- `admin_ticket_settings` - Configuración de tickets

**RLS Policies:**
- Cualquiera puede ver configuraciones públicas (key prefix 'public_')
- Solo admins pueden ver/crear/actualizar/eliminar configuraciones

## 🚀 Instalación

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Espera a que el proyecto esté listo

### 2. Ejecutar scripts SQL
En el SQL Editor de Supabase, ejecuta los scripts en orden:

1. `01_users.sql` - Tabla de usuarios y triggers
2. `02_services.sql` - Tabla de servicios y datos de ejemplo
3. `03_orders.sql` - Tabla de pedidos y eventos
4. `04_tickets.sql` - Tabla de tickets y mensajes
5. `05_testimonials.sql` - Tabla de testimonios
6. `06_business_settings.sql` - Configuraciones del negocio
7. `11_orders_delete_policy.sql` - Política RLS para eliminación de pedidos por owner

### 3. Configurar variables de entorno
Copia las credenciales de Supabase a tu archivo `.env`:
- `NEXT_PUBLIC_SUPABASE_URL` - Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon public key
- `SUPABASE_SERVICE_ROLE_KEY` - service_role key

## 🔒 Seguridad

- **Row Level Security (RLS)** activado en todas las tablas
- **Policies granulares** para cada tipo de usuario
- **Referencias con CASCADE** para integridad de datos
- **Índices optimizados** para rendimiento
- **Triggers automáticos** para timestamps y IDs

## 📊 Relaciones

```
users (1) ----< (N) orders
users (1) ----< (N) tickets
users (1) ----< (N) testimonials
users (1) ----< (N) order_events (created_by)
users (1) ----< (N) tickets (assigned_to)
users (1) ----< (N) orders (assigned_to)

services (1) ----< (N) orders
orders (1) ----< (N) order_events
orders (1) ----< (N) testimonials
tickets (1) ----< (N) ticket_messages
```

## 🧪 Testing

Los scripts incluyen datos de ejemplo para:
- 7 servicios con diferentes categorías
- 4 testimonios de ejemplo
- Configuraciones iniciales del negocio

Estos datos están marcados como DEMO y pueden ser modificados o eliminados en producción.

## 📝 Notas

- Los números de pedido y ticket se generan automáticamente con formato: ORDYYYYMMDDXXXX y TKTYYYYMMDDXXXX
- Los timestamps usan UTC
- Los arrays JSONB permiten almacenar listas flexibles
- Las políticas RLS aseguran que los clientes solo accedan a sus propios datos
