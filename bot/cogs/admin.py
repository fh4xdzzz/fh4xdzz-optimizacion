import discord
from discord.ext import commands
from utils.logger import logger
from utils.helpers import is_admin, is_staff
from config.settings import config
from database.tickets import ticket_db

class Admin(commands.Cog):
    """Comandos administrativos"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name='admin_stats')
    @commands.has_permissions(administrator=True)
    async def admin_stats(self, ctx):
        """Muestra estadísticas del servidor"""
        total_members = ctx.guild.member_count
        total_tickets = len(ticket_db.tickets)
        open_tickets = len([t for t in ticket_db.tickets.values() if t['status'] == 'open'])
        
        embed = discord.Embed(
            title="📊 Estadísticas del Servidor",
            color=config.COLOR_PRIMARY
        )
        
        embed.add_field(name="Miembros", value=str(total_members), inline=True)
        embed.add_field(name="Total Tickets", value=str(total_tickets), inline=True)
        embed.add_field(name="Tickets Abiertos", value=str(open_tickets), inline=True)
        embed.add_field(name="Tickets Cerrados", value=str(total_tickets - open_tickets), inline=True)
        
        embed.set_footer(text="TheDulcanDesign Bot - Admin")
        await ctx.send(embed=embed)
        
        logger.info(f"Admin stats executed by {ctx.author} in {ctx.guild.name}")
    
    @commands.command(name='admin_tickets')
    @commands.has_permissions(administrator=True)
    async def admin_tickets(self, ctx):
        """Muestra todos los tickets"""
        if not ticket_db.tickets:
            await ctx.send("No hay tickets en el sistema.")
            return
        
        embed = discord.Embed(
            title="🎫 Todos los Tickets",
            color=config.COLOR_SECONDARY
        )
        
        for ticket_id, ticket_data in ticket_db.tickets.items():
            status_emoji = "🟢" if ticket_data['status'] == 'open' else "🔴"
            embed.add_field(
                name=f"{status_emoji} {ticket_id}",
                value=f"**Usuario:** {ticket_data['username']}\n**Servicio:** {ticket_data['subject']}\n**Estado:** {ticket_data['status']}",
                inline=False
            )
        
        embed.set_footer(text="TheDulcanDesign Bot - Admin")
        await ctx.send(embed=embed)
        
        logger.info(f"Admin tickets executed by {ctx.author} in {ctx.guild.name}")

async def setup(bot):
    await bot.add_cog(Admin(bot))
