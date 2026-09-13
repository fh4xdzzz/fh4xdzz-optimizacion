# Discord Setup Guide

## 📋 Introducción

Esta guía explica cómo configurar el bot de Discord de TheDulcanDesign con la integración profesional con la web.

## 🚀 Requisitos Previos

- Python 3.10 o superior
- Node.js 18 o superior
- Cuenta de Discord Developer
- Proyecto de Supabase
- Acceso administrativo al servidor de Discord

## 🔧 Configuración del Bot en Discord

### 1. Crear Aplicación en Discord Developer Portal

1. Ve a https://discord.com/developers/applications
2. Click en "New Application"
3. Nombre: "TheDulcanDesign Bot"
4. Click en "Create"

### 2. Crear el Bot

1. En el menú izquierdo, click en "Bot"
2. Click en "Add Bot"
3. Click en "Yes, do it!"
4. Click en "Reset Token" para generar el token
5. **Copia el token** - lo necesitarás para `.env`

### 3. Configurar Privileged Intents

1. En la sección "Bot", baja hasta "Privileged Gateway Intents"
2. Habilita:
   - ✅ **Message Content Intent**
   - ✅ **Server Members Intent**
   - ✅ **Presence Intent** (opcional)
3. Click en "Save Changes"

### 4. Configurar Permisos del Bot

1. Ve a "OAuth2" → "URL Generator"
2. Scopes: `bot`
3. Bot Permissions:
   - ✅ Manage Channels
   - ✅ Manage Roles
   - ✅ Manage Guild
   - ✅ Send Messages
   - ✅ View Channels
   - ✅ Read Message History
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Add Reactions
   - ✅ Use Slash Commands
4. Copia el enlace generado e invita el bot a tu servidor

### 5. Obtener IDs Necesarios

**Discord Bot Token:**
- Ya copiado del paso 2

**Discord Client ID:**
- En Discord Developer Portal → General Information → Application ID

**Discord Guild ID:**
- Ve a tu servidor de Discord
- Activa "Modo desarrollador" en Configuración del servidor → Avanzado
- Click derecho en el nombre del servidor → "Copiar ID"

## 🔐 Configuración de Variables de Entorno

### Bot (.env)

Crea un archivo `.env` en la carpeta `bot/`:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_discord_guild_id_here
DISCORD_STAFF_ROLE_ID=your_discord_staff_role_id_here
DISCORD_ADMIN_ROLE_ID=your_discord_admin_role_id_here

# Bot Configuration
BOT_PREFIX=!

# Webhook Configuration
DISCORD_WEBHOOK_SECRET=your_webhook_secret_here
DISCORD_BOT_API_URL=http://localhost:5000/webhook
DISCORD_BOT_API_SECRET=your_bot_api_secret_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Web Integration
WEBHOOK_URL=http://localhost:5000/webhook
```

**Generar Webhook Secret:**
```bash
openssl rand -hex 32
```

### Web (.env.local)

Agrega estas variables a `web/.env.local`:

```bash
# Discord Webhook Integration (Server-side only)
DISCORD_WEBHOOK_SECRET=your_webhook_secret_here
DISCORD_BOT_API_URL=http://localhost:5000/webhook
DISCORD_BOT_API_SECRET=your_bot_api_secret_here
DISCORD_NOTIFICATION_CHANNEL_ID=your_notification_channel_id_here
```

**IMPORTANTE:** El secreto debe ser el mismo en ambos archivos.

## 🏗️ Instalación y Configuración

### 1. Instalar Dependencias del Bot

```bash
cd bot
pip install -r requirements.txt
```

### 2. Instalar Dependencias de la Web

```bash
cd web
npm install
```

### 3. Iniciar el Bot

```bash
cd bot
python main.py
```

El bot debería:
- Conectarse a Discord
- Iniciar el servidor Flask en puerto 5000
- Inicializar el EventProcessor
- Cargar todos los cogs

### 4. Configurar el Servidor

En Discord, ejecuta:

```
!setup-server
```

Este comando:
- ✅ Creará todas las categorías necesarias
- ✅ Creará todos los canales necesarios
- ✅ Creará todos los roles necesarios
- ✅ Configurará permisos correctamente
- ✅ Enviará mensajes de bienvenida
- ✅ Guardará la configuración en `server_config.json`

### 5. Verificar Configuración

```
!setup-status
```

## 📊 Estructura del Servidor

### Categorías

- **INFORMACIÓN** - Información del servidor
- **SOPORTE** - Canales de soporte
- **PEDIDOS** - Gestión de pedidos
- **CLIENTES** - Área de clientes
- **STAFF** - Área de staff
- **TICKETS** - Sistema de tickets
- **LOGS** - Logs del servidor

### Canales

- **anuncios** - Anuncios oficiales
- **reglas** - Reglas del servidor
- **servicios** - Información de servicios
- **abrir-ticket** - Canal para abrir tickets
- **pedidos** - Registro de pedidos
- **soporte** - Soporte técnico
- **staff** - Comunicación del staff
- **logs** - Logs del servidor (privado)
- **notificaciones** - Notificaciones del sistema (privado)

### Roles

- **Owner** - Dueño del servidor
- **Administrador** - Administradores
- **Moderador** - Moderadores
- **Staff** - Staff de soporte
- **Soporte** - Equipo de soporte
- **Cliente** - Clientes registrados
- **Miembro** - Miembros del servidor

## 🔧 Comandos Disponibles

### Configuración

- `!setup-server` - Configurar servidor automáticamente
- `!setup-status` - Ver estado de configuración
- `!setup-reset` - Resetear configuración (solo owner)
- `!test-webhook` - Probar webhook

### Tienda

- `!tienda` - Ver catálogo de servicios
- `!comprar <id>` - Comprar servicio
- `!mispedidos` - Ver mis pedidos
- `!pedidos` - Ver todos los pedidos (admin)
- `!estado <id> <nuevo_estado>` - Actualizar estado de pedido (admin)

### Soporte

- `!ticket <descripción>` - Crear ticket
- `!cerrar` - Cerrar ticket
- `!tickets` - Listar tickets

### Sincronización

- `!sync-discord [user_id]` - Sincronizar cuenta Discord
- `!sync-roles` - Sincronizar roles Discord → Supabase (admin)
- `!sync-web-to-discord` - Sincronizar roles Supabase → Discord (admin)

### Notificaciones

- `!notify <tipo> <detalles>` - Enviar notificación manual (admin)

### Información

- `!ayuda` - Ver ayuda
- `!servidor` - Información del servidor
- `!ping` - Latencia del bot

## 🔒 Seguridad

### Permisos del Bot

El bot necesita estos permisos mínimos:
- Manage Channels
- Manage Roles
- Manage Guild
- Send Messages
- View Channels
- Read Message History

### Validación de Permisisos

El bot valida:
- ✅ Que el usuario tenga permisos suficientes
- ✅ Que el bot tenga permisos suficientes
- ✅ Que el guild_id sea el configurado
- ✅ Que el rol sea el correcto

### Sanitización de Logs

Los logs automáticamente:
- ✅ Remueven tokens
- ✅ Remueven passwords
- ✅ Remueven secrets
- ✅ Remueven api_keys

## 🧪 Pruebas

### Probar Webhook

```bash
# En Discord
!test-webhook
```

### Probar Eventos

```typescript
// En la web
import { getDiscordService } from '@/lib/discord-integration'

const discordService = getDiscordService()
await discordService.notifyNewOrder({
  order_id: 'test-123',
  order_number: 'ORD-001',
  service_name: 'Optimización de OBS',
  customer_name: 'Cliente de prueba',
  customer_email: 'test@example.com',
  status: 'pending'
})
```

## 🐛 Solución de Problemas

### Bot no se conecta

**Problema:** Bot no se conecta a Discord

**Solución:**
1. Verifica que el token sea correcto
2. Verifica que los privileged intents estén habilitados
3. Verifica que el bot esté invitado al servidor

### Error: "Forbidden" en webhook

**Problema:** Token webhook inválido

**Solución:**
1. Verifica que `DISCORD_WEBHOOK_SECRET` sea el mismo en bot y web
2. Verifica que el header `Authorization` esté configurado correctamente

### Error: "Rate limit exceeded"

**Problema:** Demasiadas solicitudes al webhook

**Solución:**
1. Espera 1 minuto
2. Implementa retry con exponential backoff
3. Aumenta el rate limit en producción

### Error: "Event already processed"

**Problema:** Evento duplicado

**Solución:**
1. Esto es normal - el sistema previene duplicados
2. Verifica que `event_id` sea único

### Categorías no se crean

**Problema:** `!setup-server` no crea categorías

**Solución:**
1. Verifica que el bot tenga permisos de Manage Channels
2. Verifica que el bot tenga permisos de Manage Guild
3. Verifica que seas administrador del servidor

## 📚 Recursos Adicionales

- [Discord.py Documentation](https://discordpy.readthedocs.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Discord Developer Portal](https://discord.com/developers/applications)

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en `bot/bot.log`
2. Revisa la consola del bot
3. Verifica las variables de entorno
4. Contacta al equipo de soporte
