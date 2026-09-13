import discord
from discord.ext import commands
from utils.logger import logger
from config.settings import config
from services.services_list import SERVICES, get_service_by_id

class Services(commands.Cog):
    """Comandos de servicios"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name='servicios')
    async def list_services(self, ctx):
        """Muestra la lista de servicios disponibles"""
        embed = discord.Embed(
            title="📋 Servicios Disponibles",
            description="Nuestros servicios profesionales de optimización",
            color=config.COLOR_PRIMARY
        )
        
        for service in SERVICES:
            value = f"**${service['price']}** - {service['duration']}\n{service['description']}"
            embed.add_field(
                name=service['name'],
                value=value,
                inline=False
            )
        
        embed.add_field(
            name="💡 ¿Cómo solicitar?",
            value="Usa el comando `/ticket` o contacta en la web para solicitar un servicio.",
            inline=False
        )
        
        embed.set_footer(text="FH4XDZzz OPTIMIZACION Bot")
        await ctx.send(embed=embed)
        
        logger.info(f"Services command executed by {ctx.author} in {ctx.guild.name}")
    
    @commands.command(name='servicio')
    async def service_info(self, ctx, *, service_name: str):
        """Muestra información detallada de un servicio"""
        service = get_service_by_name(service_name)
        
        if not service:
            await ctx.send("❌ Servicio no encontrado. Usa `!servicios` para ver la lista.")
            return
        
        embed = discord.Embed(
            title=f"📦 {service['name']}",
            description=service['description'],
            color=config.COLOR_SECONDARY
        )
        
        embed.add_field(
            name="💰 Precio",
            value=f"${service['price']}",
            inline=True
        )
        
        embed.add_field(
            name="⏱️ Duración",
            value=service['duration'],
            inline=True
        )
        
        embed.add_field(
            name="📂 Categoría",
            value=service['category'].capitalize(),
            inline=True
        )
        
        embed.add_field(
            name="✨ Beneficios",
            value="\n".join(f"• {benefit}" for benefit in service['benefits']),
            inline=False
        )
        
        embed.set_footer(text="FH4XDZzz OPTIMIZACION Bot")
        await ctx.send(embed=embed)
        
        logger.info(f"Service info command executed by {ctx.author} for {service_name}")

async def setup(bot):
    await bot.add_cog(Services(bot))