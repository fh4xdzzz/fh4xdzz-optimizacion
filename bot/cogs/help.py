import discord
from discord.ext import commands
from utils.logger import logger
from config.settings import config

class Help(commands.Cog):
    """Comandos de ayuda"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name='help')
    async def help_command(self, ctx):
        """Muestra ayuda del bot"""
        embed = discord.Embed(
            title="🤖 TheDulcanDesign - Ayuda",
            description="Sistema de optimización y soporte técnico",
            color=config.COLOR_PRIMARY
        )
        
        embed.add_field(
            name="📋 Comandos Disponibles",
            value="```\n!setup - Configuración del servidor (Admin)\n!servicios - Lista de servicios\n!servicio <nombre> - Info detallada de servicio\n!ticket - Crear ticket de soporte\n!cerrar - Cerrar ticket actual\n!admin_stats - Estadísticas (Admin)\n!admin_tickets - Todos los tickets (Admin)\n!help - Muestra esta ayuda\n```",
            inline=False
        )
        
        embed.add_field(
            name="� Información",
            value="Para más ayuda, crea un ticket con `!ticket` o contacta al staff.",
            inline=False
        )
        
        embed.set_footer(text="TheDulcanDesign Bot")
        await ctx.send(embed=embed)
        
        logger.info(f"Help command executed by {ctx.author} in {ctx.guild.name}")

async def setup(bot):
    await bot.add_cog(Help(bot))
