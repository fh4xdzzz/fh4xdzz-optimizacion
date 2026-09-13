# Discord Permissions Guide

## 📋 Introducción

Este documento explica los permisos necesarios para el bot de Discord de TheDulcanDesign.

## 🔐 Permisos del Bot

### Permisos Requeridos

El bot necesita estos permisos mínimos para funcionar correctamente:

| Permiso | Nombre | Propósito |
|---------|--------|-----------|
| Manage Channels | Gestionar canales | Crear categorías y canales |
| Manage Roles | Gestionar roles | Crear y asignar roles |
| Manage Guild | Gestionar servidor | Configuración del servidor |
| Send Messages | Enviar mensajes | Enviar notificaciones |
| View Channels | Ver canales | Ver todos los canales |
| Read Message History | Leer historial | Leer mensajes antiguos |
| Embed Links | Enviar embeds | Enviar mensajes enriquecidos |
| Attach Files | Adjuntar archivos | Enviar archivos |
| Add Reactions | Agregar reacciones | Reactar a mensajes |
| Use Slash Commands | Usar comandos slash | Ejecutar comandos |

### Permisos Opcionales

| Permiso | Nombre | Propósito |
|---------|--------|-----------|
| Connect | Conectar | Unirse a canales de voz |
| Speak | Hablar | Hablar en canales de voz |
| Mute Members | Silenciar miembros | Silenciar usuarios |
| Deafen Members | Sordinear miembros | Sordinear usuarios |
| Move Members | Mover miembros | Mover entre canales |

## 🛡️ Permisos de Roles

### Roles Jerárquicos

El sistema crea roles con diferentes niveles de permisos:

#### Owner
- **Color:** Negro (0x000000)
- **Permisos:** Todos
- **Jerarquía:** Más alto
- **Visual:** Hoist (separado de otros roles)

#### Administrador
- **Color:** Rojo (0xff0000)
- **Permisos:** Todos
- **Jerarquía:** Alto
- **Visual:** No hoist

#### Moderador
- **Color:** Cian (0x00ffff)
- **Permisos:** Todos
- **Jerarquía:** Medio-alto
- **Visual:** No hoist

#### Staff
- **Color:** Púrpura (0x9b59b6)
- **Permisos:** Todos
- **Jerarquía:** Medio
- **Visual:** No hoist

#### Soporte
- **Color:** Azul (0x3498db)
- **Permisos:** Ninguno (personalizados por canal)
- **Jerarquía:** Medio-bajo
- **Visual:** No hoist

#### Cliente
- **Color:** Verde (0x2ecc71)
- **Permisos:** Ninguno (personalizados por canal)
- **Jerarquía:** Bajo
- **Visual:** No hoist

#### Miembro
- **Color:** Gris (0x95a5a6)
- **Permisos:** Ninguno (personalizados por canal)
- **Jerarquía:** Más bajo
- **Visual:** No hoist

## 🔒 Permisos de Canales

### Canales Públicos

**#anuncios, #reglas, #servicios, #abrir-ticket, #pedidos, #soporte:**
- ✅ Todos pueden ver
- ✅ Todos pueden leer
- ✅ Todos pueden enviar mensajes
- ❌ No requieren permisos especiales

### Canales de Staff

**#staff:**
- ❌ Público no puede ver
- ❌ Público no puede leer
- ❌ Público no puede enviar mensajes
- ✅ Staff puede ver
- ✅ Staff puede leer
- ✅ Staff puede enviar mensajes

### Canales de Logs

**#logs, #notificaciones:**
- ❌ Público no puede ver
- ❌ Público no puede leer
- ❌ Público no puede enviar mensajes
- ✅ Bot puede ver
- ✅ Bot puede leer
- ✅ Bot puede enviar mensajes

## 🔑 Permisos de Comandos

### Comandos de Configuración

**!setup-server:**
- Requiere: `administrator` permission
- Solo: Administradores
- Valida: Permisos del bot

**!setup-status:**
- Requiere: `administrator` permission
- Solo: Administradores

**!setup-reset:**
- Requiere: Owner del servidor
- Solo: Owner
- Requiere: Confirmación

### Comandos de Administración

**!pedidos:**
- Requiere: `administrator` permission o rol Admin
- Solo: Administradores

**!estado:**
- Requiere: `administrator` permission o rol Admin
- Solo: Administradores

**!sync-roles:**
- Requiere: `administrator` permission o rol Admin
- Solo: Administradores

**!sync-web-to-discord:**
- Requiere: `administrator` permission o rol Admin
- Solo: Administradores

**!notify:**
- Requiere: `administrator` permission o rol Admin
- Solo: Administradores

### Comandos de Usuario

**!tienda:**
- Requiere: Ninguno
- Para: Todos

**!comprar:**
- Requiere: Ninguno
- Para: Todos

**!mispedidos:**
- Requiere: Ninguno
- Para: Todos

**!ticket:**
- Requiere: Ninguno
- Para: Todos

**!cerrar:**
- Requiere: Ninguno
- Para: Todos (en su propio ticket)

**!tickets:**
- Requiere: Ninguno
- Para: Todos

**!ayuda:**
- Requiere: Ninguno
- Para: Todos

**!servidor:**
- Requiere: Ninguno
- Para: Todos

**!ping:**
- Requiere: Ninguno
- Para: Todos

## 🚀 Invitar el Bot

### Enlace de Invitación con Permisos

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot
```

### Permiso Completo (8)

Para facilitar la configuración inicial, puedes usar el permiso completo (8), pero **no es recomendado en producción**.

### Permisos Mínimos

Para producción, usa permisos específicos:

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268527616&scope=bot
```

Donde `268527616` incluye:
- Manage Channels (16)
- Manage Roles (268435456)
- Manage Guild (32)
- Send Messages (2048)
- View Channels (1024)
- Read Message History (65536)
- Embed Links (16384)
- Attach Files (32768)
- Add Reactions (64)
- Use Slash Commands (2147483648)

## 🛡️ Seguridad

### Validación de Permisos

El bot valida automáticamente:

```python
# Verificar permisos del bot
bot_permissions = ctx.guild.me.guild_permissions
required_permissions = [
    discord.Permissions.manage_channels,
    discord.Permissions.manage_roles,
    discord.Permissions.manage_guild
]

missing_permissions = [p for p in required_permissions if not bot_permissions.value & p.value]
if missing_permissions:
    await ctx.send(f"❌ El bot no tiene permisos suficientes. Faltan: {', '.join([p.name for p in missing_permissions])}")
    return
```

### Validación de Roles

```python
# Verificar rol de admin
admin_role = discord.utils.get(member.roles, name='Admin')
if not admin_role:
    await ctx.send("❌ No tienes permisos para ejecutar este comando")
    return
```

### Validación de Owner

```python
# Verificar si es owner
if ctx.guild.owner_id != ctx.author.id:
    await ctx.send("❌ Solo el owner puede ejecutar este comando")
    return
```

## 🐛 Solución de Problemas

### Error: "Missing Permissions"

**Causa:** El bot no tiene permisos suficientes

**Solución:**
1. Verifica que el bot tenga los permisos requeridos
2. Re-invita el bot con permisos correctos
3. Verifica que los permisos estén habilitados en el servidor

### Error: "Forbidden"

**Causa:** El usuario no tiene permisos

**Solución:**
1. Verifica que el usuario tenga el rol correcto
2. Verifica que el rol tenga los permisos necesarios
3. Contacta al administrador

### Error: "Channel not found"

**Causa:** El bot no puede ver el canal

**Solución:**
1. Verifica que el bot tenga permiso View Channel
2. Verifica que el canal exista
3. Ejecuta `!setup-server` para crear canales

## 📚 Referencias

- [Discord Permissions](https://discord.com/developers/docs/topics/permissions)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Discord.py Permissions](https://discordpy.readthedocs.io/en/stable/api.html#discord.Permissions)
