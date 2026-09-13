"""
Security Module - Validación de permisos y seguridad
"""

import discord
from discord.ext import commands
from typing import Optional, List
from config.settings import config
from utils.logger import logger

class SecurityValidator:
    """Validador de seguridad y permisos"""

    @staticmethod
    def is_guild_owner(ctx: commands.Context) -> bool:
        """Verificar si el usuario es owner del servidor"""
        return ctx.guild.owner_id == ctx.author.id

    @staticmethod
    def has_bot_permissions(guild: discord.Guild, required_permissions: discord.Permissions) -> bool:
        """Verificar si el bot tiene los permisos requeridos"""
        bot_member = guild.me
        bot_permissions = bot_member.guild_permissions

        # Verificar si tiene todos los permisos requeridos
        for perm in required_permissions:
            if not getattr(bot_permissions, perm, False):
                return False

        return True

    @staticmethod
    def validate_guild_id(guild_id: int) -> bool:
        """Validar que el guild_id sea el configurado"""
        configured_guild_id = config.DISCORD_GUILD_ID
        if not configured_guild_id:
            return True  # Si no está configurado, permitir cualquier guild

        return str(guild_id) == str(configured_guild_id)

    @staticmethod
    def validate_admin_role(member: discord.Member) -> bool:
        """Validar si el miembro tiene rol de admin"""
        admin_role_name = 'Admin'
        admin_role = discord.utils.get(member.roles, name=admin_role_name)
        return admin_role is not None

    @staticmethod
    def validate_staff_role(member: discord.Member) -> bool:
        """Validar si el miembro tiene rol de staff"""
        staff_role_name = 'Staff'
        staff_role = discord.utils.get(member.roles, name=staff_role_name)
        return staff_role is not None

    @staticmethod
    def is_authorized_user(user_id: int) -> bool:
        """Validar si el usuario está en la lista de usuarios autorizados"""
        # En producción, esto debería venir de base de datos
        authorized_users = []
        return user_id in authorized_users

    @staticmethod
    def sanitize_log_data(data: dict) -> dict:
        """Sanitizar datos para logs (remover secretos)"""
        sensitive_keys = ['token', 'password', 'secret', 'key', 'api_key', 'webhook_secret']
        sanitized = {}

        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = '***REDACTED***'
            elif isinstance(value, dict):
                sanitized[key] = SecurityValidator.sanitize_log_data(value)
            else:
                sanitized[key] = value

        return sanitized

    @staticmethod
    def validate_command_permissions(ctx: commands.Context, required_role: str = None) -> bool:
        """
        Validar permisos para ejecutar comando
        required_role: 'admin', 'staff', 'owner', None (cualquiera)
        """
        if required_role is None:
            return True

        if required_role == 'owner':
            return SecurityValidator.is_guild_owner(ctx)

        if required_role == 'admin':
            return (
                SecurityValidator.is_guild_owner(ctx) or
                SecurityValidator.validate_admin_role(ctx.author) or
                ctx.author.guild_permissions.administrator
            )

        if required_role == 'staff':
            return (
                SecurityValidator.is_guild_owner(ctx) or
                SecurityValidator.validate_admin_role(ctx.author) or
                SecurityValidator.validate_staff_role(ctx.author) or
                ctx.author.guild_permissions.administrator
            )

        return False

def check_permissions(required_role: str = None):
    """Decorator para verificar permisos"""
    def predicate(ctx):
        return SecurityValidator.validate_command_permissions(ctx, required_role)
    return commands.check(predicate)
