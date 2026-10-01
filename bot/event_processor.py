"""
Event Processor - Sistema de procesamiento de eventos profesionales
Procesa eventos desde la web y genera embeds profesionales en Discord
"""

import discord
import json
import os
from datetime import datetime
from typing import Dict, Any
from urllib.parse import urlencode
from utils.logger import logger

class EventProcessor:
    """Procesador de eventos para Discord"""

    def __init__(self, bot):
        self.bot = bot
        self.processed_events = set()  # Para prevenir duplicados

    async def process_event(self, event: Dict[str, Any]) -> bool:
        """Procesar evento y enviar notificación apropiada"""
        try:
            event_id = event.get('event_id')
            event_type = event.get('event_type')
            payload = event.get('payload', {})

            # Prevenir duplicados
            if event_id in self.processed_events:
                logger.info(f"Evento duplicado ignorado: {event_id}")
                return True

            self.processed_events.add(event_id)

            # Procesar según tipo
            if event_type == 'order.created':
                await self.handle_order_created(event)
            elif event_type == 'order.paid':
                await self.handle_order_paid(event)
            elif event_type == 'order.processing':
                await self.handle_order_processing(event)
            elif event_type == 'order.completed':
                await self.handle_order_completed(event)
            elif event_type == 'order.cancelled':
                await self.handle_order_cancelled(event)
            elif event_type == 'ticket.created':
                await self.handle_ticket_created(event)
            elif event_type == 'ticket.message_created':
                await self.handle_ticket_message(event)
            elif event_type == 'ticket.transferred':
                await self.handle_ticket_transferred(event)
            elif event_type == 'user.created':
                await self.handle_user_created(event)
            elif event_type == 'system.alert':
                await self.handle_system_alert(event)
            else:
                logger.warning(f"Tipo de evento desconocido: {event_type}")
                return False

            logger.info(f"Evento procesado exitosamente: {event_type} ({event_id})")
            return True

        except Exception as e:
            logger.error(f"Error procesando evento: {e}")
            return False

    async def handle_order_created(self, event: Dict[str, Any]):
        """Manejar evento de pedido creado"""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="🛒 Nuevo Pedido Creado",
            description=f"Pedido: {payload.get('order_number', 'N/A')}",
            color=0xf1c40f  # Amarillo - Pendiente
        )

        embed.add_field(name="ID del Pedido", value=payload.get('order_id', 'N/A'), inline=True)
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Email", value=payload.get('customer_email', 'N/A'), inline=True)
        embed.add_field(name="Servicio", value=payload.get('service_name', 'N/A'), inline=True)
        embed.add_field(name="Estado", value="Pendiente", inline=True)
        embed.add_field(name="Descripción", value=payload.get('description', 'Sin descripción'), inline=False)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)
        await self.notify_customer(payload, embed)

    async def handle_order_paid(self, event: Dict[str, Any]):
        """Manejar evento de pedido pagado"""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="💰 Pedido Pagado",
            description=f"Pedido: {payload.get('order_number', 'N/A')}",
            color=0x3498db  # Azul - Pagado
        )

        embed.add_field(name="ID del Pedido", value=payload.get('order_id', 'N/A'), inline=True)
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Servicio", value=payload.get('service_name', 'N/A'), inline=True)
        embed.add_field(name="Estado", value="Pagado", inline=True)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)
        await self.notify_customer(payload, embed)

    async def handle_order_processing(self, event: Dict[str, Any]):
        """Manejar evento de pedido en proceso"""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="⚙️ Pedido en Proceso",
            description=f"Pedido: {payload.get('order_number', 'N/A')}",
            color=0xe67e22  # Naranja - En proceso
        )

        embed.add_field(name="ID del Pedido", value=payload.get('order_id', 'N/A'), inline=True)
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Servicio", value=payload.get('service_name', 'N/A'), inline=True)
        embed.add_field(name="Estado", value="En Proceso", inline=True)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)
        await self.notify_customer(payload, embed)

    async def handle_order_completed(self, event: Dict[str, Any]):
        """Manejar evento de pedido completado"""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="✅ Pedido Completado",
            description=f"Pedido: {payload.get('order_number', 'N/A')}",
            color=0x2ecc71  # Verde - Completado
        )

        embed.add_field(name="ID del Pedido", value=payload.get('order_id', 'N/A'), inline=True)
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Servicio", value=payload.get('service_name', 'N/A'), inline=True)
        embed.add_field(name="Estado", value="Completado", inline=True)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)
        await self.notify_customer(payload, embed)

    async def handle_order_cancelled(self, event: Dict[str, Any]):
        """Manejar evento de pedido cancelado"""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="❌ Pedido Cancelado",
            description=f"Pedido: {payload.get('order_number', 'N/A')}",
            color=0xe74c3c  # Rojo - Cancelado
        )

        embed.add_field(name="ID del Pedido", value=payload.get('order_id', 'N/A'), inline=True)
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Servicio", value=payload.get('service_name', 'N/A'), inline=True)
        embed.add_field(name="Estado", value="Cancelado", inline=True)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)
        await self.notify_customer(payload, embed)

    async def handle_ticket_created(self, event: Dict[str, Any]):
        """Manejar evento de ticket creado"""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="🎫 Nuevo Ticket Creado",
            description=f"Ticket: {payload.get('ticket_id', 'N/A')}",
            color=0x3498db  # Azul
        )

        embed.add_field(name="ID del Ticket", value=payload.get('ticket_id', 'N/A'), inline=True)
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Categoría", value=payload.get('category', 'N/A'), inline=True)
        embed.add_field(name="Asunto", value=payload.get('subject', 'N/A'), inline=False)
        embed.add_field(name="Descripción", value=payload.get('description', 'Sin descripción'), inline=False)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)
        await self.notify_customer(payload, embed)

    async def handle_ticket_message(self, event: Dict[str, Any]):
        """Manejar evento de mensaje en ticket"""
        payload = event.get('payload', {})
        notification_scope = payload.get('notification_scope', 'support_team')

        embed = discord.Embed(
            title="💬 Nuevo Mensaje en Ticket",
            description=f"Ticket: {payload.get('ticket_id', 'N/A')}",
            color=0x9b59b6  # Púrpura
        )

        embed.add_field(name="ID del Ticket", value=payload.get('ticket_id', 'N/A'), inline=True)
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Remitente", value=payload.get('sender', 'N/A'), inline=True)
        embed.add_field(name="Mensaje", value=payload.get('message', 'Sin mensaje'), inline=False)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        # Un mensaje del agente dentro de un chat ya reclamado sólo debe llegar
        # al cliente. No volvemos a inundar por DM a todo el equipo de soporte.
        if notification_scope == 'support_team':
            await self.notify_support_team(embed)
        elif notification_scope == 'assigned_agent':
            await self.notify_discord_user(
                payload.get('assigned_agent_discord_id'),
                embed,
                "agente asignado"
            )

        await self.notify_customer(payload, embed)

    async def handle_ticket_transferred(self, event: Dict[str, Any]):
        """Notificar una transferencia únicamente al agente receptor."""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="🔄 Chat transferido a ti",
            description=f"Ahora eres responsable del ticket {payload.get('ticket_id', 'N/A')}",
            color=0x5865F2
        )
        embed.add_field(name="Cliente", value=payload.get('customer_name', 'N/A'), inline=True)
        embed.add_field(name="Transferido por", value=payload.get('from_agent_name', 'N/A'), inline=True)
        embed.add_field(name="Acción", value="Entra al panel de soporte para continuar la conversación.", inline=False)
        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        base_url = os.getenv('WEB_APP_URL', 'https://www.thedulcandesign.com').rstrip('/')
        chat_url = f"{base_url}/admin?{urlencode({'supportChat': payload.get('session_id', '')})}"
        view = discord.ui.View()
        view.add_item(discord.ui.Button(
            label="Abrir chat",
            emoji="💬",
            style=discord.ButtonStyle.link,
            url=chat_url
        ))

        await self.notify_discord_user(
            payload.get('target_discord_user_id'),
            embed,
            "agente receptor",
            view=view
        )

    async def handle_user_created(self, event: Dict[str, Any]):
        """Manejar evento de usuario creado"""
        payload = event.get('payload', {})

        embed = discord.Embed(
            title="👤 Nuevo Usuario Registrado",
            description=f"Usuario: {payload.get('email', 'N/A')}",
            color=0x2ecc71  # Verde
        )

        embed.add_field(name="ID del Usuario", value=payload.get('user_id', 'N/A'), inline=True)
        embed.add_field(name="Email", value=payload.get('email', 'N/A'), inline=True)
        embed.add_field(name="Nombre", value=payload.get('full_name', 'N/A'), inline=True)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)

    async def handle_system_alert(self, event: Dict[str, Any]):
        """Manejar evento de alerta del sistema"""
        payload = event.get('payload', {})

        # Colores según nivel
        colors = {
            'info': 0x3498db,
            'warning': 0xf1c40f,
            'error': 0xe67e22,
            'critical': 0xe74c3c
        }

        level = payload.get('level', 'info')
        embed = discord.Embed(
            title=f"⚠️ Alerta del Sistema: {level.upper()}",
            description=payload.get('message', 'Sin mensaje'),
            color=colors.get(level, 0x3498db)
        )

        embed.add_field(name="Nivel", value=level.upper(), inline=True)
        embed.add_field(name="Origen", value=payload.get('origin', 'N/A'), inline=True)
        embed.add_field(name="Fecha", value=datetime.fromisoformat(event.get('created_at')).strftime('%Y-%m-%d %H:%M:%S'), inline=False)

        # Información técnica sin secretos
        tech_info = payload.get('technical_info', {})
        if tech_info:
            # Filtrar información sensible
            safe_info = {k: v for k, v in tech_info.items() if not any(secret in k.lower() for secret in ['token', 'password', 'secret', 'key'])}
            if safe_info:
                embed.add_field(name="Información Técnica", value=f"```json\n{json.dumps(safe_info, indent=2)}\n```", inline=False)

        embed.set_footer(text=f"ID evento: {event.get('event_id')} | TheDulcanDesign")
        embed.timestamp = datetime.fromisoformat(event.get('created_at'))

        await self.notify_support_team(embed)

    async def send_to_channel(self, channel_name: str, embed: discord.Embed):
        """Enviar embed a un canal específico"""
        try:
            # Buscar el canal en todos los servidores del bot
            for guild in self.bot.guilds:
                channel = discord.utils.get(guild.text_channels, name=channel_name)
                if channel:
                    await channel.send(embed=embed)
                    logger.info(f"Embed enviado a #{channel_name} en {guild.name}")
                    return

            logger.warning(f"Canal #{channel_name} no encontrado en ningún servidor")
        except Exception as e:
            logger.error(f"Error enviando a canal #{channel_name}: {e}")

    async def notify_support_team(self, embed: discord.Embed):
        """Enviar por DM sólo a staff, admin y owner."""
        try:
            for guild in self.bot.guilds:
                allowed_names = {'staff', 'admin', 'owner', 'soporte'}
                members_to_notify = {
                    member for member in guild.members
                    if not member.bot and any(role.name.lower() in allowed_names for role in member.roles)
                }

                # Enviar DM a cada miembro
                for member in members_to_notify:
                    try:
                        await member.send(embed=embed)
                        logger.info(f"Notificación enviada a {member.name} ({member.id})")
                    except Exception as e:
                        logger.error(f"Error enviando DM a {member.name}: {e}")

        except Exception as e:
            logger.error(f"Error notificando al equipo de soporte: {e}")

    async def notify_customer(self, payload: Dict[str, Any], embed: discord.Embed):
        """Enviar al cliente por DM cuando el evento incluye su Discord ID."""
        discord_user_id = payload.get('discord_user_id')
        if not discord_user_id:
            return
        try:
            user = self.bot.get_user(int(discord_user_id)) or await self.bot.fetch_user(int(discord_user_id))
            await user.send(embed=embed)
        except (ValueError, discord.Forbidden, discord.NotFound) as error:
            logger.warning(f"No se pudo enviar DM privado al cliente: {error}")

    async def notify_discord_user(
        self,
        discord_user_id: Any,
        embed: discord.Embed,
        recipient: str,
        view: discord.ui.View | None = None
    ):
        """Enviar un DM a un único usuario de Discord."""
        if not discord_user_id:
            logger.warning(f"No se pudo notificar al {recipient}: Discord ID no configurado")
            return
        try:
            user = self.bot.get_user(int(discord_user_id)) or await self.bot.fetch_user(int(discord_user_id))
            await user.send(embed=embed, view=view)
            logger.info(f"Notificación privada enviada al {recipient} ({discord_user_id})")
        except (ValueError, discord.Forbidden, discord.NotFound) as error:
            logger.warning(f"No se pudo enviar DM privado al {recipient}: {error}")
