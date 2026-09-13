import discord
from discord.ext import commands
from discord import ui
from typing import Optional
import json
import os
from utils.logger import logger
from config.settings import config

# Configuración del servidor
SERVER_CONFIG_FILE = 'server_config.json'

# Categorías sugeridas
CATEGORIES = {
    'INFORMACIÓN': {'description': 'Información del servidor', 'position': 0},
    'SOPORTE': {'description': 'Canales de soporte', 'position': 1},
    'PEDIDOS': {'description': 'Gestión de pedidos', 'position': 2},
    'CLIENTES': {'description': 'Área de clientes', 'position': 3},
    'STAFF': {'description': 'Área de staff', 'position': 4},
    'TICKETS': {'description': 'Sistema de tickets', 'position': 5},
    'LOGS': {'description': 'Logs del servidor', 'position': 6}
}

# Canales sugeridos
CHANNELS = {
    'anuncios': {'category': 'INFORMACIÓN', 'description': 'Anuncios oficiales', 'type': 'text'},
    'reglas': {'category': 'INFORMACIÓN', 'description': 'Reglas del servidor', 'type': 'text'},
    'servicios': {'category': 'INFORMACIÓN', 'description': 'Información de servicios', 'type': 'text'},
    'abrir-ticket': {'category': 'TICKETS', 'description': 'Canal para abrir tickets', 'type': 'text'},
    'pedidos': {'category': 'PEDIDOS', 'description': 'Registro de pedidos', 'type': 'text'},
    'soporte': {'category': 'SOPORTE', 'description': 'Soporte técnico', 'type': 'text'},
    'staff': {'category': 'STAFF', 'description': 'Comunicación del staff', 'type': 'text'},
    'logs': {'category': 'LOGS', 'description': 'Logs del servidor', 'type': 'text'},
    'notificaciones': {'category': 'LOGS', 'description': 'Notificaciones del sistema', 'type': 'text'}
}

# Roles sugeridos
ROLES = {
    'Owner': {'color': 0x000000, 'permissions': discord.Permissions.all(), 'hoist': True},
    'Administrador': {'color': 0xff0000, 'permissions': discord.Permissions.all(), 'hoist': False},
    'Moderador': {'color': 0x00ffff, 'permissions': discord.Permissions.all(), 'hoist': False},
    'Staff': {'color': 0x9b59b6, 'permissions': discord.Permissions.all(), 'hoist': False},
    'Soporte': {'color': 0x3498db, 'permissions': discord.Permissions.none(), 'hoist': False},
    'Cliente': {'color': 0x2ecc71, 'permissions': discord.Permissions.none(), 'hoist': False},
    'Miembro': {'color': 0x95a5a6, 'permissions': discord.Permissions.none(), 'hoist': False}
}

class SetupServer(commands.Cog):
    """Comando para configuración automática del servidor"""

    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='setup-server')
    @commands.has_permissions(administrator=True)
    async def setup_server(self, ctx):
        """Configurar servidor automáticamente"""
        try:
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

            # Verificar permisos del usuario
            if not ctx.author.guild_permissions.administrator:
                await ctx.send("❌ Solo los administradores pueden ejecutar este comando.")
                return

            # Mostrar progreso
            status_message = await ctx.send("🔧 Iniciando configuración del servidor...")

            # Cargar configuración existente si existe
            server_config = self.load_server_config()

            # Paso 1: Crear categorías
            await status_message.edit(content="🔧 Paso 1/6: Creando categorías...")
            categories = await self.create_categories(ctx.guild, server_config)

            # Paso 2: Crear canales
            await status_message.edit(content="🔧 Paso 2/6: Creando canales...")
            channels = await self.create_channels(ctx.guild, categories, server_config)

            # Paso 3: Crear roles
            await status_message.edit(content="🔧 Paso 3/6: Creando roles...")
            roles = await self.create_roles(ctx.guild, server_config)

            # Paso 4: Configurar permisos
            await status_message.edit(content="🔧 Paso 4/6: Configurando permisos...")
            await self.setup_permissions(ctx.guild, categories, channels, roles)

            # Paso 5: Enviar mensajes de bienvenida
            await status_message.edit(content="🔧 Paso 5/6: Enviando mensajes de bienvenida...")
            await self.send_welcome_messages(ctx.guild, channels)

            # Paso 6: Guardar configuración
            await status_message.edit(content="🔧 Paso 6/6: Guardando configuración...")
            server_config = {
                'guild_id': str(ctx.guild.id),
                'categories': categories,
                'channels': channels,
                'roles': roles,
                'setup_at': discord.utils.utcnow().isoformat()
            }
            self.save_server_config(server_config)

            # Resumen final
            embed = discord.Embed(
                title="✅ Configuración Completada",
                description="El servidor ha sido configurado exitosamente",
                color=0x00ff00
            )

            embed.add_field(name="Categorías creadas", value=str(len(categories)), inline=True)
            embed.add_field(name="Canales creados", value=str(len(channels)), inline=True)
            embed.add_field(name="Roles creados", value=str(len(roles)), inline=True)
            embed.add_field(name="ID del servidor", value=ctx.guild.id, inline=False)
            embed.add_field(name="Fecha de configuración", value=server_config['setup_at'], inline=False)

            embed.set_footer(text="TheDulcanDesign - Configuración Profesional")

            await ctx.send(embed=embed)
            logger.info(f"Servidor {ctx.guild.name} configurado exitosamente por {ctx.author}")

        except Exception as e:
            logger.error(f"Error en setup-server: {e}")
            await ctx.send(f"❌ Error durante la configuración: {str(e)}")

    @commands.command(name='setup-status')
    @commands.has_permissions(administrator=True)
    async def setup_status(self, ctx):
        """Mostrar estado de la configuración"""
        server_config = self.load_server_config()

        if not server_config:
            await ctx.send("⚠️ El servidor no ha sido configurado aún. Usa `!setup-server` para configurarlo.")
            return

        embed = discord.Embed(
            title="📊 Estado de Configuración",
            description="Configuración actual del servidor",
            color=0x00ff00
        )

        embed.add_field(name="ID del servidor", value=server_config['guild_id'], inline=False)
        embed.add_field(name="Fecha de configuración", value=server_config['setup_at'], inline=False)
        embed.add_field(name="Categorías", value=str(len(server_config.get('categories', {}))), inline=True)
        embed.add_field(name="Canales", value=str(len(server_config.get('channels', {}))), inline=True)
        embed.add_field(name="Roles", value=str(len(server_config.get('roles', {}))), inline=True)

        embed.set_footer(text="TheDulcanDesign - Configuración Profesional")

        await ctx.send(embed=embed)

    @commands.command(name='setup-reset')
    @commands.has_permissions(administrator=True)
    async def setup_reset(self, ctx):
        """Resetear configuración (requiere confirmación)"""
        # Verificar si es owner
        if ctx.guild.owner_id != ctx.author.id:
            await ctx.send("❌ Solo el owner del servidor puede resetear la configuración.")
            return

        # Pedir confirmación
        embed = discord.Embed(
            title="⚠️ Confirmación de Reset",
            description="Esto eliminará toda la configuración del servidor.\n\n**ESTA ACCIÓN ES IRREVERSIBLE**",
            color=0xff0000
        )

        embed.add_field(name="¿Estás seguro?", value="Responde con 'confirmar' para proceder", inline=False)

        await ctx.send(embed=embed)

        def check(m):
            return m.author == ctx.author and m.content.lower() == 'confirmar'

        try:
            await self.bot.wait_for('message', check=check, timeout=30.0)
        except:
            await ctx.send("❌ Timeout. Reset cancelado.")
            return

        # Resetear configuración
        if os.path.exists(SERVER_CONFIG_FILE):
            os.remove(SERVER_CONFIG_FILE)

        await ctx.send("✅ Configuración reseteada. Usa `!setup-server` para configurar el servidor nuevamente.")
        logger.info(f"Configuración reseteada por {ctx.author} en {ctx.guild.name}")

    @commands.command(name='test-webhook')
    @commands.has_permissions(administrator=True)
    async def test_webhook(self, ctx):
        """Probar webhook"""
        webhook_url = os.getenv('DISCORD_WEBHOOK_URL')
        if not webhook_url:
            await ctx.send("❌ DISCORD_WEBHOOK_URL no está configurado en .env")
            return

        try:
            test_event = {
                'event_id': f'test_{ctx.guild.id}_{int(discord.utils.utcnow().timestamp())}',
                'event_type': 'system.alert',
                'created_at': discord.utils.utcnow().isoformat(),
                'organization_id': 'thedulcandesign',
                'payload': {
                    'level': 'info',
                    'message': 'Prueba de webhook desde Discord',
                    'origin': 'Discord bot',
                    'technical_info': {
                        'server': ctx.guild.name,
                        'author': ctx.author.name
                    }
                }
            }

            response = await fetch(webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {os.getenv("DISCORD_WEBHOOK_SECRET")}'
                },
                body: json.dumps(test_event)
            })

            if response.ok:
                await ctx.send("✅ Webhook funcionando correctamente")
            else:
                await ctx.send(f"❌ Error en webhook: {response.status}")
        except Exception as e:
            await ctx.send(f"❌ Error probando webhook: {str(e)}")

    def load_server_config(self) -> dict:
        """Cargar configuración del servidor desde archivo"""
        if not os.path.exists(SERVER_CONFIG_FILE):
            return {}

        try:
            with open(SERVER_CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error cargando configuración: {e}")
            return {}

    def save_server_config(self, config: dict):
        """Guardar configuración del servidor a archivo"""
        try:
            with open(SERVER_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            logger.info("Configuración guardada exitosamente")
        except Exception as e:
            logger.error(f"Error guardando configuración: {e}")

    async def create_categories(self, guild, existing_config: dict) -> dict:
        """Crear categorías del servidor"""
        categories = existing_config.get('categories', {})

        for cat_name, cat_config in CATEGORIES.items():
            # Verificar si ya existe
            existing = discord.utils.get(guild.categories, name=cat_name)
            if existing:
                categories[cat_name] = str(existing.id)
                logger.info(f"Categoría ya existe: {cat_name}")
                continue

            # Crear categoría
            category = await guild.create_category(
                name=cat_name,
                overwrites=None,
                position=cat_config['position']
            )
            categories[cat_name] = str(category.id)
            logger.info(f"Categoría creada: {cat_name}")

        return categories

    async def create_channels(self, guild, categories: dict, existing_config: dict) -> dict:
        """Crear canales del servidor"""
        channels = existing_config.get('channels', {})

        for channel_name, channel_config in CHANNELS.items():
            # Verificar si ya existe
            existing = discord.utils.get(guild.text_channels, name=channel_name)
            if existing:
                channels[channel_name] = str(existing.id)
                logger.info(f"Canal ya existe: {channel_name}")
                continue

            # Obtener categoría
            category_id = categories.get(channel_config['category'])
            category = discord.get_channel(category_id) if category_id else None

            # Crear canal
            if channel_config['type'] == 'text':
                # Permisos especiales para logs
                overwrites = None
                if channel_name in ['logs', 'notificaciones']:
                    overwrites = {
                        guild.default_role: discord.PermissionOverwrite(view_channel=False, read_messages=False),
                        guild.me: discord.PermissionOverwrite(view_channel=True, read_messages=True)
                    }

                channel = await (category or guild).create_text_channel(
                    name=channel_name,
                    overwrites=overwrites
                )
            else:
                channel = await (category or guild).create_voice_channel(name=channel_name)

            channels[channel_name] = str(channel.id)
            logger.info(f"Canal creado: {channel_name}")

        return channels

    async def create_roles(self, guild, existing_config: dict) -> dict:
        """Crear roles del servidor"""
        roles = existing_config.get('roles', {})

        for role_name, role_config in ROLES.items():
            # Verificar si ya existe
            existing = discord.utils.get(guild.roles, name=role_name)
            if existing:
                roles[role_name] = str(existing.id)
                logger.info(f"Rol ya existe: {role_name}")
                continue

            # Crear rol
            role = await guild.create_role(
                name=role_name,
                color=role_config['color'],
                permissions=role_config['permissions'],
                hoist=role_config['hoist']
            )
            roles[role_name] = str(role.id)
            logger.info(f"Rol creado: {role_name}")

        return roles

    async def setup_permissions(self, guild, categories: dict, channels: dict, roles: dict):
        """Configurar permisos de canales"""
        # Configurar permisos por canal
        for channel_name, channel_config in CHANNELS.items():
            channel_id = channels.get(channel_name)
            if not channel_id:
                continue

            channel = guild.get_channel(channel_id)
            if not channel:
                continue

            # Permisos especiales para logs
            if channel_name in ['logs', 'notificaciones']:
                await channel.set_permissions(
                    guild.default_role,
                    view_channel=False,
                    read_messages=False
                )

            # Permisos para staff
            if channel_name == 'staff':
                staff_role = guild.get_role(roles.get('Staff'))
                if staff_role:
                    await channel.set_permissions(
                        guild.default_role,
                        view_channel=False,
                        read_messages=False
                    )
                    await channel.set_permissions(
                        staff_role,
                        view_channel=True,
                        read_messages=True,
                        send_messages=True
                    )

        logger.info("Permisos configurados")

    async def send_welcome_messages(self, guild, channels: dict):
        """Enviar mensajes de bienvenida"""
        # Mensaje en #reglas
        rules_channel_id = channels.get('reglas')
        if rules_channel_id:
            rules_channel = guild.get_channel(rules_channel_id)
            if rules_channel:
                embed = discord.Embed(
                    title="📋 Reglas del Servidor",
                    description="Por favor respeta las siguientes reglas",
                    color=0xff0000
                )

                embed.add_field(name="1. Respeto", value="Trata a todos con respeto y profesionalismo", inline=False)
                embed.add_field(name="2. Sin spam", value="No envíe spam o contenido irrelevante", inline=False)
                embed.add_field(name="3. Contenido apropiado", value="Mantenga el contenido profesional", inline=False)
                embed.add_field(name="4. Soporte", value="Use los canales designados para soporte", inline=False)
                embed.add_field(name="5. Fraude", value="El fraude resultará en baneo permanente", inline=False)
                embed.set_footer(text="El incumplimiento resultará en sanciones")

                await rules_channel.send(embed=embed)

        # Mensaje en #servicios
        services_channel_id = channels.get('servicios')
        if services_channel_id:
            services_channel = guild.get_channel(services_channel_id)
            if services_channel:
                embed = discord.Embed(
                    title="🛒 Servicios Disponibles",
                    description="Usa `!tienda` para ver nuestro catálogo de servicios profesionales",
                    color=0x00ff00
                )

                embed.add_field(name="Comandos", value="`!tienda` - Ver catálogo\n`!comprar <id>` - Comprar servicio\n`!mispedidos` - Ver mis pedidos", inline=False)
                embed.add_field(name="Web", value="Visita https://thedulcandesign.com", inline=False)
                embed.set_footer(text="TheDulcanDesign - Servicios Profesionales")

                await services_channel.send(embed=embed)

        logger.info("Mensajes de bienvenida enviados")

async def setup(bot):
    await bot.add_cog(SetupServer(bot))
