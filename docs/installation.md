# 📦 Guía de Instalación

Guía paso a paso para instalar y configurar TheDulcanDesign.

## 🎯 Prerrequisitos

- **Node.js** 18 o superior
- **Python** 3.10 o superior
- **npm** o **yarn**
- **Git**
- **Cuenta de Supabase** (gratis en supabase.com)
- **Cuenta de Discord Developer** (gratis en discord.com/developers)

## 🚀 Pasos de Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd "TheDulcanDesign"
```

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales reales.

### 3. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo
2. Ve a Settings → API y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
3. Ejecuta los scripts SQL en la carpeta `database/` para crear las tablas

### 4. Configurar Discord Bot

1. Ve a [Discord Developer Portal](https://discord.com/developers)
2. Crea una nueva aplicación
3. Ve a Bot → Create Bot y copia el token → `DISCORD_BOT_TOKEN`
4. Copia el Application ID → `DISCORD_CLIENT_ID`
5. Habilita los siguientes intents:
   - Server Members Intent
   - Message Content Intent
6. En OAuth2 → URL Generator, genera una URL de invitación del bot con:
   - `bot`
   - `applications.commands`
   - Permisos: Administrator

### 5. Configurar Discord OAuth2 (Opcional)

1. En Discord Developer Portal, ve a OAuth2 → General
2. Copia Client ID → `NEXT_PUBLIC_DISCORD_CLIENT_ID`
3. Copia Client Secret → `DISCORD_CLIENT_SECRET`
4. Agrega redirect URIs:
   - `http://localhost:3000/api/auth/discord/callback`
   - Tu dominio de producción `/api/auth/discord/callback`

### 6. Instalar Dependencias del Frontend

```bash
cd web
npm install
```

### 7. Instalar Dependencias del Bot

```bash
cd ../bot
pip install -r requirements.txt
```

## 🧪 Verificar Instalación

### Probar el Frontend

```bash
cd web
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Probar el Bot

```bash
cd bot
python main.py
```

Deberías ver:
```
✅ Bot logged in as TheDulcanDesign (ID: 123456789)
📊 Connected to 1 guilds
------
```

## 🔧 Configuración Adicional

### Configurar Servidor Discord

Invita el bot a tu servidor con los permisos de Administrator.

### Configurar Roles Discord

Crea los siguientes roles en tu servidor:
- **Staff** → ID en `DISCORD_STAFF_ROLE_ID`
- **Admin** → ID en `DISCORD_ADMIN_ROLE_ID`

### Configurar Base de Datos

Ejecuta los scripts SQL en orden:
1. `01_users.sql`
2. `02_services.sql`
3. `03_orders.sql`
4. `04_tickets.sql`
5. `05_business_settings.sql`

## ❌ Solución de Problemas

### Error: "DISCORD_BOT_TOKEN not found"
- Asegúrate de haber creado el archivo `.env`
- Verifica que el token esté correctamente copiado

### Error: "Supabase connection failed"
- Verifica que las credenciales de Supabase sean correctas
- Asegúrate de que el proyecto de Supabase esté activo

### Error: "Module not found"
- Ejecuta `npm install` en la carpeta `web`
- Ejecuta `pip install -r requirements.txt` en la carpeta `bot`

## 📞 Soporte

Si tienes problemas durante la instalación:
- Crea un ticket en el Discord
- Contacta al equipo de soporte

---

¡Instalación completada! 🎉
