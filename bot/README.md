# 🤖 TheDulcanDesign Discord Bot

Bot profesional de Discord para el sistema de soporte y gestión de tickets de TheDulcanDesign.

## 📋 Descripción

Bot modular con sistema de tickets, gestión de servicios y administración para el servidor de Discord de TheDulcanDesign.

## 🛠️ Tecnologías

- **Python 3.10+**
- **discord.py 2.3+**
- **python-dotenv** para gestión de variables de entorno
- **Sistema modular** con cogs

## 📁 Estructura del Proyecto

```
bot/
├── main.py              # Archivo principal del bot
├── requirements.txt       # Dependencias de Python
├── .env.example          # Variables de entorno ejemplo
├── cogs/               # Comandos organizados
│   ├── __init__.py
│   ├── help.py         # Comando de ayuda
│   ├── setup.py        # Configuración del servidor
│   ├── services.py      # Comandos de servicios
│   ├── tickets.py       # Sistema de tickets
│   └── admin.py         # Comandos administrativos
├── config/              # Configuraciones
│   ├── __init__.py
│   └── settings.py    # Configuración del bot
├── utils/               # Utilidades
│   ├── __init__.py
│   ├── logger.py       # Sistema de logging
│   └── helpers.py      # Funciones auxiliares
├── services/            # Lógica de servicios
│   ├── __init__.py
│   └── services_list.py # Lista de servicios
└── database/            # Base de datos local
    ├── __init__.py
    └── tickets.py      # Gestión de tickets
```

## 🚀 Instalación

### Prerrequisitos

- Python 3.10 o superior
- pip (gestor de paquetes de Python)
- Cuenta de Discord Developer
- Servidor de Discord para pruebas

### Paso 1: Clonar el repositorio

```bash
cd "C:\Users\FH4XDZzz\Desktop\TheDulcanDesign"
```

### Paso 2: Configurar variables de entorno

```bash
cd bot
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
DISCORD_BOT_TOKEN=tu_bot_token_aqui
DISCORD_CLIENT_ID=tu_client_id
DISCORD_GUILD_ID=tu_guild_id
DISCORD_STAFF_ROLE_ID=tu_staff_role_id
DISCORD_ADMIN_ROLE_ID=tu_admin_role_id
```

### Paso 3: Instalar dependencias

```bash
pip install -r requirements.txt
```

### Paso 4: Crear aplicación Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers)
2. Crea una nueva aplicación
3. Ve a Bot → Create Bot
4. Copia el token → `DISCORD_BOT_TOKEN`
5. Copia el Application ID → `DISCORD_CLIENT_ID`
6. Habilita los siguientes intents:
   - Server Members Intent
   - Message Content Intent
7. En OAuth2 → URL Generator, genera URL de invitación con:
   - `bot`
   - `applications.commands`
   - Permisos: Administrator

### Paso 5: Invitar el bot al servidor

Usa la URL generada para invitar el bot a tu servidor de Discord.

## 🎯 Comandos del Bot

### Comandos Generales

- `!help` - Muestra ayuda del bot
- `!servicios` - Lista todos los servicios disponibles
- `!servicio <nombre>` - Muestra información detallada de un servicio

### Comandos de Tickets

- `!ticket` - Crea un ticket de soporte
- `!cerrar` - Cierra el ticket actual

### Comandos de Administración

- `!setup` - Configuración inicial del servidor (Admin)
- `!admin_stats` - Estadísticas del servidor (Admin)
- `!admin_tickets` - Todos los tickets (Admin)

## 🔧 Configuración del Servidor

### Roles Requeridos

1. **Staff** - ID configurable en `.env`
2. **Admin** - ID configurable en `.env`

### Categorías de Tickets

- **general** - Consultas generales
- **service_request** - Solicitudes de servicios
- **technical_issue** - Problemas técnicos
- **billing** - Problemas de facturación
- **other** - Otros temas

## 🎟 Sistema de Tickets

### Flujo de Creación de Ticket

1. Usuario ejecuta `!ticket`
2. Bot muestra panel con selección de servicio
3. Usuario selecciona servicio y describe su problema
4. Bot crea canal privado con permisos adecuados
5. Bot envía mensaje de bienvenida con botón de cierre
6. Ticket se guarda en base de datos local

### Estados de Tickets

- **Abierto** (🟢) - Ticket activo
- **Cerrado** (🔴) - Ticket finalizado

### Prevención de Duplicados

- Los usuarios solo pueden tener un ticket abierto a la vez
- Sistema verifica tickets abiertos antes de crear uno nuevo
- Mensaje de error si ya existe un ticket abierto

### Permisos

- **Usuarios normales:** Pueden crear tickets, cerrar sus propios tickets
- **Staff:** Pueden cerrar cualquier ticket, ver todos los tickets
- **Admin:** Pueden ver estadísticas, configurar servidor

## 📊 Logs

El bot genera logs en la carpeta `logs/` con el formato `bot_YYYYMMDD.log`

Los logs incluyen:
- Eventos de conexión
- Ejecución de comandos
- Errores y excepciones
- Creación y cierre de tickets

## 🔒 Seguridad

- **Variables de entorno** para credenciales
- **Verificación de permisos** en comandos administrativos
- **Protección de datos** - usuarios solo ven sus tickets
- **Prevención de tickets duplicados**
- **Manejo de errores** robusto

## 🧪 Testing

### Pruebas Básicas

1. **Inicio del bot**
   ```bash
   python main.py
   ```
   Deberías ver:
   ```
   ✅ Bot logged in as TheDulcanDesign (ID: 123456789)
   📊 Connected to 1 guilds
   ------
   ```

2. **Comando !help**
   - Verificar que el comando responde correctamente
   - Verificar que la lista de comandos es correcta

3. **Comando !servicios**
   - Verificar que muestra todos los servicios
   - Verificar formato de embed

4. **Comando !ticket**
   - Verificar que muestra el panel de selección
   - Verificar que previene tickets duplicados
   - Verificar que crea canal privado correctamente
   - Verificar que envía mensaje de bienvenida

5. **Comando !cerrar**
   - Verificar que solo funciona en canales de tickets
   - Verificar que actualiza el estado
   - Verificar que cambia permisos del canal

### Pruebas de Seguridad

1. **Usuario sin permisos**
   - Intentar usar `!setup` como usuario normal
   - Verificar que denegado

2. **Protección de datos**
   - Usuario A crear ticket
   - Usuario B intentar acceder al ticket de A
   - Verificar que no pueda acceder

3. **Tickets duplicados**
   - Usuario crear ticket
   - Intentar crear otro ticket mientras el primero está abierto
   - Verificar que previene la creación

## 🐛 Troubleshooting

### Error: "DISCORD_BOT_TOKEN not found"

**Solución:**
- Asegúrate de haber creado el archivo `.env`
- Verifica que el token esté correctamente copiado
- Verifica que el archivo `.env` esté en la carpeta `bot/`

### Error: "Bot logged in but doesn't respond"

**Solución:**
- Verifica que el bot tenga permisos en el servidor
- Verifica que los intents estén habilitados
- Verifica que el prefix de comandos sea correcto

### Error: "Module not found"

**Solución:**
```bash
pip install -r requirements.txt
```

### Error: "Discord server not found"

**Solución:**
- Verifica que el `DISCORD_GUILD_ID` sea correcto
- Verifica que el bot esté en el servidor
- Verifica la URL de invitación del bot

## 📝 Archivos Importantes

- `.env.example` - Plantilla de variables de entorno
- `requirements.txt` - Dependencias de Python
- `main.py` - Punto de entrada del bot
- `config/settings.py` - Configuración centralizada
- `database/tickets.py` - Sistema de base de datos local

## 🚀 Despliegue

### Opción 1: Local (Desarrollo)

```bash
cd bot
python main.py
```

### Opción 2: Servidor (Producción)

Para despliegue en producción, considera:
- Usar PM2 para mantener el bot corriendo
- Usar systemd service en Linux
- Usar Docker para contenedorización
- Configurar logs rotativos

### Ejemplo con PM2

```bash
npm install -g pm2
pm2 start main.py --name "fh4xdzz-bot"
pm2 save
pm2 startup
```

## 📞 Soporte

Para problemas o sugerencias:
- Crea un ticket en el servidor de Discord
- Contacta al equipo de desarrollo

---

Desarrollado con ❤️ para TheDulcanDesign
