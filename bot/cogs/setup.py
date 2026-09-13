import discord
from discord.ext import commands
from utils.logger import logger
from utils.helpers import is_admin
from config.settings import config

class Setup(commands.Cog):
    """Comandos de configuración del servidor"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name='setup')
    @commands.has_permissions(administrator=True)
    async def setup_server(self, ctx):
        """Configura inicial del servidor"""
        embed = discord.Embed(
            title="🔧 Configuración del Servidor",
            description="Bienvenido al sistema de configuración de FH4XDZzz OPTIMIZACION",
            color=config.COLOR_PRIMARY
        )
        
        embed.add_field(
            name="Roles Requeridos",
            value="Necesitas crear los siguientes roles:\n- **Staff** - ID: Configurable en .env\n- **Admin** - ID: Configurable en .env",
            inline=False
        )
        
        embed.add_field(
            name="Canales Requeridos",
            value="Opcionalmente crear:\n- **tickets** - Para tickets de soporte\n- **anuncios** - Para anuncios del bot",
            inline=False
        )
        
        embed.add_field(
            name="Comandos Disponibles",
            value="```\n!setup - Configuración del servidor\n!servicios - Lista de servicios\n!ticket - Crear ticket de soporte\n!cerrar - Cerrar ticket actual\n!help - Ayuda\n```",
            inline=False
        )
        
        embed.set_footer(text="FH4XDZzz OPTIMIZACION Bot")
        await ctx.send(embed=embed)
        
        logger.info(f"Setup command executed by {ctx.author} in {ctx.guild.name}")

async def setup(bot):
    await bot.add_cog(Setup(bot))