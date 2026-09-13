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
    description="TheDulcanDesign - Sistema Completo"
)

# Storage (en producción usar Supabase)
tickets = {}
ticket_counter = 0
orders = {}
order_counter = 0
user_levels = defaultdict(dict)  # {user_id: {xp: 0, level: 1}}
user_stats = defaultdict(dict)   # {user_id: {messages: 0, voice_time: 0}}
referrals = defaultdict(list)    # {user_id: [referred_users]}
voice_sessions = {}              # {user_id: {channel_id, start_time}}

# Roles configuration
ROLES = {
    'member': {'name': '👤 Miembro', 'color': 0x95a5a6, 'permissions': None},
    'client': {'name': '🛒 Cliente', 'color': 0x3498db, 'permissions': None},
    'premium': {'name': '⭐ Premium', 'color': 0xf1c40f, 'permissions': None},
    'vip': {'name': '👑 VIP', 'color': 0xe74c3c, 'permissions': None},
    'staff': {'name': '🛡️ Staff', 'color': 0x9b59b6, 'permissions': discord.Permissions.all()},
    'admin': {'name': '🔧 Admin', 'color': 0xe74c3c, 'permissions': discord.Permissions.all()}
}

# Services from web integration
SERVICES = [
    {"id": 1, "name": "Optimización de OBS", "price": 29.99, "category": "obs", "description": "Configuración profesional de OBS Studio"},
    {"id": 2, "name": "Configuración de Streaming", "price": 49.99, "category": "streaming", "description": "Setup completo para Twitch, YouTube u otras plataformas"},
    {"id": 3, "name": "Optimización de PC/Windows", "price": 39.99, "category": "pc_windows", "description": "Mejora del rendimiento del sistema"},
    {"id": 4, "name": "Configuración Gaming", "price": 24.99, "category": "gaming", "description": "Optimización específica para tus juegos favoritos"},
    {"id": 5, "name": "Diseño de Overlays y Alertas", "price": 59.99, "category": "design", "description": "Elementos visuales personalizados para tu stream"},
    {"id": 6, "name": "Soporte Técnico", "price": 19.99, "category": "support", "description": "Resolución de problemas técnicos"},
    {"id": 7, "name": "Servicios Personalizados", "price": 99.99, "category": "custom", "description": "Soluciones a medida según tus necesidades"}
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
        logger.info(f"📥 Webhook recibido: {data}")

        if data.get('type') == 'order_created':
            # Crear pedido desde web
            order_data = data.get('data', {})
            create_order_from_web(order_data)
            return jsonify({'success': True, 'message': 'Pedido creado'}), 200

        return jsonify({'success': False, 'message': 'Tipo no soportado'}), 400
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

        # Buscar canal de pedidos
        orders_channel = discord.utils.get(guild.text_channels, name="pedidos")
        if not orders_channel:
            logger.error("Canal de pedidos no encontrado")
            return

        # Guardar pedido
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

        # Crear embed del pedido
        embed = discord.Embed(
            title=f"🛒 Nuevo Pedido Web: {order_id}",
            description=f"Pedido: {order_data.get('order_number')}",
            color=0x00ff00
        )

        embed.add_field(name="Servicio", value=order_data.get('service_name'), inline=False)
        embed.add_field(name="Email", value=order_data.get('user_email'), inline=False)
        embed.add_field(name="Descripción", value=order_data.get('description'), inline=False)
        embed.add_field(name="Estado", value="🟡 Pendiente", inline=False)
        embed.add_field(name="Origen", value="🌐 Web", inline=False)
        embed.set_footer(text="TheDulcanDesign - Tienda Profesional")

        await orders_channel.send(embed=embed)

        # Notificar al canal de staff
        staff_channel = discord.utils.get(guild.text_channels, name="staff-notifications")
        if staff_channel:
            await staff_channel.send(f"🛒 Nuevo pedido web: {order_id} - {order_data.get('service_name')}")

        logger.info(f"✅ Pedido {order_id} creado desde web")

    except Exception as e:
        logger.error(f"Error creando pedido desde web: {e}")

async def create_ticket_from_web(order_data):
    """Crear ticket en Discord desde pedido web"""
    global ticket_counter
    ticket_counter += 1
    ticket_id = f"ORD-{ticket_counter:04d}"

    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild:
            logger.error("Guild no encontrada")
            return

        # Buscar o crear categoría de tickets
        category = discord.utils.get(guild.categories, name="🎫 Tickets")
        if not category:
            category = await guild.create_category("🎫 Tickets")

        # Crear canal privado para el ticket
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, manage_channels=True)
        }

        channel = await category.create_text_channel(
            name=f"ticket-{ticket_id}",
            overwrites=overwrites
        )

        # Guardar ticket
        tickets[ticket_id] = {
            'id': ticket_id,
            'order_id': order_data.get('order_id'),
            'order_number': order_data.get('order_number'),
            'user_email': order_data.get('user_email'),
            'service': order_data.get('service_name'),
            'description': order_data.get('description'),
            'channel_id': str(channel.id),
            'status': 'open',
            'created_at': datetime.now().isoformat()
        }

        # Crear embed del ticket
        embed = discord.Embed(
            title=f"🎫 Nuevo Ticket: {ticket_id}",
            description=f"Pedido: {order_data.get('order_number')}",
            color=0x00ff00
        )

        embed.add_field(name="Servicio", value=order_data.get('service_name'), inline=False)
        embed.add_field(name="Email", value=order_data.get('user_email'), inline=False)
        embed.add_field(name="Descripción", value=order_data.get('description'), inline=False)
        embed.add_field(name="Estado", value="🟢 Abierto", inline=False)
        embed.set_footer(text="TheDulcanDesign - Sistema de Tickets")

        await channel.send(embed=embed)

        # Notificar al canal de staff
        staff_channel = discord.utils.get(guild.text_channels, name="staff-notifications")
        if staff_channel:
            await staff_channel.send(f"🎫 Nuevo ticket creado: {channel.mention}")

        logger.info(f"✅ Ticket {ticket_id} creado desde web")

    except Exception as e:
        logger.error(f"Error creando ticket desde web: {e}")

@bot.event
async def on_ready():
    logger.info(f'✅ Bot logged in as {bot.user.name} (ID: {bot.user.id})')
    logger.info(f'📊 Connected to {len(bot.guilds)} guilds')
    logger.info('------')

    # Set bot status
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching,
            name="tienda, tickets y comunidad"
        ),
        status=discord.Status.online
    )

    # Create complete server setup
    await setup_shop_channels()

@bot.event
async def on_member_join(member):
    """Handle new member join"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild or member.guild != guild:
            return

        # Give default role
        member_role = discord.utils.get(guild.roles, name=ROLES['member']['name'])
        if member_role:
            await member.add_roles(member_role)

        # Log join
        logs_cat = discord.utils.get(guild.categories, name="🔒 Logs")
        if logs_cat:
            log_channel = discord.utils.get(guild.text_channels, name="logs-entradas")
            if log_channel:
                embed = discord.Embed(
                    title="👋 Nuevo Miembro",
                    description=f"{member.mention} se ha unido al servidor",
                    color=0x00ff00
                )
                embed.add_field(name="Usuario", value=f"{member.name}#{member.discriminator}", inline=False)
                embed.add_field(name="ID", value=member.id, inline=False)
                embed.add_field(name="Cuenta creada", value=member.created_at.strftime('%Y-%m-%d'), inline=False)
                embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                await log_channel.send(embed=embed)

        # Welcome message
        welcome_channel = discord.utils.get(guild.text_channels, name="bienvenida")
        if welcome_channel:
            await welcome_channel.send(f"🎉 ¡Bienvenido {member.mention}! Lee las reglas en #reglas y usa `!tienda` para ver nuestros servicios.")

        logger.info(f"✅ {member.name} joined the server")
    except Exception as e:
        logger.error(f"Error handling member join: {e}")

@bot.event
async def on_member_remove(member):
    """Handle member leave"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild or member.guild != guild:
            return

        # Log leave
        logs_cat = discord.utils.get(guild.categories, name="🔒 Logs")
        if logs_cat:
            log_channel = discord.utils.get(guild.text_channels, name="logs-salidas")
            if log_channel:
                embed = discord.Embed(
                    title="👋 Miembro Salió",
                    description=f"{member.name}#{member.discriminator} ha salido del servidor",
                    color=0xff0000
                )
                embed.add_field(name="Usuario", value=f"{member.name}#{member.discriminator}", inline=False)
                embed.add_field(name="ID", value=member.id, inline=False)
                embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                await log_channel.send(embed=embed)

        logger.info(f"👋 {member.name} left the server")
    except Exception as e:
        logger.error(f"Error handling member leave: {e}")

@bot.event
async def on_message(message):
    """Handle messages"""
    if message.author.bot:
        return

    # Update user stats
    user_id = str(message.author.id)
    user_stats[user_id]['messages'] = user_stats[user_id].get('messages', 0) + 1

    # Add XP
    xp_gain = 5
    user_levels[user_id]['xp'] = user_levels[user_id].get('xp', 0) + xp_gain

    # Check level up
    current_level = user_levels[user_id].get('level', 1)
    for level, required_xp in sorted(LEVELS.items()):
        if user_levels[user_id]['xp'] >= required_xp and level > current_level:
            user_levels[user_id]['level'] = level
            await message.channel.send(f"🎉 {message.author.mention} ha subido al nivel {level}!")

    # Log command usage
    if message.content.startswith('!'):
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if guild and message.guild == guild:
            logs_cat = discord.utils.get(guild.categories, name="🔒 Logs")
            if logs_cat:
                log_channel = discord.utils.get(guild.text_channels, name="logs-comandos")
                if log_channel:
                    embed = discord.Embed(
                        title="⚡ Comando Usado",
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

    # Join voice channel
    if after.channel and not before.channel:
        voice_sessions[str(member.id)] = {
            'channel_id': after.channel.id,
            'start_time': datetime.now()
        }

    # Leave voice channel
    elif not after.channel and before.channel:
        if str(member.id) in voice_sessions:
            session = voice_sessions[str(member.id)]
            duration = (datetime.now() - session['start_time']).total_seconds() / 60  # minutes

            user_stats[str(member.id)]['voice_time'] = user_stats[str(member.id)].get('voice_time', 0) + duration

            # Log voice activity
            logs_cat = discord.utils.get(guild.categories, name="🔒 Logs")
            if logs_cat:
                log_channel = discord.utils.get(guild.text_channels, name="logs-voice")
                if log_channel:
                    embed = discord.Embed(
                        title="🎤 Actividad de Voz",
                        color=0x00ff00
                    )
                    embed.add_field(name="Usuario", value=member.mention, inline=False)
                    embed.add_field(name="Canal", value=f"<#{session['channel_id']}>", inline=False)
                    embed.add_field(name="Duración", value=f"{duration:.1f} minutos", inline=False)
                    embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                    await log_channel.send(embed=embed)

            del voice_sessions[str(member.id)]

async def setup_shop_channels():
    """Setup shop channels and categories"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild:
            return

        # Create categories
        categories = {
            '🛒 Tienda': 'Tienda de servicios',
            '🎫 Tickets': 'Sistema de soporte',
            '📢 Anuncios': 'Anuncios importantes',
            '🎮 Voz': 'Canales de voz',
            '📋 Reglas': 'Reglas del servidor',
            '👋 Bienvenida': 'Canales de bienvenida',
            '🔒 Logs': 'Logs del servidor'
        }

        for cat_name, cat_desc in categories.items():
            if not discord.utils.get(guild.categories, name=cat_name):
                await guild.create_category(cat_name)

        # Get categories
        shop_cat = discord.utils.get(guild.categories, name="🛒 Tienda")
        ticket_cat = discord.utils.get(guild.categories, name="🎫 Tickets")
        announce_cat = discord.utils.get(guild.categories, name="� Anuncios")
        voice_cat = discord.utils.get(guild.categories, name="🎮 Voz")
        rules_cat = discord.utils.get(guild.categories, name="📋 Reglas")
        welcome_cat = discord.utils.get(guild.categories, name="👋 Bienvenida")
        logs_cat = discord.utils.get(guild.categories, name="🔒 Logs")

        # Create text channels
        channels_to_create = [
            ('informacion-tienda', shop_cat, 'Información de la tienda'),
            ('pedidos', shop_cat, 'Registro de pedidos'),
            ('anuncios', announce_cat, 'Anuncios importantes'),
            ('reglas', rules_cat, 'Reglas del servidor'),
            ('bienvenida', welcome_cat, 'Bienvenida a nuevos miembros'),
            ('general', None, 'Chat general'),
            ('logs-entradas', logs_cat, 'Logs de entradas al servidor'),
            ('logs-salidas', logs_cat, 'Logs de salidas del servidor'),
            ('logs-comandos', logs_cat, 'Logs de comandos usados'),
            ('logs-voice', logs_cat, 'Logs de actividad de voz')
        ]

        for channel_name, category, description in channels_to_create:
            if not discord.utils.get(guild.text_channels, name=channel_name):
                overwrites = {}
                if category == logs_cat:
                    overwrites[guild.default_role] = discord.PermissionOverwrite(view_channel=False, read_messages=False)
                    overwrites[guild.me] = discord.PermissionOverwrite(view_channel=True, read_messages=True)

                await (category or guild).create_text_channel(
                    name=channel_name,
                    overwrites=overwrites if overwrites else None
                )

        # Create voice channels
        voice_channels = [
            ('General', voice_cat),
            ('Gaming', voice_cat),
            ('Soporte', voice_cat),
            ('Música', voice_cat)
        ]

        for voice_name, category in voice_channels:
            if not discord.utils.get(guild.voice_channels, name=voice_name):
                await category.create_voice_channel(voice_name)

        # Create roles
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
                title="� Bienvenido a TheDulcanDesign",
                description="¡Gracias por unirte a nuestra comunidad!",
                color=0x00ff00
            )

            welcome_embed.add_field(name="🛒 Tienda", value="Usa `!tienda` para ver nuestros servicios", inline=False)
            welcome_embed.add_field(name="🎫 Soporte", value="Usa `!ticket` para crear un ticket de soporte", inline=False)
            welcome_embed.add_field(name="📋 Reglas", value="Lee las reglas en #reglas", inline=False)
            welcome_embed.add_field(name="🌐 Web", value="Visita https://thedulcandesign.com", inline=False)
            welcome_embed.set_footer(text="TheDulcanDesign - Comunidad Profesional")

            await welcome_channel.send(embed=welcome_embed)

        # Send rules
        rules_channel = discord.utils.get(guild.text_channels, name="reglas")
        if rules_channel:
            rules_embed = discord.Embed(
                title="📋 Reglas del Servidor",
                description="Por favor respeta las siguientes reglas",
                color=0xff0000
            )

            rules_embed.add_field(name="1. Respeto", value="Trata a todos con respeto y amabilidad", inline=False)
            rules_embed.add_field(name="2. Sin spam", value="No envíes spam o contenido irrelevante", inline=False)
            rules_embed.add_field(name="3. Contenido apropiado", value="Mantén el contenido apropiado para todos", inline=False)
            rules_embed.add_field(name="4. Soporte", value="Usa los canales designados para soporte", inline=False)
            rules_embed.add_field(name="5. Fraude", value="El fraude o estafa resultará en baneo permanente", inline=False)
            rules_embed.set_footer(text="El incumplimiento de estas reglas puede resultar en sanciones")

            await rules_channel.send(embed=rules_embed)

        logger.info("✅ Complete server setup created")
    except Exception as e:
        logger.error(f"Error setting up server: {e}")

async def log_action(self, action_type, user, channel, details=None):
    """Log server actions"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild:
            return

        logs_cat = discord.utils.get(guild.categories, name="🔒 Logs")
        if not logs_cat:
            return

        log_channel_name = None
        if action_type == 'join':
            log_channel_name = 'logs-entradas'
        elif action_type == 'leave':
            log_channel_name = 'logs-salidas'
        elif action_type == 'command':
            log_channel_name = 'logs-comandos'
        elif action_type == 'voice':
            log_channel_name = 'logs-voice'

        log_channel = discord.utils.get(guild.text_channels, name=log_channel_name)
        if not log_channel:
            return

        embed = discord.Embed(
            title=f"📋 {action_type.capitalize()} Log",
            color=0x00ff00 if action_type in ['join', 'command'] else 0xff0000
        )

        embed.add_field(name="Usuario", value=f"{user.mention} ({user.name})", inline=False)
        embed.add_field(name="Canal", value=channel.mention if channel else "N/A", inline=False)
        if details:
            embed.add_field(name="Detalles", value=details, inline=False)
        embed.set_footer(text=f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        await log_channel.send(embed=embed)
    except Exception as e:
        logger.error(f"Error logging action: {e}")

@bot.command(name='tienda')
async def show_shop(ctx):
    """Mostrar catálogo de servicios: !tienda"""
    embed = discord.Embed(
        title="🛒 TheDulcanDesign - Catálogo de Servicios",
        description="Usa `!comprar <id>` para comprar un servicio",
        color=0x00ff00
    )

    for service in SERVICES:
        embed.add_field(
            name=f"{service['id']}. {service['name']} - ${service['price']}",
            value=service['description'],
            inline=False
        )

    embed.add_field(name="💡", value="Visita nuestra web para más información: https://thedulcandesign.com", inline=False)
    embed.set_footer(text="TheDulcanDesign - Tienda Profesional")

    await ctx.send(embed=embed)

@bot.command(name='comprar')
async def buy_service(ctx, service_id: int):
    """Comprar servicio: !comprar <id>"""
    service = next((s for s in SERVICES if s['id'] == service_id), None)

    if not service:
        await ctx.send("❌ Servicio no encontrado. Usa `!tienda` para ver el catálogo.")
        return

    global order_counter
    order_counter += 1
    order_id = f"DIS-{order_counter:04d}"

    try:
        # Buscar canal de pedidos
        orders_channel = discord.utils.get(ctx.guild.text_channels, name="pedidos")
        if not orders_channel:
            await ctx.send("❌ Canal de pedidos no configurado.")
            return

        # Guardar pedido
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

        # Crear embed del pedido
        embed = discord.Embed(
            title=f"🛒 Nuevo Pedido Discord: {order_id}",
            description=f"Pedido por {ctx.author.mention}",
            color=0x00ff00
        )

        embed.add_field(name="Servicio", value=service['name'], inline=False)
        embed.add_field(name="Precio", value=f"${service['price']}", inline=False)
        embed.add_field(name="Estado", value="🟡 Pendiente", inline=False)
        embed.add_field(name="Origen", value="💬 Discord", inline=False)
        embed.set_footer(text="TheDulcanDesign - Tienda Profesional")

        await orders_channel.send(embed=embed)

        # Confirmación al usuario
        success_embed = discord.Embed(
            title="✅ Pedido Creado",
            description=f"Tu pedido ha sido creado: {order_id}\nServicio: {service['name']}\nPrecio: ${service['price']}",
            color=0x00ff00
        )

        await ctx.send(embed=success_embed)
        logger.info(f"✅ Pedido {order_id} creado por {ctx.author} en Discord")

    except Exception as e:
        logger.error(f"Error creando pedido: {e}")
        await ctx.send("❌ Error al crear pedido")

@bot.command(name='mispedidos')
async def my_orders(ctx):
    """Ver mis pedidos: !mispedidos"""
    user_orders = [o for o in orders.values() if o.get('user_id') == str(ctx.author.id)]

    if not user_orders:
        await ctx.send("No tienes pedidos registrados.")
        return

    embed = discord.Embed(
        title="📋 Mis Pedidos",
        description=f"Total: {len(user_orders)} pedidos",
        color=0x00ff00
    )

    for order in user_orders:
        status_emoji = "🟡" if order['status'] == 'pending' else "🟢" if order['status'] == 'completed' else "🔴"
        embed.add_field(
            name=f"{order['id']} - {order['service_name']}",
            value=f"Precio: ${order['price']}\nEstado: {status_emoji} {order['status']}\nOrigen: {order['source']}",
            inline=False
        )

    embed.set_footer(text="TheDulcanDesign - Tienda Profesional")
    await ctx.send(embed=embed)

@bot.command(name='ticket')
async def create_ticket(ctx, *, description: str):
    """Crear ticket manual: !ticket descripción"""
    global ticket_counter
    ticket_counter += 1
    ticket_id = f"MAN-{ticket_counter:04d}"

    try:
        # Buscar o crear categoría de tickets
        category = discord.utils.get(ctx.guild.categories, name="🎫 Tickets")
        if not category:
            category = await ctx.guild.create_category("🎫 Tickets")

        # Crear canal privado
        overwrites = {
            ctx.guild.default_role: discord.PermissionOverwrite(view_channel=False),
            ctx.author: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True),
            ctx.guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, manage_channels=True)
        }

        channel = await category.create_text_channel(
            name=f"ticket-{ticket_id}",
            overwrites=overwrites
        )

        # Guardar ticket
        tickets[ticket_id] = {
            'id': ticket_id,
            'user_id': str(ctx.author.id),
            'username': str(ctx.author),
            'description': description,
            'channel_id': str(channel.id),
            'status': 'open',
            'created_at': datetime.now().isoformat()
        }

        # Crear embed
        embed = discord.Embed(
            title=f"🎫 Ticket: {ticket_id}",
            description=f"Usuario: {ctx.author.mention}",
            color=0x00ff00
        )

        embed.add_field(name="Descripción", value=description, inline=False)
        embed.add_field(name="Estado", value="🟢 Abierto", inline=False)
        embed.set_footer(text="TheDulcanDesign - Sistema de Tickets")

        await channel.send(content=ctx.author.mention, embed=embed)

        await ctx.send(f"✅ Ticket creado: {channel.mention}")
        logger.info(f"✅ Ticket {ticket_id} creado por {ctx.author}")

    except Exception as e:
        logger.error(f"Error creando ticket: {e}")
        await ctx.send("❌ Error al crear ticket")

@bot.command(name='cerrar')
async def close_ticket(ctx):
    """Cerrar ticket actual: !cerrar"""
    channel_name = ctx.channel.name

    if not channel_name.startswith('ticket-'):
        await ctx.send("❌ Este comando solo funciona en canales de tickets")
        return

    # Buscar ticket
    ticket_id = None
    for tid, tdata in tickets.items():
        if tdata['channel_id'] == str(ctx.channel.id) and tdata['status'] == 'open':
            ticket_id = tid
            break

    if not ticket_id:
        await ctx.send("❌ No se encontró ticket abierto")
        return

    # Cerrar ticket
    tickets[ticket_id]['status'] = 'closed'
    tickets[ticket_id]['closed_at'] = datetime.now().isoformat()

    # Renombrar canal
    await ctx.channel.edit(name=f"cerrado-{channel_name.replace('ticket-', '')}")

    # Quitar permisos
    await ctx.channel.set_permissions(ctx.guild.default_role, view_channel=False)

    embed = discord.Embed(
        title="🔒 Ticket Cerrado",
        description=f"Cerrado por {ctx.author.mention}",
        color=0xff0000
    )

    embed.add_field(name="Estado", value="🔴 Cerrado", inline=False)
    embed.set_footer(text="TheDulcanDesign - Sistema de Tickets")

    await ctx.send(embed=embed)
    logger.info(f"🔒 Ticket {ticket_id} cerrado por {ctx.author}")

@bot.command(name='tickets')
async def list_tickets(ctx):
    """Listar tickets abiertos: !tickets"""
    open_tickets = [t for t in tickets.values() if t['status'] == 'open']

    if not open_tickets:
        await ctx.send("No hay tickets abiertos")
        return

    embed = discord.Embed(
        title="📋 Tickets Abiertos",
        description=f"Total: {len(open_tickets)}",
        color=0x00ff00
    )

    for ticket in open_tickets:
        embed.add_field(
            name=ticket['id'],
            value=f"Estado: 🟢 Abierto\n{ticket.get('service', 'Manual')}",
            inline=False
        )

    await ctx.send(embed=embed)

@bot.command(name='pedidos')
async def list_all_orders(ctx):
    """Listar todos los pedidos (solo admin): !pedidos"""
    # Verificar si es admin (puedes agregar verificación de roles)
    # Por ahora, cualquier usuario puede ver

    if not orders:
        await ctx.send("No hay pedidos registrados.")
        return

    embed = discord.Embed(
        title="📋 Todos los Pedidos",
        description=f"Total: {len(orders)} pedidos",
        color=0x00ff00
    )

    for order_id, order in orders.items():
        status_emoji = "🟡" if order['status'] == 'pending' else "🟢" if order['status'] == 'completed' else "🔴"
        embed.add_field(
            name=f"{order_id} - {order['service_name']}",
            value=f"Usuario: {order.get('username', order.get('user_email', 'N/A'))}\nPrecio: ${order['price']}\nEstado: {status_emoji} {order['status']}\nOrigen: {order['source']}",
            inline=False
        )

    embed.set_footer(text="TheDulcanDesign - Tienda Profesional")
    await ctx.send(embed=embed)

@bot.command(name='estado')
async def update_order_status(ctx, order_id: str, new_status: str):
    """Actualizar estado de pedido: !estado <id> <nuevo_estado>"""
    if order_id not in orders:
        await ctx.send("❌ Pedido no encontrado.")
        return

    valid_statuses = ['pending', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        await ctx.send(f"❌ Estado inválido. Estados válidos: {', '.join(valid_statuses)}")
        return

    orders[order_id]['status'] = new_status
    orders[order_id]['updated_at'] = datetime.now().isoformat()

    status_emoji = "🟡" if new_status == 'pending' else "🟢" if new_status == 'completed' else "🔴"

    embed = discord.Embed(
        title="✅ Estado Actualizado",
        description=f"Pedido {order_id} actualizado a {status_emoji} {new_status}",
        color=0x00ff00
    )

    await ctx.send(embed=embed)
    logger.info(f"✅ Pedido {order_id} actualizado a {new_status} por {ctx.author}")

@bot.command(name='perfil')
async def show_profile(ctx):
    """Mostrar perfil de usuario: !perfil"""
    user_id = str(ctx.author.id)
    level = user_levels[user_id].get('level', 1)
    xp = user_levels[user_id].get('xp', 0)
    messages = user_stats[user_id].get('messages', 0)
    voice_time = user_stats[user_id].get('voice_time', 0)

    # Calculate next level
    next_level = level + 1
    next_xp = LEVELS.get(next_level, float('inf'))
    xp_needed = next_xp - xp
    xp_total = next_xp - LEVELS.get(level, 0)

    embed = discord.Embed(
        title=f"👤 Perfil de {ctx.author.name}",
        color=0x00ff00
    )

    embed.add_field(name="Nivel", value=f"🎖️ {level}", inline=True)
    embed.add_field(name="XP", value=f"⭐ {xp}/{next_xp}", inline=True)
    embed.add_field(name="Mensajes", value=f"💬 {messages}", inline=True)
    embed.add_field(name="Tiempo en voz", value=f"🎤 {voice_time:.1f} min", inline=True)
    embed.add_field(name="XP para siguiente nivel", value=f"{xp_needed} XP", inline=False)

    # Progress bar
    progress = (xp - LEVELS.get(level, 0)) / xp_total if xp_total != float('inf') else 1
    progress_bar = "█" * int(progress * 10) + "░" * (10 - int(progress * 10))
    embed.add_field(name="Progreso", value=f"{progress_bar} {int(progress * 100)}%", inline=False)

    embed.set_thumbnail(url=ctx.author.avatar.url if ctx.author.avatar else None)
    embed.set_footer(text="TheDulcanDesign - Sistema de Niveles")

    await ctx.send(embed=embed)

@bot.command(name='top')
async def show_leaderboard(ctx):
    """Mostrar leaderboard: !top"""
    if not user_levels:
        await ctx.send("No hay datos suficientes para el leaderboard.")
        return

    # Sort by XP
    sorted_users = sorted(user_levels.items(), key=lambda x: x[1].get('xp', 0), reverse=True)[:10]

    embed = discord.Embed(
        title="🏆 Leaderboard",
        description="Top 10 usuarios por XP",
        color=0xf1c40f
    )

    for i, (user_id, data) in enumerate(sorted_users, 1):
        user = bot.get_user(int(user_id))
        if user:
            medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
            embed.add_field(
                name=f"{medal} {user.name}",
                value=f"Nivel {data.get('level', 1)} - {data.get('xp', 0)} XP",
                inline=False
            )

    embed.set_footer(text="TheDulcanDesign - Leaderboard")
    await ctx.send(embed=embed)

@bot.command(name='rol')
async def give_role(ctx, role_name: str, member: discord.Member = None):
    """Dar rol a usuario (solo admin): !rol <nombre_rol> [@usuario]"""
    # Verificar si es admin (puedes agregar verificación de roles)
    # Por ahora, cualquiera puede usar

    target = member or ctx.author
    guild = ctx.guild

    # Mapear nombres de roles
    role_map = {
        'miembro': ROLES['member']['name'],
        'cliente': ROLES['client']['name'],
        'premium': ROLES['premium']['name'],
        'vip': ROLES['vip']['name'],
        'staff': ROLES['staff']['name'],
        'admin': ROLES['admin']['name']
    }

    if role_name.lower() not in role_map:
        await ctx.send(f"❌ Rol no válido. Roles disponibles: {', '.join(role_map.keys())}")
        return

    role = discord.utils.get(guild.roles, name=role_map[role_name.lower()])
    if not role:
        await ctx.send("❌ El rol no existe en el servidor.")
        return

    await target.add_roles(role)
    await ctx.send(f"✅ Rol {role.name} dado a {target.mention}")
    logger.info(f"✅ Role {role.name} given to {target.name} by {ctx.author}")

@bot.command(name='limpiar')
async def clear_channel(ctx, amount: int = 10):
    """Limpiar mensajes del canal: !limpiar [cantidad]"""
    if amount < 1 or amount > 100:
        await ctx.send("❌ La cantidad debe estar entre 1 y 100.")
        return

    await ctx.channel.purge(limit=amount + 1)  # +1 para incluir el comando
    logger.info(f"🧹 {ctx.author} cleared {amount} messages in {ctx.channel.name}")

@bot.command(name='anuncio')
async def make_announcement(ctx, *, message: str):
    """Hacer anuncio en canal #anuncios: !anuncio <mensaje>"""
    guild = ctx.guild
    announce_channel = discord.utils.get(guild.text_channels, name="anuncios")

    if not announce_channel:
        await ctx.send("❌ Canal de anuncios no encontrado.")
        return

    embed = discord.Embed(
        title="📢 Anuncio Oficial",
        description=message,
        color=0x00ff00
    )
    embed.add_field(name="Publicado por", value=ctx.author.mention, inline=False)
    embed.set_footer(text="TheDulcanDesign - Anuncios")
    embed.set_thumbnail(url=ctx.guild.icon.url if ctx.guild.icon else None)

    await announce_channel.send(embed=embed)
    await ctx.send("✅ Anuncio publicado en #anuncios")
    logger.info(f"📢 Announcement made by {ctx.author}")

@bot.command(name='ayuda')
async def help_command(ctx):
    """Mostrar ayuda: !ayuda"""
    embed = discord.Embed(
        title="📚 Comandos Disponibles",
        description="Lista de comandos del bot",
        color=0x00ff00
    )

    embed.add_field(name="🛒 Tienda", value="`!tienda` - Ver catálogo\n`!comprar <id>` - Comprar servicio\n`!mispedidos` - Ver mis pedidos\n`!pedidos` - Ver todos los pedidos", inline=False)
    embed.add_field(name="🎫 Soporte", value="`!ticket <desc>` - Crear ticket\n`!cerrar` - Cerrar ticket\n`!tickets` - Listar tickets", inline=False)
    embed.add_field(name="👤 Perfil", value="`!perfil` - Ver mi perfil\n`!top` - Ver leaderboard\n`!rol <nombre>` - Dar rol", inline=False)
    embed.add_field(name="🔧 Admin", value="`!estado <id> <estado>` - Actualizar pedido\n`!limpiar [cantidad]` - Limpiar canal\n`!anuncio <mensaje>` - Hacer anuncio", inline=False)
    embed.add_field(name="ℹ️ Info", value="`!ayuda` - Mostrar este mensaje\n`!servidor` - Info del servidor", inline=False)

    embed.set_footer(text="TheDulcanDesign - Sistema Completo")
    await ctx.send(embed=embed)

@bot.command(name='servidor')
async def server_info(ctx):
    """Mostrar información del servidor: !servidor"""
    guild = ctx.guild

    embed = discord.Embed(
        title=f"📊 {guild.name}",
        description="Información del servidor",
        color=0x00ff00
    )

    embed.add_field(name="👥 Miembros", value=guild.member_count, inline=True)
    embed.add_field(name="📅 Creado", value=guild.created_at.strftime('%Y-%m-%d'), inline=True)
    embed.add_field(name="🎭 Roles", value=len(guild.roles), inline=True)
    embed.add_field(name="💬 Canales de texto", value=len(guild.text_channels), inline=True)
    embed.add_field(name="🎤 Canales de voz", value=len(guild.voice_channels), inline=True)
    embed.add_field(name="👑 Dueño", value=guild.owner.mention, inline=True)

    embed.set_thumbnail(url=guild.icon.url if guild.icon else None)
    embed.set_footer(text="TheDulcanDesign - Info del Servidor")

    await ctx.send(embed=embed)

@bot.command(name='ban')
async def ban_member(ctx, member: discord.Member, *, reason: str = "Sin razón"):
    """Banear miembro (solo admin): !ban @usuario [razón]"""
    # Verificar permisos
    if not ctx.author.guild_permissions.ban_members:
        await ctx.send("❌ No tienes permisos para banear miembros.")
        return

    await member.ban(reason=reason)

    embed = discord.Embed(
        title="🔨 Usuario Baneado",
        description=f"{member.mention} ha sido baneado",
        color=0xff0000
    )
    embed.add_field(name="Razón", value=reason, inline=False)
    embed.add_field(name="Moderador", value=ctx.author.mention, inline=False)

    await ctx.send(embed=embed)
    logger.info(f"🔨 {member.name} banned by {ctx.author} for: {reason}")

@bot.command(name='kick')
async def kick_member(ctx, member: discord.Member, *, reason: str = "Sin razón"):
    """Expulsar miembro (solo admin): !kick @usuario [razón]"""
    # Verificar permisos
    if not ctx.author.guild_permissions.kick_members:
        await ctx.send("❌ No tienes permisos para expulsar miembros.")
        return

    await member.kick(reason=reason)

    embed = discord.Embed(
        title="👢 Usuario Expulsado",
        description=f"{member.mention} ha sido expulsado",
        color=0xff0000
    )
    embed.add_field(name="Razón", value=reason, inline=False)
    embed.add_field(name="Moderador", value=ctx.author.mention, inline=False)

    await ctx.send(embed=embed)
    logger.info(f"👢 {member.name} kicked by {ctx.author} for: {reason}")

@bot.command(name='mute')
async def mute_member(ctx, member: discord.Member, duration: int = 10):
    """Silenciar miembro (solo admin): !mute @usuario [minutos]"""
    # Verificar permisos
    if not ctx.author.guild_permissions.moderate_members:
        await ctx.send("❌ No tienes permisos para silenciar miembros.")
        return

    await member.timeout(datetime.timedelta(minutes=duration))

    embed = discord.Embed(
        title="🔇 Usuario Silenciado",
        description=f"{member.mention} ha sido silenciado por {duration} minutos",
        color=0xff0000
    )
    embed.add_field(name="Moderador", value=ctx.author.mention, inline=False)

    await ctx.send(embed=embed)
    logger.info(f"🔇 {member.name} muted by {ctx.author} for {duration} minutes")

@bot.command(name='unmute')
async def unmute_member(ctx, member: discord.Member):
    """Desilenciar miembro (solo admin): !unmute @usuario"""
    # Verificar permisos
    if not ctx.author.guild_permissions.moderate_members:
        await ctx.send("❌ No tienes permisos para desilenciar miembros.")
        return

    await member.timeout(None)

    embed = discord.Embed(
        title="🔊 Usuario Desilenciado",
        description=f"{member.mention} ya no está silenciado",
        color=0x00ff00
    )
    embed.add_field(name="Moderador", value=ctx.author.mention, inline=False)

    await ctx.send(embed=embed)
    logger.info(f"🔊 {member.name} unmuted by {ctx.author}")

@bot.command(name='slowmode')
async def set_slowmode(ctx, seconds: int = 0):
    """Establecer slowmode en el canal: !slowmode [segundos]"""
    if not ctx.author.guild_permissions.manage_channels:
        await ctx.send("❌ No tienes permisos para gestionar canales.")
        return

    if seconds < 0 or seconds > 21600:
        await ctx.send("❌ El tiempo debe estar entre 0 y 21600 segundos (6 horas).")
        return

    await ctx.channel.edit(slowmode_delay=seconds)

    if seconds == 0:
        await ctx.send("✅ Slowmode desactivado")
    else:
        await ctx.send(f"✅ Slowmode activado: {seconds} segundos")

    logger.info(f"⏱️ Slowmode set to {seconds}s in {ctx.channel.name} by {ctx.author}")

@bot.command(name='lock')
async def lock_channel(ctx):
    """Bloquear canal (solo admin): !lock"""
    if not ctx.author.guild_permissions.manage_channels:
        await ctx.send("❌ No tienes permisos para gestionar canales.")
        return

    await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=False)

    embed = discord.Embed(
        title="🔒 Canal Bloqueado",
        description="Solo los administradores pueden enviar mensajes",
        color=0xff0000
    )
    await ctx.send(embed=embed)
    logger.info(f"🔒 {ctx.channel.name} locked by {ctx.author}")

@bot.command(name='unlock')
async def unlock_channel(ctx):
    """Desbloquear canal (solo admin): !unlock"""
    if not ctx.author.guild_permissions.manage_channels:
        await ctx.send("❌ No tienes permisos para gestionar canales.")
        return

    await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=True)

    embed = discord.Embed(
        title="🔓 Canal Desbloqueado",
        description="Todos pueden enviar mensajes nuevamente",
        color=0x00ff00
    )
    await ctx.send(embed=embed)
    logger.info(f"🔓 {ctx.channel.name} unlocked by {ctx.author}")

@bot.command(name='invite')
async def create_invite(ctx):
    """Crear enlace de invitación: !invite"""
    invite = await ctx.channel.create_invite(max_age=3600, max_uses=10)

    embed = discord.Embed(
        title="🔗 Enlace de Invitación",
        description=f"Enlace creado por {ctx.author.mention}",
        color=0x00ff00
    )
    embed.add_field(name="Enlace", value=invite.url, inline=False)
    embed.add_field(name="Expira en", value="1 hora", inline=True)
    embed.add_field(name="Usos máximos", value="10", inline=True)

    await ctx.send(embed=embed)
    logger.info(f"🔗 Invite created by {ctx.author}")

@bot.command(name='userinfo')
async def user_info(ctx, member: discord.Member = None):
    """Mostrar información de usuario: !userinfo [@usuario]"""
    target = member or ctx.author

    embed = discord.Embed(
        title=f"👤 Info de {target.name}",
        color=0x00ff00
    )

    embed.add_field(name="ID", value=target.id, inline=True)
    embed.add_field(name="📅 Cuenta creada", value=target.created_at.strftime('%Y-%m-%d'), inline=True)
    embed.add_field(name="📅 Se unió", value=target.joined_at.strftime('%Y-%m-%d') if target.joined_at else "N/A", inline=True)
    embed.add_field(name="🎭 Roles", value=", ".join([role.name for role in target.roles[1:]]), inline=False)

    # Stats
    user_id = str(target.id)
    level = user_levels[user_id].get('level', 1)
    xp = user_levels[user_id].get('xp', 0)
    messages = user_stats[user_id].get('messages', 0)
    voice_time = user_stats[user_id].get('voice_time', 0)

    embed.add_field(name="🎖️ Nivel", value=level, inline=True)
    embed.add_field(name="⭐ XP", value=xp, inline=True)
    embed.add_field(name="💬 Mensajes", value=messages, inline=True)
    embed.add_field(name="🎤 Tiempo voz", value=f"{voice_time:.1f} min", inline=True)

    embed.set_thumbnail(url=target.avatar.url if target.avatar else None)
    embed.set_footer(text="TheDulcanDesign - Info de Usuario")

    await ctx.send(embed=embed)

@bot.command(name='ping')
async def ping(ctx):
    """Mostrar latencia del bot: !ping"""
    latency = round(bot.latency * 1000)

    embed = discord.Embed(
        title="🏓 Pong!",
        description=f"Latencia: {latency}ms",
        color=0x00ff00
    )
    embed.set_footer(text="TheDulcanDesign - Sistema Completo")

    await ctx.send(embed=embed)

# Flask server en thread separado
def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False)

# Sistema de backup de datos
async def backup_data():
    """Backup de datos a archivo JSON"""
    try:
        backup_data = {
            'tickets': tickets,
            'orders': orders,
            'user_levels': dict(user_levels),
            'user_stats': dict(user_stats),
            'referrals': dict(referrals),
            'timestamp': datetime.now().isoformat()
        }

        with open('backup.json', 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2)

        logger.info("💾 Backup de datos completado")
    except Exception as e:
        logger.error(f"Error en backup: {e}")

# Task programado para backup
async def scheduled_tasks():
    """Tareas programadas"""
    while True:
        await asyncio.sleep(3600)  # Cada hora
        await backup_data()

@bot.command(name='backup')
async def manual_backup(ctx):
    """Backup manual de datos: !backup"""
    await backup_data()
    await ctx.send("✅ Backup completado")

@bot.command(name='stats')
async def show_stats(ctx):
    """Mostrar estadísticas del servidor: !stats"""
    guild = ctx.guild

    embed = discord.Embed(
        title="📊 Estadísticas del Servidor",
        color=0x00ff00
    )

    embed.add_field(name="👥 Total miembros", value=guild.member_count, inline=True)
    embed.add_field(name="🎭 Total roles", value=len(guild.roles), inline=True)
    embed.add_field(name="💬 Canales texto", value=len(guild.text_channels), inline=True)
    embed.add_field(name="🎤 Canales voz", value=len(guild.voice_channels), inline=True)
    embed.add_field(name="🎫 Tickets activos", value=len([t for t in tickets.values() if t['status'] == 'open']), inline=True)
    embed.add_field(name="🛒 Pedidos totales", value=len(orders), inline=True)
    embed.add_field(name="⭐ Nivel promedio", value=f"{sum(u.get('level', 1) for u in user_levels.values()) / len(user_levels) if user_levels else 0:.1f}", inline=True)
    embed.add_field(name="💬 Total mensajes", value=sum(u.get('messages', 0) for u in user_stats.values()), inline=True)

    embed.set_footer(text="TheDulcanDesign - Estadísticas")
    await ctx.send(embed=embed)

@bot.command(name='encuesta')
async def create_poll(ctx, *, question: str):
    """Crear encuesta: !encuesta <pregunta>"""
    embed = discord.Embed(
        title="📊 Encuesta",
        description=question,
        color=0x00ff00
    )
    embed.add_field(name="👍", value="A favor", inline=True)
    embed.add_field(name="👎", value="En contra", inline=True)
    embed.add_field(name="🤷", value="Neutral", inline=True)
    embed.set_footer(text=f"Encuesta creada por {ctx.author.name}")

    message = await ctx.send(embed=embed)
    await message.add_reaction("👍")
    await message.add_reaction("👎")
    await message.add_reaction("🤷")

    logger.info(f"📊 Poll created by {ctx.author}: {question}")

@bot.command(name='sorteo')
async def create_giveaway(ctx, duration: int, *, prize: str):
    """Crear sorteo: !sorteo <minutos> <premio>"""
    embed = discord.Embed(
        title="🎁 SORTEO",
        description=f"**Premio:** {prize}\n**Duración:** {duration} minutos",
        color=0xf1c40f
    )
    embed.add_field(name="📝 Cómo participar", value="Reacciona con 🎉 para participar", inline=False)
    embed.add_field(name="⏰ Tiempo restante", value=f"{duration} minutos", inline=False)
    embed.set_footer(text=f"Sorteo creado por {ctx.author.name}")

    message = await ctx.send(embed=embed)
    await message.add_reaction("🎉")

    await ctx.send(f"✅ Sorteo creado. Durará {duration} minutos.")

    # Esperar el tiempo
    await asyncio.sleep(duration * 60)

    # Elegir ganador
    message = await ctx.channel.fetch_message(message.id)
    users = [user async for user in message.reactions[0].users() if not user.bot]

    if not users:
        await ctx.send("❌ No hubo participantes.")
        return

    winner = random.choice(users)

    winner_embed = discord.Embed(
        title="🎉 ¡GANADOR DEL SORTEO!",
        description=f"¡Felicidades {winner.mention}!\nHas ganado: {prize}",
        color=0xf1c40f
    )
    await ctx.send(embed=winner_embed)
    logger.info(f"🎉 Giveaway winner: {winner.name} - {prize}")

if __name__ == '__main__':
    # Iniciar Flask en thread separado
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    logger.info("🚀 Flask webhook server iniciado en puerto 5000")

    try:
        bot.run(TOKEN)
    except KeyboardInterrupt:
        logger.info("🛑 Bot detenido por usuario")
    except Exception as e:
        logger.error(f"❌ Error fatal: {e}")
