import os
import sys
import discord
from discord.ext import commands
from dotenv import load_dotenv
from flask import Flask, request, jsonify
import threading
import logging
from datetime import datetime
import requests
import json

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

bot = commands.Bot(
    command_prefix=commands.when_mentioned_or('!'),
    intents=intents,
    description="TheDulcanDesign - Tienda Profesional"
)

# Storage (en producción usar Supabase)
tickets = {}
ticket_counter = 0
orders = {}
order_counter = 0

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
            name="tienda y tickets"
        ),
        status=discord.Status.online
    )

    # Create shop channels if they don't exist
    await setup_shop_channels()

async def setup_shop_channels():
    """Setup shop channels and categories"""
    try:
        guild = bot.get_guild(int(GUILD_ID)) if GUILD_ID else None
        if not guild:
            return

        # Create shop category
        shop_category = discord.utils.get(guild.categories, name="🛒 Tienda")
        if not shop_category:
            shop_category = await guild.create_category("🛒 Tienda")

        # Create shop info channel
        shop_info = discord.utils.get(guild.text_channels, name="informacion-tienda")
        if not shop_info:
            shop_info = await shop_category.create_text_channel("informacion-tienda")

        # Create shop orders channel
        orders_channel = discord.utils.get(guild.text_channels, name="pedidos")
        if not orders_channel:
            orders_channel = await shop_category.create_text_channel("pedidos")

        # Send shop info
        info_embed = discord.Embed(
            title="🛒 TheDulcanDesign - Tienda",
            description="Bienvenido a nuestra tienda de servicios profesionales",
            color=0x00ff00
        )

        info_embed.add_field(name="Comandos", value="`!tienda` - Ver servicios\n`!comprar <id>` - Comprar servicio\n`!mispedidos` - Ver tus pedidos\n`!ticket` - Crear ticket de soporte", inline=False)
        info_embed.add_field(name="Web", value="https://thedulcandesign.com", inline=False)
        info_embed.set_footer(text="Usa !tienda para ver nuestros servicios")

        await shop_info.send(embed=info_embed)

        logger.info("✅ Shop channels created")
    except Exception as e:
        logger.error(f"Error setting up shop channels: {e}")

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

# Flask server en thread separado
def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False)

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
