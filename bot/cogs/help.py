import discord
from discord.ext import commands

class Help(commands.Cog):
    """Help command and information"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name='help')
    async def help_command(self, ctx):
        """Show help information"""
        embed = discord.Embed(
            title="🤖 FH4XDZzz OPTIMIZACION - Ayuda",
            description="Sistema de optimización y soporte técnico",
            color=discord.Color.blue()
        )
        
        embed.add_field(
            name="📋 Comandos Disponibles",
            value="```\n!help - Muestra esta ayuda\n!servicios - Lista de servicios\n!ticket - Crear ticket de soporte\n!pedido <id> - Consultar estado de pedido\n!cerrar - Cerrar ticket actual\n```",
            inline=False
        )
        
        embed.add_field(
            name="🔧 Comandos Admin",
            value="```\n/setup - Configurar servidor\n```",
            inline=False
        )
        
        embed.add_field(
            name="📞 Soporte",
            value="Para más ayuda, crea un ticket con `!ticket`",
            inline=False
        )
        
        embed.set_footer(text="FH4XDZzz OPTIMIZACION Bot")
        await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Help(bot))