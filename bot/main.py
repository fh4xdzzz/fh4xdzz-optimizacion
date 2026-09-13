import os
import sys
import discord
from discord.ext import commands
from dotenv import load_dotenv
from flask import Flask, request, jsonify
import threading
import logging
from datetime import datetime, timedelta
import requests
import json
import asyncio
import random
from collections import defaultdict

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Check for required environment variables
TOKEN = os.getenv('DISCORD_BOT_TOKEN')
GUILD_ID = os.getenv('DISCORD_GUILD_ID')
WEBHOOK_URL = os.getenv('WEBHOOK_URL')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

if not TOKEN:
    logger.error("ERROR: DISCORD_BOT_TOKEN not found in environment variables")
    sys.exit(1)

# Flask app for webhooks
app = Flask(__name__)

# Bot configuration
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True
intents.voice_states = True
intents.presences = True

bot = commands.Bot(
    command_prefix=commands.when_mentioned_or('!'),
    intents=intents,
    description="TheDulcanDesign - Sistema Profesional de Servicios e Integración Web"
)

# Import event processor
from event_processor import EventProcessor
event_processor = None

# Import cogs
from cogs.setup_server import SetupServer
from cogs.events import Events
from cogs.role_sync import RoleSync

# Storage (en produccion usar Supabase)
tickets = {}
ticket_counter = 0
orders = {}
order_counter = 0
user_levels = defaultdict(dict)
user_stats = defaultdict(dict)
referrals = defaultdict(list)
voice_sessions = {}

# Roles configuration
ROLES = {
    'member': {'name': 'Cliente', 'color': 0x3498db, 'permissions': None},
    'premium': {'name': 'Premium', 'color': 0xf1c40f, 'permissions': None},
    'staff': {'name': 'Staff', 'color': 0x9b59b6, 'permissions': discord.Permissions.all()},
    'admin': {'name': 'Admin', 'color': 0xe74c3c, 'permissions': discord.Permissions.all()}
}

# Services from web integration
SERVICES = [
    {"id": 1, "name": "Optimizacion de OBS", "price": 29.99, "category": "obs", "description": "Configuracion profesional de OBS Studio"},
    {"id": 2, "name": "Configuracion de Streaming", "price": 49.99, "category": "streaming", "description": "Setup completo para Twitch, YouTube u otras plataformas"},
    {"id": 3, "name": "Optimizacion de PC/Windows", "price": 39.99, "category": "pc_windows", "description": "Mejora del rendimiento del sistema"},
    {"id": 4, "name": "Configuracion Gaming", "price": 24.99, "category": "gaming", "description": "Optimizacion especifica para tus juegos favoritos"},
    {"id": 5, "name": "Diseno de Overlays y Alertas", "price": 59.99, "category": "design", "description": "Elementos visuales personalizados para tu stream"},
    {"id": 6, "name": "Soporte Tecnico", "price": 19.99, "category": "support", "description": "Resolucion de problemas tecnicos"},
    {"id": 7, "name": "Servicios Personalizados", "price": 99.99, "category": "custom", "description": "Soluciones a medida segun tus necesidades"}
]

# Level system
LEVELS = {
    1: 0,
    2: 100,
    3: 300,
    4: 600,
    5: 1000,
    6: 1500,
    7: 2100,
    8: 2800,
    9: 3600,
    10: 4500
}

@app.route('/webhook', methods=['POST'])
def webhook():
    """Webhook endpoint para recibir eventos de la web"""
    try:
        data = request.json
        logger.info(f"Webhook recibido: {data}")

        # Validar token secreto
        webhook_secret = os.getenv('DISCORD_WEBHOOK_SECRET')
        auth_header = request.headers.get('Authorization')

        if not webhook_secret or not auth_header or not auth_header.startswith('Bearer '):
            logger.error("Webhook sin autenticación válida")
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        token = auth_header[7:]  # Remove 'Bearer '
        if token != webhook_secret:
            logger.error("Token webhook inválido")
            return jsonify({'success': False, 'message': 'Forbidden'}), 403

        # Procesar evento con EventProcessor
        if event_processor:
            # Ejecutar en loop del bot
            asyncio.run_coroutine_threadsafe(
                event_processor.process_event(data),
                bot.loop
            )
            return jsonify({'success': True, 'message': 'Evento procesado'}), 200
        else:
            logger.error("EventProcessor no inicializado")
            return jsonify({'success': False, 'message': 'EventProcessor no disponible'}), 500

    except Exception as e:
        logger.error(f"Error en webhook: {e}")
        return jsonify({'success': False, 'message': 'Error interno'}), 500

async def create_order_from_web(order_data):
    """Crear pedido en Discord desde pedido web"""
    global order_counter
    order_counter += 1
    order_id = f"WEB-{order_counter:04d}"

    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild:
            logger.error("Guild no encontrada")
            return

        orders_channel = discord.utils.get(guild.text_channels, name="pedidos")
        if not orders_channel:
            logger.error("Canal de pedidos no encontrado")
            return

        orders[order_id] = {
            'id': order_id,
            'order_id': order_data.get('order_id'),
            'order_number': order_data.get('order_number'),
            'user_email': order_data.get('user_email'),
            'service': order_data.get('service_name'),
            'description': order_data.get('description'),
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'source': 'web'
        }

        embed = discord.Embed(
            title=f"Nuevo Pedido Web: {order_id}",
            description=f"Pedido: {order_data.get('order_number')}",
            color=0x00ff00
        )

        embed.add_field(name="Servicio", value=order_data.get('service_name'), inline=False)
        embed.add_field(name="Email", value=order_data.get('user_email'), inline=False)
        embed.add_field(name="Descripcion", value=order_data.get('description'), inline=False)
        embed.add_field(name="Estado", value="Pendiente", inline=False)
        embed.add_field(name="Origen", value="Web", inline=False)
        embed.set_footer(text="TheDulcanDesign - Tienda Profesional")

        await orders_channel.send(embed=embed)

        logger.info(f"Pedido {order_id} creado desde web")

    except Exception as e:
        logger.error(f"Error creando pedido desde web: {e}")

@bot.event
async def on_ready():
    logger.info(f'Bot logged in as {bot.user.name} (ID: {bot.user.id})')
    logger.info(f'Connected to {len(bot.guilds)} guilds')
    logger.info('------')

    # Inicializar EventProcessor
    global event_processor
    event_processor = EventProcessor(bot)
    logger.info('EventProcessor inicializado')

    # Cargar cogs
    await bot.add_cog(SetupServer(bot))
    await bot.add_cog(Events(bot))
    await bot.add_cog(RoleSync(bot))
    logger.info('Cogs cargados')

    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching,
            name="servicios profesionales e integración web"
        ),
        status=discord.Status.online
    )

    await setup_professional_server()

async def setup_professional_server():
    """Setup del servidor profesional"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild:
            return

        # Eliminar categorías viejas no profesionales
        old_categories = ['Mejoras del servidor', 'Voz', 'General']
        for cat in guild.categories:
            if cat.name in old_categories:
                # Eliminar canales dentro de la categoría
                for channel in cat.channels:
                    await channel.delete()
                # Eliminar la categoría
                await cat.delete()
                logger.info(f"Categoría vieja eliminada: {cat.name}")

        # Eliminar canales viejos si existen
        old_channels = ['general', 'Gaming', 'Música']
        for channel in guild.text_channels:
            if channel.name in old_channels:
                await channel.delete()
                logger.info(f"Canal viejo eliminado: {channel.name}")

        for channel in guild.voice_channels:
            if channel.name in old_channels:
                await channel.delete()
                logger.info(f"Canal de voz viejo eliminado: {channel.name}")

        # Create categories profesionales
        categories = {
            'Tienda': 'Tienda de servicios',
            'Tickets': 'Sistema de soporte',
            'Anuncios': 'Anuncios importantes',
            'Soporte Voz': 'Canales de voz profesional',
            'Reglas': 'Reglas del servidor',
            'Bienvenida': 'Canales de bienvenida',
            'Logs': 'Logs del servidor'
        }

        for cat_name, cat_desc in categories.items():
            if not discord.utils.get(guild.categories, name=cat_name):
                await guild.create_category(cat_name)

        # Get categories
        shop_cat = discord.utils.get(guild.categories, name="Tienda")
        ticket_cat = discord.utils.get(guild.categories, name="Tickets")
        announce_cat = discord.utils.get(guild.categories, name="Anuncios")
        voice_cat = discord.utils.get(guild.categories, name="Soporte Voz")
        rules_cat = discord.utils.get(guild.categories, name="Reglas")
        welcome_cat = discord.utils.get(guild.categories, name="Bienvenida")
        logs_cat = discord.utils.get(guild.categories, name="Logs")

        # Create text channels profesionales
        channels_to_create = [
            ('informacion-tienda', shop_cat),
            ('pedidos', shop_cat),
            ('anuncios', announce_cat),
            ('reglas', rules_cat),
            ('bienvenida', welcome_cat),
            ('proyectos', None),
            ('logs-entradas', logs_cat),
            ('logs-salidas', logs_cat),
            ('logs-comandos', logs_cat),
            ('logs-voice', logs_cat)
        ]

        for channel_name, category in channels_to_create:
            if not discord.utils.get(guild.text_channels, name=channel_name):
                if category == logs_cat:
                    overwrites = {
                        guild.default_role: discord.PermissionOverwrite(view_channel=False, read_messages=False),
                        guild.me: discord.PermissionOverwrite(view_channel=True, read_messages=True)
                    }
                    await category.create_text_channel(channel_name, overwrites=overwrites)
                else:
                    await (category or guild).create_text_channel(channel_name)

        # Create voice channels profesionales
        voice_channels = [
            ('Soporte-Cliente', voice_cat),
            ('Soporte-Tecnico', voice_cat)
        ]

        for voice_name, category in voice_channels:
            if not discord.utils.get(guild.voice_channels, name=voice_name):
                await category.create_voice_channel(voice_name)

        # Create roles profesionales
        for role_key, role_config in ROLES.items():
            if not discord.utils.get(guild.roles, name=role_config['name']):
                await guild.create_role(
                    name=role_config['name'],
                    color=role_config['color'],
                    permissions=role_config['permissions'] or discord.Permissions.none()
                )

        # Send welcome message
        welcome_channel = discord.utils.get(guild.text_channels, name="bienvenida")
        if welcome_channel:
            welcome_embed = discord.Embed(
                title="Bienvenido a TheDulcanDesign",
                description="Gracias por unirte a nuestros servicios profesionales",
                color=0x00ff00
            )

            welcome_embed.add_field(name="Tienda", value="Usa `!tienda` para ver nuestros servicios", inline=False)
            welcome_embed.add_field(name="Soporte", value="Usa `!ticket` para crear un ticket de soporte", inline=False)
            welcome_embed.add_field(name="Reglas", value="Lee las reglas en #reglas", inline=False)
            welcome_embed.add_field(name="Web", value="Visita https://thedulcandesign.com", inline=False)
            welcome_embed.set_footer(text="TheDulcanDesign - Servicios Profesionales")

            await welcome_channel.send(embed=welcome_embed)

        # Send rules
        rules_channel = discord.utils.get(guild.text_channels, name="reglas")
        if rules_channel:
            rules_embed = discord.Embed(
                title="Reglas del Servidor",
                description="Por favor respeta las siguientes reglas",
                color=0xff0000
            )

            rules_embed.add_field(name="1. Respeto", value="Trata a todos con respeto y profesionalismo", inline=False)
            rules_embed.add_field(name="2. Sin spam", value="No envie spam o contenido irrelevante", inline=False)
            rules_embed.add_field(name="3. Contenido apropiado", value="Mantenga el contenido profesional", inline=False)
            rules_embed.add_field(name="4. Soporte", value="Use los canales designados para soporte", inline=False)
            rules_embed.add_field(name="5. Fraude", value="El fraude resultara en baneo permanente", inline=False)
            rules_embed.set_footer(text="El incumplimiento resultara en sanciones")

            await rules_channel.send(embed=rules_embed)

        logger.info("Servidor profesional configurado")
    except Exception as e:
        logger.error(f"Error configurando servidor: {e}")

@bot.event
async def on_member_join(member):
    """Handle new member join"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild or member.guild != guild:
            return

        member_role = discord.utils.get(guild.roles, name=ROLES['member']['name'])
        if member_role:
            await member.add_roles(member_role)

        logs_cat = discord.utils.get(guild.categories, name="Logs")
        if logs_cat:
            log_channel = discord.utils.get(guild.text_channels, name="logs-entradas")
            if log_channel:
                embed = discord.Embed(
                    title="Nuevo Cliente",
                    description=f"{member.mention} se ha unido",
                    color=0x00ff00
                )
                embed.add_field(name="Usuario", value=f"{member.name}#{member.discriminator}", inline=False)
                embed.add_field(name="ID", value=member.id, inline=False)
                embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                await log_channel.send(embed=embed)

        welcome_channel = discord.utils.get(guild.text_channels, name="bienvenida")
        if welcome_channel:
            await welcome_channel.send(f"Bienvenido {member.mention}! Lee las reglas en #reglas y usa `!tienda` para ver nuestros servicios.")

        logger.info(f"{member.name} joined the server")
    except Exception as e:
        logger.error(f"Error handling member join: {e}")

@bot.event
async def on_member_remove(member):
    """Handle member leave"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild or member.guild != guild:
            return

        logs_cat = discord.utils.get(guild.categories, name="Logs")
        if logs_cat:
            log_channel = discord.utils.get(guild.text_channels, name="logs-salidas")
            if log_channel:
                embed = discord.Embed(
                    title="Cliente Salió",
                    description=f"{member.name}#{member.discriminator} ha salido",
                    color=0xff0000
                )
                embed.add_field(name="Usuario", value=f"{member.name}#{member.discriminator}", inline=False)
                embed.add_field(name="ID", value=member.id, inline=False)
                embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                await log_channel.send(embed=embed)

        logger.info(f"{member.name} left the server")
    except Exception as e:
        logger.error(f"Error handling member leave: {e}")

@bot.event
async def on_message(message):
    """Handle messages"""
    if message.author.bot:
        return

    user_id = str(message.author.id)
    user_stats[user_id]['messages'] = user_stats[user_id].get('messages', 0) + 1

    xp_gain = 5
    user_levels[user_id]['xp'] = user_levels[user_id].get('xp', 0) + xp_gain

    current_level = user_levels[user_id].get('level', 1)
    for level, required_xp in sorted(LEVELS.items()):
        if user_levels[user_id]['xp'] >= required_xp and level > current_level:
            user_levels[user_id]['level'] = level
            await message.channel.send(f"{message.author.mention} ha subido al nivel {level}!")

    if message.content.startswith('!'):
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if guild and message.guild == guild:
            logs_cat = discord.utils.get(guild.categories, name="Logs")
            if logs_cat:
                log_channel = discord.utils.get(guild.text_channels, name="logs-comandos")
                if log_channel:
                    embed = discord.Embed(
                        title="Comando Usado",
                        color=0x00ff00
                    )
                    embed.add_field(name="Usuario", value=message.author.mention, inline=False)
                    embed.add_field(name="Comando", value=message.content, inline=False)
                    embed.add_field(name="Canal", value=message.channel.mention, inline=False)
                    embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                    await log_channel.send(embed=embed)

    await bot.process_commands(message)

@bot.event
async def on_voice_state_update(member, before, after):
    """Handle voice state changes"""
    if member.bot:
        return

    guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
    if not guild or (member.guild != guild if member.guild else True):
        return

    if after.channel and not before.channel:
        voice_sessions[str(member.id)] = {
            'channel_id': after.channel.id,
            'start_time': datetime.now()
        }

    elif not after.channel and before.channel:
        if str(member.id) in voice_sessions:
            session = voice_sessions[str(member.id)]
            duration = (datetime.now() - session['start_time']).total_seconds() / 60

            user_stats[str(member.id)]['voice_time'] = user_stats[str(member.id)].get('voice_time', 0) + duration

            logs_cat = discord.utils.get(guild.categories, name="Logs")
            if logs_cat:
                log_channel = discord.utils.get(guild.text_channels, name="logs-voice")
                if log_channel:
                    embed = discord.Embed(
                        title="Actividad de Voz",
                        color=0x00ff00
                    )
                    embed.add_field(name="Usuario", value=member.mention, inline=False)
                    embed.add_field(name="Canal", value=f"<#{session['channel_id']}>", inline=False)
                    embed.add_field(name="Duracion", value=f"{duration:.1f} minutos", inline=False)
                    embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                    await log_channel.send(embed=embed)

            del voice_sessions[str(member.id)]

@bot.command(name='tienda')
async def show_shop(ctx):
    """Mostrar catalogo de servicios"""
    embed = discord.Embed(
        title="TheDulcanDesign - Catalogo de Servicios",
        description="Usa `!comprar <id>` para comprar un servicio",
        color=0x00ff00
    )

    for service in SERVICES:
        embed.add_field(
            name=f"{service['id']}. {service['name']} - ${service['price']}",
            value=service['description'],
            inline=False
        )

    embed.add_field(name="Web", value="Visita https://thedulcandesign.com para mas informacion", inline=False)
    embed.set_footer(text="TheDulcanDesign - Servicios Profesionales")

    await ctx.send(embed=embed)

@bot.command(name='comprar')
async def buy_service(ctx, service_id: int):
    """Comprar servicio"""
    service = next((s for s in SERVICES if s['id'] == service_id), None)

    if not service:
        await ctx.send("Servicio no encontrado. Usa `!tienda` para ver el catalogo.")
        return

    global order_counter
    order_counter += 1
    order_id = f"DIS-{order_counter:04d}"

    try:
        orders_channel = discord.utils.get(ctx.guild.text_channels, name="pedidos")
        if not orders_channel:
            await ctx.send("Canal de pedidos no configurado.")
            return

        orders[order_id] = {
            'id': order_id,
            'user_id': str(ctx.author.id),
            'username': str(ctx.author),
            'service_id': service['id'],
            'service_name': service['name'],
            'price': service['price'],
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'source': 'discord'
        }

        embed = discord.Embed(
            title=f"Nuevo Pedido Discord: {order_id}",
            description=f"Pedido por {ctx.author.mention}",
            color=0x00ff00
        )

        embed.add_field(name="Servicio", value=service['name'], inline=False)
        embed.add_field(name="Precio", value=f"${service['price']}", inline=False)
        embed.add_field(name="Estado", value="Pendiente", inline=False)
        embed.add_field(name="Origen", value="Discord", inline=False)
        embed.set_footer(text="TheDulcanDesign - Tienda Profesional")

        await orders_channel.send(embed=embed)

        success_embed = discord.Embed(
            title="Pedido Creado",
            description=f"Tu pedido ha sido creado: {order_id}\nServicio: {service['name']}\nPrecio: ${service['price']}",
            color=0x00ff00
        )

        await ctx.send(embed=success_embed)
        logger.info(f"Pedido {order_id} creado por {ctx.author} en Discord")

    except Exception as e:
        logger.error(f"Error creando pedido: {e}")
        await ctx.send("Error al crear pedido")

@bot.command(name='mispedidos')
async def my_orders(ctx):
    """Ver mis pedidos"""
    user_orders = [o for o in orders.values() if o.get('user_id') == str(ctx.author.id)]

    if not user_orders:
        await ctx.send("No tienes pedidos registrados.")
        return

    embed = discord.Embed(
        title="Mis Pedidos",
        description=f"Total: {len(user_orders)} pedidos",
        color=0x00ff00
    )

    for order in user_orders:
        status_emoji = "Pendiente" if order['status'] == 'pending' else "Completado" if order['status'] == 'completed' else "Cancelado"
        embed.add_field(
            name=f"{order['id']} - {order['service_name']}",
            value=f"Precio: ${order['price']}\nEstado: {status_emoji}\nOrigen: {order['source']}",
            inline=False
        )

    embed.set_footer(text="TheDulcanDesign - Tienda Profesional")
    await ctx.send(embed=embed)

@bot.command(name='ticket')
async def create_ticket(ctx, *, description: str):
    """Crear ticket"""
    global ticket_counter
    ticket_counter += 1
    ticket_id = f"MAN-{ticket_counter:04d}"

    try:
        category = discord.utils.get(ctx.guild.categories, name="Tickets")
        if not category:
            category = await ctx.guild.create_category("Tickets")

        overwrites = {
            ctx.guild.default_role: discord.PermissionOverwrite(view_channel=False),
            ctx.author: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True),
            ctx.guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, manage_channels=True)
        }

        channel = await category.create_text_channel(
            name=f"ticket-{ticket_id}",
            overwrites=overwrites
        )

        tickets[ticket_id] = {
            'id': ticket_id,
            'user_id': str(ctx.author.id),
            'username': str(ctx.author),
            'description': description,
            'channel_id': str(channel.id),
            'status': 'open',
            'created_at': datetime.now().isoformat()
        }

        embed = discord.Embed(
            title=f"Ticket: {ticket_id}",
            description=f"Usuario: {ctx.author.mention}",
            color=0x00ff00
        )

        embed.add_field(name="Descripcion", value=description, inline=False)
        embed.add_field(name="Estado", value="Abierto", inline=False)
        embed.set_footer(text="TheDulcanDesign - Sistema de Tickets")

        await channel.send(content=ctx.author.mention, embed=embed)

        await ctx.send(f"Ticket creado: {channel.mention}")
        logger.info(f"Ticket {ticket_id} creado por {ctx.author}")

    except Exception as e:
        logger.error(f"Error creando ticket: {e}")
        await ctx.send("Error al crear ticket")

@bot.command(name='cerrar')
async def close_ticket(ctx):
    """Cerrar ticket"""
    channel_name = ctx.channel.name

    if not channel_name.startswith('ticket-'):
        await ctx.send("Este comando solo funciona en canales de tickets")
        return

    ticket_id = None
    for tid, tdata in tickets.items():
        if tdata['channel_id'] == str(ctx.channel.id) and tdata['status'] == 'open':
            ticket_id = tid
            break

    if not ticket_id:
        await ctx.send("No se encontro ticket abierto")
        return

    tickets[ticket_id]['status'] = 'closed'
    tickets[ticket_id]['closed_at'] = datetime.now().isoformat()

    await ctx.channel.edit(name=f"cerrado-{channel_name.replace('ticket-', '')}")

    await ctx.channel.set_permissions(ctx.guild.default_role, view_channel=False)

    embed = discord.Embed(
        title="Ticket Cerrado",
        description=f"Cerrado por {ctx.author.mention}",
        color=0xff0000
    )

    embed.add_field(name="Estado", value="Cerrado", inline=False)
    embed.set_footer(text="TheDulcanDesign - Sistema de Tickets")

    await ctx.send(embed=embed)
    logger.info(f"Ticket {ticket_id} cerrado por {ctx.author}")

@bot.command(name='tickets')
async def list_tickets(ctx):
    """Listar tickets abiertos"""
    open_tickets = [t for t in tickets.values() if t['status'] == 'open']

    if not open_tickets:
        await ctx.send("No hay tickets abiertos")
        return

    embed = discord.Embed(
        title="Tickets Abiertos",
        description=f"Total: {len(open_tickets)}",
        color=0x00ff00
    )

    for ticket in open_tickets:
        embed.add_field(
            name=ticket['id'],
            value=f"Estado: Abierto\n{ticket.get('service', 'Manual')}",
            inline=False
        )

    await ctx.send(embed=embed)

@bot.command(name='pedidos')
async def list_all_orders(ctx):
    """Listar todos los pedidos"""
    if not orders:
        await ctx.send("No hay pedidos registrados.")
        return

    embed = discord.Embed(
        title="Todos los Pedidos",
        description=f"Total: {len(orders)} pedidos",
        color=0x00ff00
    )

    for order_id, order in orders.items():
        status_emoji = "Pendiente" if order['status'] == 'pending' else "Completado" if order['status'] == 'completed' else "Cancelado"
        embed.add_field(
            name=f"{order_id} - {order['service_name']}",
            value=f"Usuario: {order.get('username', order.get('user_email', 'N/A'))}\nPrecio: ${order['price']}\nEstado: {status_emoji}\nOrigen: {order['source']}",
            inline=False
        )

    embed.set_footer(text="TheDulcanDesign - Tienda Profesional")
    await ctx.send(embed=embed)

@bot.command(name='estado')
async def update_order_status(ctx, order_id: str, new_status: str):
    """Actualizar estado de pedido"""
    if order_id not in orders:
        await ctx.send("Pedido no encontrado.")
        return

    valid_statuses = ['pending', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        await ctx.send(f"Estado invalido. Estados validos: {', '.join(valid_statuses)}")
        return

    orders[order_id]['status'] = new_status
    orders[order_id]['updated_at'] = datetime.now().isoformat()

    embed = discord.Embed(
        title="Estado Actualizado",
        description=f"Pedido {order_id} actualizado a {new_status}",
        color=0x00ff00
    )

    await ctx.send(embed=embed)
    logger.info(f"Pedido {order_id} actualizado a {new_status} por {ctx.author}")

@bot.command(name='ayuda')
async def help_command(ctx):
    """Mostrar ayuda"""
    embed = discord.Embed(
        title="Comandos Disponibles",
        description="Lista de comandos del bot",
        color=0x00ff00
    )

    embed.add_field(name="Tienda", value="`!tienda` - Ver catalogo\n`!comprar <id>` - Comprar servicio\n`!mispedidos` - Ver mis pedidos\n`!pedidos` - Ver todos los pedidos", inline=False)
    embed.add_field(name="Soporte", value="`!ticket <desc>` - Crear ticket\n`!cerrar` - Cerrar ticket\n`!tickets` - Listar tickets", inline=False)
    embed.add_field(name="Admin", value="`!estado <id> <estado>` - Actualizar pedido\n`!limpiar [cantidad]` - Limpiar canal", inline=False)
    embed.add_field(name="Info", value="`!ayuda` - Mostrar este mensaje\n`!servidor` - Info del servidor", inline=False)

    embed.set_footer(text="TheDulcanDesign - Servicios Profesionales")
    await ctx.send(embed=embed)

@bot.command(name='servidor')
async def server_info(ctx):
    """Mostrar informacion del servidor"""
    guild = ctx.guild

    embed = discord.Embed(
        title=f"{guild.name}",
        description="Informacion del servidor",
        color=0x00ff00
    )

    embed.add_field(name="Miembros", value=guild.member_count, inline=True)
    embed.add_field(name="Creado", value=guild.created_at.strftime('%Y-%m-%d'), inline=True)
    embed.add_field(name="Roles", value=len(guild.roles), inline=True)
    embed.add_field(name="Canales texto", value=len(guild.text_channels), inline=True)
    embed.add_field(name="Canales voz", value=len(guild.voice_channels), inline=True)
    embed.add_field(name="Dueño", value=guild.owner.mention, inline=True)

    embed.set_thumbnail(url=guild.icon.url if guild.icon else None)
    embed.set_footer(text="TheDulcanDesign - Info del Servidor")

    await ctx.send(embed=embed)

@bot.command(name='limpiar')
async def clear_channel(ctx, amount: int = 10):
    """Limpiar mensajes del canal"""
    if amount < 1 or amount > 100:
        await ctx.send("La cantidad debe estar entre 1 y 100.")
        return

    await ctx.channel.purge(limit=amount + 1)
    logger.info(f"{ctx.author} cleared {amount} messages in {ctx.channel.name}")

@bot.command(name='anuncio')
async def make_announcement(ctx, *, message: str):
    """Hacer anuncio en canal #anuncios"""
    guild = ctx.guild
    announce_channel = discord.utils.get(guild.text_channels, name="anuncios")

    if not announce_channel:
        await ctx.send("Canal de anuncios no encontrado.")
        return

    embed = discord.Embed(
        title="Anuncio Oficial",
        description=message,
        color=0x00ff00
    )
    embed.add_field(name="Publicado por", value=ctx.author.mention, inline=False)
    embed.set_footer(text="TheDulcanDesign - Anuncios")
    embed.set_thumbnail(url=ctx.guild.icon.url if ctx.guild.icon else None)

    await announce_channel.send(embed=embed)
    await ctx.send("Anuncio publicado en #anuncios")
    logger.info(f"Announcement made by {ctx.author}")

@bot.command(name='ping')
async def ping(ctx):
    """Mostrar latencia del bot"""
    latency = round(bot.latency * 1000)

    embed = discord.Embed(
        title="Pong!",
        description=f"Latencia: {latency}ms",
        color=0x00ff00
    )
    embed.set_footer(text="TheDulcanDesign - Servicios Profesionales")

    await ctx.send(embed=embed)

def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False)

if __name__ == '__main__':
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    logger.info("Flask webhook server iniciado en puerto 5000")

    try:
        bot.run(TOKEN)
    except KeyboardInterrupt:
        logger.info("Bot detenido por usuario")
    except Exception as e:
        logger.error(f"Error fatal: {e}")
