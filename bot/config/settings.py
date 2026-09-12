import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Bot configuration"""
    
    # Discord
    DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
    DISCORD_CLIENT_ID = os.getenv('DISCORD_CLIENT_ID')
    DISCORD_GUILD_ID = os.getenv('DISCORD_GUILD_ID')
    DISCORD_STAFF_ROLE_ID = os.getenv('DISCORD_STAFF_ROLE_ID')
    DISCORD_ADMIN_ROLE_ID = os.getenv('DISCORD_ADMIN_ROLE_ID')
    
    # Bot
    BOT_PREFIX = os.getenv('BOT_PREFIX', '!')
    BOT_DESCRIPTION = os.getenv('BOT_DESCRIPTION', 'FH4XDZzz OPTIMIZACION Bot')
    
    # Colors
    COLOR_PRIMARY = 0x3b82f6  # Blue
    COLOR_SECONDARY = 0x8b5cf6  # Purple
    COLOR_SUCCESS = 0x10b981  # Green
    COLOR_ERROR = 0xef4444  # Red
    COLOR_WARNING = 0xf59e0b  # Orange

config = Config()