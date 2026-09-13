import discord
from discord.ext import commands
from discord import ui
from typing import Optional
from utils.logger import logger
from utils.helpers import is_staff, format_error
from config.settings import config
from database.tickets import ticket_db
from services.services_list import SERVICES

class Tickets(commands.Cog):
    """Sistema de tickets de soporte"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name='ticket')
    async def create_ticket(self, ctx):
        """Muestra el panel para crear un ticket"""
        # Verificar si el usuario tiene tickets abiertos
        open_tickets = ticket_db.get_open_tickets(str(ctx.author.id))
        
        if open_tickets:
            await ctx.send("❌ Ya tienes un ticket abierto. Cierra el ticket actual antes de crear otro.")
            return
        
        # Crear panel de selección de servicio
        embed = discord.Embed(
            title="🎫 Crear Ticket de Soporte",
            description="Selecciona el servicio para el que necesitas soporte",
            color=config.COLOR_PRIMARY
        )
        
        # Crear select menu con servicios
        select = ui.Select(
            placeholder="Selecciona un servicio...",
            options=[
                discord.SelectOption(label=service['name'], value=str(service['id']))
                for service in SERVICES
            ]
        )
        
        # Crear botones de acción
        confirm_button = ui.Button(label="Crear Ticket", style=discord.ButtonStyle.green, emoji="✅")
        cancel_button = ui.Button(label="Cancelar", style=discord.ButtonStyle.red, emoji="❌")
        
        view = ui.View()
        view.add_item(select)
        view.add_item(confirm_button)
        view.add_item(cancel_button)
        
        message = await ctx.send("Selecciona el servicio para tu ticket:", view=view)
        
        # Esperar respuesta del usuario
        try:
            interaction = await self.bot.wait_for('interaction', check=lambda i: i.user == ctx.author and i.message == message, timeout=60)
            
            if interaction.data['custom_id'] == cancel_button.custom_id:
                await interaction.response.send_message("❌ Cancelado", ephemeral=True)
                await message.delete()
                return
            
            # Obtener servicio seleccionado
            selected_service_id = int(select.values[0])
            service = next((s for s in SERVICES if s['id'] == selected_service_id), None)
            
            # Crear modal para descripción
            modal = ui.Modal(
                title=f"Ticket: {service['name']}",
                custom_id="ticket_modal",
                timeout=300
            )
            
            modal.add_item(
                ui.TextInput(
                    label="Describe tu problema o requerimiento",
                    style=discord.TextStyle.paragraph,
                    placeholder="Detalla qué necesitas, tu hardware actual, problemas que tienes, etc...",
                    required=True,
                    max_length=1000,
                    custom_id="description"
                )
            )
            
            await interaction.response.send_modal(modal)
            
            # Esperar respuesta del modal
            modal_interaction = await self.bot.wait_for('interaction', check=lambda i: i.user == ctx.author and i.custom_id == "ticket_modal", timeout=300)
            
            description = modal_interaction.data['components'][0]['value']
            
            # Crear canal privado para el ticket
            category = ctx.guild.get_channel_named("tickets")
            if not category:
                overwrites = {
                    discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, attach_files=True),
                    discord.PermissionOverwrite(ctx.guild.default_role, view_channel=False)
                }
                category = await ctx.guild.create_category("Tickets", overwrites=overwrites)
            
            overwrites = {
                ctx.guild.default_role: discord.PermissionOverwrite(view_channel=False),
                ctx.author: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, attach_files=True),
                ctx.guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, manage_channels=True)
            }
            
            channel = await category.create_text_channel(
                name=f"ticket-{ctx.author.name}-{ctx.author.discriminator}",
                overwrites=overwrites
            )
            
            # Crear ticket en base de datos
            ticket_id = ticket_db.create_ticket(
                user_id=str(ctx.author.id),
                username=str(ctx.author),
                category=service['category'],
                subject=service['name'],
                description=description,
                channel_id=str(channel.id)
            )
            
            # Enviar mensaje de bienvenida al canal
            welcome_embed = discord.Embed(
                title=f"🎫 Ticket #{ticket_id}",
                description=f"**Servicio:** {service['name']}\n**Usuario:** {ctx.author.mention}\n**Descripción:** {description}",
                color=config.COLOR_PRIMARY
            )
            
            welcome_embed.add_field(
                name="Estado",
                value="🟢 Abierto",
                inline=False
            )
            
            welcome_embed.add_field(
                name="Instrucciones",
                value="El staff te responderá aquí. Cuando tu problema sea resuelto, usa `!cerrar` para cerrar el ticket.",
                inline=False
            )
            
            welcome_embed.set_footer(text="FH4XDZzz OPTIMIZACION - Soporte")
            
            # Crear botón para cerrar ticket
            close_button = ui.Button(label="Cerrar Ticket", style=discord.ButtonStyle.red, emoji="🔒", custom_id="close_ticket")
            view = ui.View()
            view.add_item(close_button)
            
            await channel.send(content=ctx.author.mention, embed=welcome_embed, view=view)
            
            # Enviar confirmación al usuario
            success_embed = discord.Embed(
                title="✅ Ticket Creado",
                description=f"Tu ticket ha sido creado en {channel.mention}",
                color=config.COLOR_SUCCESS
            )
            
            await ctx.send(embed=success_embed)
            await modal_interaction.response.send_message("✅ Ticket creado exitosamente", ephemeral=True)
            
            logger.info(f"Ticket {ticket_id} created by {ctx.author} in {ctx.guild.name}")
            
        except TimeoutError:
            await ctx.send("⏰ Tiempo agotado. Por favor intenta de nuevo.")
            await message.delete()
        except Exception as e:
            logger.error(f"Error creating ticket: {e}")
            await ctx.send(format_error(e))
            await message.delete()
    
    @commands.command(name='cerrar')
    async def close_ticket(self, ctx):
        """Cierra el ticket actual"""
        # Verificar que estamos en un canal de ticket
        if not ctx.channel.name.startswith('ticket-'):
            await ctx.send("❌ Este comando solo puede usarse en canales de tickets.")
            return
        
        # Buscar ticket correspondiente al canal
        ticket = None
        for t_id, t_data in ticket_db.tickets.items():
            if t_data['channel_id'] == str(ctx.channel.id) and t_data['status'] == 'open':
                ticket = t_id
                break
        
        if not ticket:
            await ctx.send("❌ No se encontró un ticket abierto para este canal.")
            return
        
        # Verificar permisos (solo el creador del ticket o staff puede cerrar)
        if ticket_db.tickets[ticket]['user_id'] != str(ctx.author.id) and not is_staff(ctx.author, config.DISCORD_STAFF_ROLE_ID):
            await ctx.send("❌ Solo el creador del ticket o el staff puede cerrarlo.")
            return
        
        # Cerrar ticket
        ticket_db.close_ticket(ticket)
        
        # Actualizar canal
        await ctx.channel.edit(name=f"cerrado-{ctx.channel.name.replace('ticket-', '')}")
        
        # Enviar mensaje de cierre
        close_embed = discord.Embed(
            title="🔒 Ticket Cerrado",
            description=f"Este ticket ha sido cerrado por {ctx.author.mention}",
            color=config.COLOR_ERROR
        )
        
        close_embed.add_field(
            name="Estado",
            value="🔴 Cerrado",
            inline=False
        )
        
        close_embed.set_footer(text="FH4XDZzz OPTIMIZACION - Soporte")
        
        await ctx.channel.send(embed=close_embed)
        
        # Quitar permisos de escritura del usuario
        await ctx.channel.set_permissions(ctx.author, view_channel=True, read_messages=True, send_messages=False)
        
        await ctx.send("✅ Ticket cerrado exitosamente.")
        
        logger.info(f"Ticket {ticket} closed by {ctx.author} in {ctx.guild.name}")

async def setup(bot):
    await bot.add_cog(Tickets(bot))