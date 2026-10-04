"""Comandos slash y configuración profesional de TheDulcanDesign."""

import asyncio
import os
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from config.settings import config
from database.supabase_client import get_supabase_client
from utils.logger import logger


SITE_URL = os.getenv('WEB_APP_URL', os.getenv('SITE_URL', 'https://www.thedulcandesign.com')).rstrip('/')


def money(value) -> str:
    try:
        return f"${float(value):.2f}"
    except (TypeError, ValueError):
        return "Consultar"


class Professional(commands.Cog):
    """Centro de operaciones mediante comandos nativos de Discord."""

    configurar = app_commands.Group(
        name='configurar',
        description='Configura los canales y el equipo del bot',
        default_permissions=discord.Permissions(manage_guild=True),
    )

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = get_supabase_client()

    async def guild_config(self, guild_id: int) -> dict:
        return await asyncio.to_thread(self.db.get_discord_guild_config, str(guild_id))

    @configurar.command(name='canales', description='Define dónde publica cada tipo de aviso')
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        bienvenida='Canal para recibir a nuevos miembros',
        soporte='Canal privado para soportes nuevos y reclamados',
        compras='Canal privado para compras confirmadas',
        logs='Canal privado para actividad y errores del bot',
        agentes='Rol que recibirá las alertas de soporte',
    )
    async def configurar_canales(
        self,
        interaction: discord.Interaction,
        bienvenida: Optional[discord.TextChannel] = None,
        soporte: Optional[discord.TextChannel] = None,
        compras: Optional[discord.TextChannel] = None,
        logs: Optional[discord.TextChannel] = None,
        agentes: Optional[discord.Role] = None,
    ):
        if not interaction.guild:
            await interaction.response.send_message('Este comando solo funciona dentro del servidor.', ephemeral=True)
            return

        values = {
            'welcome_channel_id': str(bienvenida.id) if bienvenida else None,
            'support_channel_id': str(soporte.id) if soporte else None,
            'orders_channel_id': str(compras.id) if compras else None,
            'logs_channel_id': str(logs.id) if logs else None,
            'staff_role_id': str(agentes.id) if agentes else None,
        }
        if not any(values.values()):
            await interaction.response.send_message(
                'Selecciona por lo menos un canal o el rol de agentes.', ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True, thinking=True)
        saved = await asyncio.to_thread(
            self.db.save_discord_guild_config, str(interaction.guild.id), values
        )
        if not saved:
            await interaction.followup.send('No pude guardar la configuración. Revisa Supabase y vuelve a intentarlo.', ephemeral=True)
            return

        current = await self.guild_config(interaction.guild.id)
        await interaction.followup.send(embed=self.config_embed(interaction.guild, current), ephemeral=True)

    @configurar.command(name='ver', description='Muestra la configuración activa del bot')
    @app_commands.checks.has_permissions(manage_guild=True)
    async def configurar_ver(self, interaction: discord.Interaction):
        if not interaction.guild:
            await interaction.response.send_message('Este comando solo funciona dentro del servidor.', ephemeral=True)
            return
        current = await self.guild_config(interaction.guild.id)
        await interaction.response.send_message(embed=self.config_embed(interaction.guild, current), ephemeral=True)

    @configurar.command(name='probar', description='Envía una alerta de prueba sin avisar a clientes')
    @app_commands.checks.has_permissions(manage_guild=True)
    async def configurar_probar(self, interaction: discord.Interaction):
        if not interaction.guild:
            await interaction.response.send_message('Este comando solo funciona dentro del servidor.', ephemeral=True)
            return
        current = await self.guild_config(interaction.guild.id)
        channel_id = current.get('support_channel_id')
        channel = interaction.guild.get_channel(int(channel_id)) if channel_id else None
        if not isinstance(channel, discord.TextChannel):
            await interaction.response.send_message('Primero configura el canal de soporte.', ephemeral=True)
            return
        embed = discord.Embed(
            title='✅ Centro de soporte conectado',
            description='Las alertas selectivas de la web llegarán a este canal.',
            color=config.COLOR_SUCCESS,
        )
        embed.add_field(name='Se notificará', value='Nuevo soporte · soporte reclamado', inline=False)
        embed.add_field(name='No se publicará', value='El contenido de cada mensaje privado', inline=False)
        await channel.send(embed=embed)
        await interaction.response.send_message(f'Prueba enviada a {channel.mention}.', ephemeral=True)

    @app_commands.command(name='tienda', description='Explora los servicios profesionales disponibles')
    async def tienda(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)
        services = await asyncio.to_thread(self.db.get_all_services)
        embed = discord.Embed(
            title='🛍️ TheDulcanDesign · Tienda',
            description='Soluciones profesionales con precio transparente y atención personalizada.',
            color=config.COLOR_PRIMARY,
            url=f'{SITE_URL}/servicios',
        )
        for service in services[:8]:
            billing = money(service.get('price'))
            if service.get('billing_type') == 'subscription' and service.get('recurring_price'):
                billing += f" + {money(service.get('recurring_price'))}/{service.get('billing_interval') or 'mes'}"
            embed.add_field(
                name=f"{service.get('name', 'Servicio')} · {billing}",
                value=(service.get('description') or 'Servicio personalizado')[:240],
                inline=False,
            )
        if not services:
            embed.description = 'Consulta el catálogo actualizado directamente en nuestra web.'
        view = discord.ui.View()
        view.add_item(discord.ui.Button(label='Abrir tienda', emoji='🛒', url=f'{SITE_URL}/servicios'))
        view.add_item(discord.ui.Button(label='Servicio personalizado', emoji='✨', url=f'{SITE_URL}/contacto'))
        await interaction.followup.send(embed=embed, view=view, ephemeral=True)

    @app_commands.command(name='mispedidos', description='Consulta tus pedidos vinculados a tu cuenta de Discord')
    async def mispedidos(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)
        user = await asyncio.to_thread(self.db.get_user_by_discord_id, str(interaction.user.id))
        if not user:
            view = discord.ui.View()
            view.add_item(discord.ui.Button(label='Vincular mi cuenta', emoji='🔗', url=f'{SITE_URL}/perfil'))
            await interaction.followup.send(
                'Tu Discord todavía no está vinculado con la web. Vincúlalo desde tu perfil y vuelve a usar `/mispedidos`.',
                view=view,
                ephemeral=True,
            )
            return

        orders = await asyncio.to_thread(self.db.get_recent_orders_for_discord, str(interaction.user.id), 5)
        embed = discord.Embed(
            title='📦 Mis pedidos',
            description='Tus cinco pedidos más recientes.',
            color=config.COLOR_SECONDARY,
        )
        statuses = {
            'pending': 'Pendiente', 'paid': 'Pagado', 'reviewing': 'En revisión',
            'in_progress': 'En progreso', 'waiting_client': 'Esperando tu respuesta',
            'completed': 'Completado', 'cancelled': 'Cancelado',
        }
        for order in orders:
            service = order.get('services') or {}
            embed.add_field(
                name=f"#{order.get('order_number', '—')} · {statuses.get(order.get('status'), order.get('status', '—'))}",
                value=f"{service.get('name', 'Servicio')} · Total: {money(order.get('price'))}",
                inline=False,
            )
        if not orders:
            embed.description = 'Aún no tienes pedidos. Puedes descubrir todos los servicios con `/tienda`.'
        view = discord.ui.View()
        view.add_item(discord.ui.Button(label='Ver todos en la web', emoji='📋', url=f'{SITE_URL}/pedidos'))
        await interaction.followup.send(embed=embed, view=view, ephemeral=True)

    @app_commands.command(name='soporte', description='Abre soporte privado o consulta tu conversación activa')
    async def soporte(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title='💬 Soporte privado',
            description='Abre una conversación segura en la web. El contenido no se publica en Discord.',
            color=config.COLOR_PRIMARY,
        )
        embed.add_field(name='Tiempo habitual', value='Menos de 5 minutos', inline=True)
        embed.add_field(name='Privacidad', value='Solo tú y el agente asignado', inline=True)
        view = discord.ui.View()
        view.add_item(discord.ui.Button(label='Abrir soporte', emoji='💬', url=SITE_URL))
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

    @app_commands.command(name='panel', description='Abre el centro inteligente de servicios y soporte')
    async def panel(self, interaction: discord.Interaction):
        linked = await asyncio.to_thread(self.db.get_user_by_discord_id, str(interaction.user.id))
        embed = discord.Embed(
            title=f'👋 Hola, {interaction.user.display_name}',
            description='Tu acceso rápido a TheDulcanDesign. Elige qué quieres hacer.',
            color=config.COLOR_PRIMARY,
        )
        embed.add_field(name='Cuenta web', value='✅ Vinculada' if linked else '⚠️ Pendiente de vincular', inline=False)
        view = discord.ui.View()
        view.add_item(discord.ui.Button(label='Tienda', emoji='🛒', url=f'{SITE_URL}/servicios'))
        view.add_item(discord.ui.Button(label='Mis pedidos', emoji='📦', url=f'{SITE_URL}/pedidos'))
        view.add_item(discord.ui.Button(label='Mi perfil', emoji='👤', url=f'{SITE_URL}/perfil'))
        view.add_item(discord.ui.Button(label='Soporte', emoji='💬', url=SITE_URL))
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

    @app_commands.command(name='ayuda', description='Descubre todo lo que puede hacer el bot')
    async def ayuda(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title='✨ Asistente TheDulcanDesign',
            description='Respuestas privadas, accesos rápidos y notificaciones sin ruido.',
            color=config.COLOR_PRIMARY,
        )
        embed.add_field(name='/panel', value='Centro personal de accesos.', inline=True)
        embed.add_field(name='/tienda', value='Catálogo y precios actuales.', inline=True)
        embed.add_field(name='/mispedidos', value='Tus pedidos vinculados.', inline=True)
        embed.add_field(name='/soporte', value='Conversación privada con un agente.', inline=True)
        embed.add_field(name='/configurar', value='Canales, logs y rol de agentes (administradores).', inline=False)
        embed.set_footer(text='Escribe / para ver y completar cada comando')
        await interaction.response.send_message(embed=embed, ephemeral=True)

    def config_embed(self, guild: discord.Guild, values: dict) -> discord.Embed:
        def channel_value(key: str) -> str:
            channel_id = values.get(key)
            channel = guild.get_channel(int(channel_id)) if channel_id else None
            return channel.mention if channel else 'Sin configurar'

        role_id = values.get('staff_role_id')
        role = guild.get_role(int(role_id)) if role_id else None
        embed = discord.Embed(title='⚙️ Configuración del bot', color=config.COLOR_PRIMARY)
        embed.add_field(name='Bienvenida', value=channel_value('welcome_channel_id'), inline=True)
        embed.add_field(name='Soporte', value=channel_value('support_channel_id'), inline=True)
        embed.add_field(name='Compras', value=channel_value('orders_channel_id'), inline=True)
        embed.add_field(name='Logs', value=channel_value('logs_channel_id'), inline=True)
        embed.add_field(name='Agentes', value=role.mention if role else 'Sin configurar', inline=True)
        embed.set_footer(text='Usa /configurar canales para cambiar cualquier opción')
        return embed

    @commands.Cog.listener()
    async def on_app_command_completion(
        self,
        interaction: discord.Interaction,
        command: app_commands.Command | app_commands.ContextMenu,
    ):
        """Registrar uso de comandos nativos únicamente en el canal de logs."""
        if not interaction.guild:
            return
        values = await self.guild_config(interaction.guild.id)
        channel_id = values.get('logs_channel_id')
        channel = interaction.guild.get_channel(int(channel_id)) if channel_id else None
        if not isinstance(channel, discord.TextChannel):
            return
        embed = discord.Embed(title='Comando ejecutado', color=config.COLOR_SECONDARY)
        embed.add_field(name='Usuario', value=interaction.user.mention, inline=True)
        embed.add_field(name='Comando', value=f'/{command.qualified_name}', inline=True)
        embed.set_footer(text='Registro interno · TheDulcanDesign')
        await channel.send(embed=embed, allowed_mentions=discord.AllowedMentions.none())

    @configurar_canales.error
    @configurar_ver.error
    @configurar_probar.error
    async def configuration_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        message = 'Necesitas el permiso “Gestionar servidor” para cambiar esta configuración.'
        if not isinstance(error, app_commands.MissingPermissions):
            logger.error('Error en configuración slash: %s', error)
            message = 'No pude completar la configuración. Inténtalo nuevamente.'
        if interaction.response.is_done():
            await interaction.followup.send(message, ephemeral=True)
        else:
            await interaction.response.send_message(message, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Professional(bot))
