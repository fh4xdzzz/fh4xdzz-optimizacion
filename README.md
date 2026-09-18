# 🚀 TheDulcanDesign

Servicios profesionales de optimización y configuración de OBS, streaming, PC/Windows, gaming y soporte técnico.

## 📋 Descripción del Proyecto

Sistema completo integrado por:
- **Página web moderna** con Next.js para presentación de servicios y gestión de clientes
- **Bot de Discord** profesional para soporte y gestión de tickets
- **Base de datos** con Supabase para gestión de usuarios, servicios y pedidos
- **Sistema de chat de soporte** en tiempo real con Supabase Realtime
- **Actualizaciones en tiempo real** para usuarios, pedidos, servicios y chats
- **Cierre de chat en tiempo real** para clientes sin necesidad de recargar página
- **Mensajes de bienvenida** con nombre del admin al reclamar tickets
- **Sistema de autenticación** seguro para clientes y administradores

## 🛠️ Tecnologías

### Frontend
- **Next.js 16** con App Router
- **TypeScript** para tipado seguro
- **Tailwind CSS** para estilos modernos
- **Supabase** para base de datos y autenticación
- **React Hook Form + Zod** para validación de formularios

### Backend
- **Supabase** (PostgreSQL + Auth + Storage)
- **Row Level Security** para protección de datos
- **Server Actions** de Next.js

### Discord Bot
- **Python 3.10+**
- **discord.py** para integración con Discord
- **Sistema modular** con cogs
- **Gestión de tickets** y soporte

## 📁 Estructura del Proyecto

```
TheDulcanDesign/
├── web/                          # Next.js frontend
│   ├── app/                      # App Router pages
│   ├── components/              # UI components
│   ├── lib/                     # Utilities
│   └── public/                  # Static assets
├── bot/                         # Discord bot
│   ├── cogs/                    # Bot commands
│   ├── utils/                   # Bot utilities
│   └── config/                  # Bot configuration
├── database/                    # Database schemas
├── docs/                        # Documentation
└── .env.example                # Environment variables template
```

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- Python 3.10+
- Cuenta de Supabase
- Cuenta de Discord Developer

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd TheDulcanDesign
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:
- Supabase URL y keys
- Discord bot token
- Discord OAuth credentials

### 3. Instalar dependencias del frontend
```bash
cd web
npm install
```

### 4. Instalar dependencias del bot
```bash
cd ../bot
pip install -r requirements.txt
```

### 5. Configurar Supabase
Ejecuta los scripts SQL en la carpeta `database/` para crear las tablas necesarias.

## 🎯 Servicios Ofrecidos

1. **Optimización de OBS** - Configuración profesional para streaming
2. **Configuración de streaming** - Setup completo para Twitch/YouTube
3. **Optimización de PC/Windows** - Mejora de rendimiento del sistema
4. **Configuración gaming** - Optimización para juegos específicos
5. **Diseño de overlays y alertas** - Elementos visuales personalizados
6. **Soporte técnico** - Resolución de problemas técnicos
7. **Servicios personalizados** - Soluciones a medida

## 🔐 Seguridad

- **Variables de entorno** para todas las credenciales
- **Row Level Security** en Supabase
- **Protección de rutas** administrativas
- **Validación de formularios** con Zod
- **Permisos Discord** para comandos del bot

## 📖 Documentación

- [Guía de instalación](docs/installation.md)
- [Guía de despliegue](docs/deployment.md)
- [Documentación de API](docs/api.md)
- [Guía del bot Discord](docs/discord-bot.md)

## 🤝 Contribución

Este es un proyecto privado de TheDulcanDesign.

## 📄 Licencia

Propiedad de TheDulcanDesign. Todos los derechos reservados.

## 📞 Contacto

- **Discord:** [Unirse al servidor](https://discord.gg/DXkEXrYRvM)
- **Email:** thedulcandesign@gmail.com

---

Desarrollado con ❤️ por TheDulcanDesign
