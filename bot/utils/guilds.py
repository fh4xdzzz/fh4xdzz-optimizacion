"""Helpers para limitar el bot al servidor oficial configurado."""

from config.settings import config
from utils.logger import logger


def configured_guild_id():
    """Devolver el ID configurado como entero o ``None`` si es inválido."""
    value = config.DISCORD_GUILD_ID
    if not value:
        logger.error("DISCORD_GUILD_ID no está configurado; se ignoran operaciones de servidor")
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        logger.error("DISCORD_GUILD_ID no es válido: %r", value)
        return None


def is_configured_guild(guild):
    """Indicar si un servidor es el servidor oficial del bot."""
    guild_id = configured_guild_id()
    return bool(guild and guild_id and guild.id == guild_id)


def get_configured_guild(bot):
    """Resolver exclusivamente el servidor oficial, sin usar otro como respaldo."""
    guild_id = configured_guild_id()
    return bot.get_guild(guild_id) if guild_id else None
