import os
import sys
import discord
from discord.ext import commands
from dotenv import load_dotenv
from utils.logger import logger

# Load environment variables
load_dotenv()

# Check for required environment variables
TOKEN = os.getenv('DISCORD_BOT_TOKEN')
if not TOKEN:
    logger.error("ERROR: DISCORD_BOT_TOKEN not found in environment variables")
    sys.exit(1)

# Bot configuration
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(
    command_prefix=commands.when_mentioned_or('!'),
    intents=intents,
    description="FH4XDZzz OPTIMIZACION Bot",
    help_command=commands.DefaultHelpCommand()
)

@bot.event
async def on_ready():
    logger.info(f'✅ Bot logged in as {bot.user.name} (ID: {bot.user.id})')
    logger.info(f'📊 Connected to {len(bot.guilds)} guilds')
    logger.info('------')
    
    # Set bot status
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching,
            name="optimizaciones"
        ),
        status=discord.Status.online
    )

@bot.event
async def on_command_error(ctx, error):
    """Handle command errors"""
    if isinstance(error, commands.CommandNotFound):
        return
    elif isinstance(error, commands.MissingPermissions):
        await ctx.send("❌ No tienes permisos para usar este comando.")
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(f"❌ Faltan argumentos requeridos: {error.param.name}")
    else:
        logger.error(f"Error in command {ctx.command}: {error}")
        await ctx.send("❌ Ocurrió un error al ejecutar el comando.")

# Load cogs
async def load_extensions():
    """Load all cogs from the cogs directory"""
    for filename in os.listdir('./cogs'):
        if filename.endswith('.py') and filename != '__init__.py':
            try:
                await bot.load_extension(f'cogs.{filename[:-3]}')
                logger.info(f'✅ Loaded extension: cogs.{filename[:-3]}')
            except Exception as e:
                logger.error(f'❌ Failed to load extension {filename}: {e}')

@bot.event
async def setup_hook():
    """Setup hook to load extensions"""
    await load_extensions()

if __name__ == '__main__':
    try:
        bot.run(TOKEN)
    except KeyboardInterrupt:
        logger.info("🛑 Bot stopped by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")