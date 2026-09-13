import discord
from discord.ext import commands
from discord import ui
from typing import Optional
from utils.logger import logger
from config.settings import config

class Events(commands.Cog):
    """Sistema de eventos y notificaciones profesionales"""

    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_raw_event(self, payload):
        """Procesar eventos raw del Gateway de Discord"""
        # Procesar eventos específicos
        pass

    @commands.command(name='notify')
    @commands.has_permissions(administrator=True)
    async def notify(self, ctx, event_type: str, *, details: str):
        """Enviar notificación manual: !notify <tipo> <detalles>"""
        # Tipos de notificación soportados
        valid_types = ['alert', 'order', 'ticket', 'announcement']

        if event_type not in valid_types:
            await ctx.send(f"❌ Tipo inválido. Tipos válidos: {', '.join(valid_types)}")
            return

        # Colores según tipo
        colors = {
            'alert': 0xff0000,
            'order': 0x00ff00,
            'ticket': 0x3498db,
            'announcement': 0xf1c40f
        }

        embed = discord.Embed(
            title=f"📢 Notificación: {event_type.upper()}",
            description=details,
            color=colors.get(event_type, 0x00ff00)
        )

        embed.add_field(name="Enviado por", value=ctx.author.mention, inline=False)
        embed.add_field(name="Fecha", value=discord.utils.utcnow().strftime('%Y-%m-%d %H:%M:%S'), inline=False)
        embed.set_footer(text="TheDulcanDesign - Sistema de Notificaciones")

        # Enviar al canal de notificaciones si existe
        notifications_channel = discord.utils.get(ctx.guild.text_channels, name="notificaciones")
        if notifications_channel:
            await notifications_channel.send(embed=embed)
            await ctx.send("✅ Notificación enviada al canal #notificaciones")
        else:
            await ctx.send(embed=embed)
            await ctx.send("⚠️ Canal #notificaciones no encontrado, enviado aquí")

        logger.info(f"Notificación {event_type} enviada por {ctx.author}: {details}")

async def setup(bot):
    await bot.add_cog(Events(bot))
