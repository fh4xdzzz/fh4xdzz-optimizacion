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

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
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
    description="TheDulcanDesign Bot - Sistema de Tickets Integrado"
)

# Tickets storage (en producción usar Supabase)
tickets = {}
ticket_counter = 0

@app.route('/webhook', methods=['POST'])
def webhook():
    """Webhook endpoint para recibir eventos de la web"""
    try:
        data = request.json
        logger.info(f"📥 Webhook recibido: {data}")

        if data.get('type') == 'order_created':
            # Crear ticket desde pedido web
            order_data = data.get('data', {})
            create_ticket_from_web(order_data)
            return jsonify({'success': True, 'message': 'Ticket creado'}), 200

        return jsonify({'success': False, 'message': 'Tipo no soportado'}), 400
    except Exception as e:
        logger.error(f"Error en webhook: {e}")
        return jsonify({'success': False, 'message': 'Error interno'}), 500

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
            name="tickets"
        ),
        status=discord.Status.online
    )

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
