"""
Role Sync - Sincronización de roles entre Discord y Supabase
"""

import asyncio
import unicodedata
import discord
from discord.ext import commands, tasks
from typing import Optional
from database.supabase_client import get_supabase_client
from utils.logger import logger
from utils.guilds import get_configured_guild, is_configured_guild


# Supabase usa cuatro niveles de acceso. Discord puede tener varios roles
# operativos dentro del mismo nivel (por ejemplo, Moderador y Soporte son
# miembros del equipo, pero no administradores de la web).
DISCORD_TO_SUPABASE_ROLES = (
    (('Owner',), 'owner'),
    (('Administrador', 'Admin', 'Administrator'), 'admin'),
    (('Moderador', 'Staff', 'Soporte'), 'staff'),
    (('Cliente', 'Clientes', 'Miembro'), 'client'),
)

SUPABASE_TO_DISCORD_ROLES = {
    'owner': ('Owner',),
    'admin': ('Administrador', 'Admin', 'Administrator'),
    'staff': ('Staff', 'Moderador', 'Soporte'),
    'client': ('Cliente', 'Clientes', 'Miembro'),
}


def normalized_discord_name(value):
    """Ignorar emojis, separadores y mayúsculas usados para decorar nombres."""
    compatible_text = unicodedata.normalize('NFKD', value).casefold()
    return ''.join(character for character in compatible_text if character.isalnum())


def supabase_role_for_discord_roles(role_names):
    """Devolver el nivel web más alto representado por los roles de Discord."""
    normalized = {name.casefold() for name in role_names}
    for aliases, supabase_role in DISCORD_TO_SUPABASE_ROLES:
        if any(alias.casefold() in normalized for alias in aliases):
            return supabase_role
    return None


def discord_role_candidates(supabase_role):
    """Nombres válidos, en orden de preferencia, para un nivel de la web."""
    return SUPABASE_TO_DISCORD_ROLES.get(supabase_role, ())

class RoleSync(commands.Cog):
    """Sincronización de roles entre Discord y Supabase"""

    def __init__(self, bot):
        self.bot = bot
        self.supabase = get_supabase_client()
        self._sync_lock = asyncio.Lock()
        self._prepared_client_areas = set()
        self.reconcile_web_roles.start()

    def cog_unload(self):
        self.reconcile_web_roles.cancel()

    @staticmethod
    def _find_role(guild: discord.Guild, candidate_names):
        """Buscar un rol sin depender de mayúsculas o acentos visuales."""
        candidates = {normalized_discord_name(name) for name in candidate_names}
        return next(
            (role for role in guild.roles if normalized_discord_name(role.name) in candidates),
            None,
        )

    async def _assign_role_from_record(self, member: discord.Member, user_data: dict) -> bool:
        """Aplicar a un miembro el rol que tiene guardado en la web."""
        candidate_names = discord_role_candidates(user_data.get('role'))
        if not candidate_names:
            return False

        current_names = {normalized_discord_name(role.name) for role in member.roles}
        if any(normalized_discord_name(name) in current_names for name in candidate_names):
            return False

        target_role = self._find_role(member.guild, candidate_names)
        if not target_role:
            logger.warning(
                "No existe un rol Discord compatible para el nivel %s en %s: %s",
                user_data.get('role'),
                member.guild.name,
                ', '.join(candidate_names),
            )
            return False

        bot_member = member.guild.me
        if not bot_member or not bot_member.guild_permissions.manage_roles:
            logger.warning("El bot no tiene Gestionar roles en %s", member.guild.name)
            return False
        if target_role >= bot_member.top_role:
            logger.warning(
                "No se puede asignar %s: el rol del bot debe estar por encima en %s",
                target_role.name,
                member.guild.name,
            )
            return False

        await member.add_roles(
            target_role,
            reason="Sincronización automática con la cuenta de TheDulcanDesign",
        )
        logger.info(
            "Rol %s asignado automáticamente a %s (%s)",
            target_role.name,
            member,
            member.id,
        )
        return True

    async def sync_member_from_web(self, member: discord.Member) -> bool:
        """Consultar una cuenta vinculada y sincronizarla sin bloquear el bot."""
        if member.bot or not self.supabase.enabled:
            return False
        user_data = await asyncio.to_thread(
            self.supabase.get_user_by_discord_id,
            str(member.id),
        )
        return bool(user_data) and await self._assign_role_from_record(member, user_data)

    async def sync_guild_from_web(self, guild: discord.Guild) -> int:
        """Reconciliar en una sola consulta todos los miembros vinculados."""
        if not self.supabase.enabled:
            return 0

        all_users = await asyncio.to_thread(
            self.supabase.get_users_with_discord,
        )

        users_by_discord_id = {
            str(user['discord_id']): user
            for user in all_users
            if user.get('discord_id') and user.get('role')
        }
        synced_count = 0
        for member in guild.members:
            user_data = users_by_discord_id.get(str(member.id))
            if user_data and await self._assign_role_from_record(member, user_data):
                synced_count += 1
        return synced_count

    async def ensure_client_area(self, guild: discord.Guild):
        """Reparar una vez el área privada que hace visible la categoría CLIENTES."""
        if guild.id in self._prepared_client_areas:
            return

        self._prepared_client_areas.add(guild.id)
        category = next(
            (item for item in guild.categories if normalized_discord_name(item.name) == 'clientes'),
            None,
        )
        client_role = self._find_role(guild, ('Cliente', 'Clientes'))
        bot_member = guild.me
        if not category or not client_role or not bot_member:
            logger.warning(
                "No se pudo preparar CLIENTES en %s: categoría, rol o miembro del bot ausente",
                guild.name,
            )
            return

        if bot_member.guild_permissions.manage_roles and client_role < bot_member.top_role and not client_role.hoist:
            await client_role.edit(
                hoist=True,
                reason="Mostrar clientes verificados en su grupo",
            )

        team_role_names = {'owner', 'administrador', 'admin', 'moderador', 'staff', 'soporte'}
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            bot_member: discord.PermissionOverwrite(
                view_channel=True,
                read_message_history=True,
                send_messages=True,
            ),
            client_role: discord.PermissionOverwrite(
                view_channel=True,
                read_message_history=True,
                send_messages=True,
                embed_links=True,
                attach_files=True,
            ),
        }
        for role in guild.roles:
            if normalized_discord_name(role.name) in team_role_names:
                overwrites[role] = discord.PermissionOverwrite(
                    view_channel=True,
                    read_message_history=True,
                    send_messages=True,
                )

        channel = next(
            (item for item in category.text_channels if item.name.casefold() == 'zona-clientes'),
            None,
        )
        if channel:
            if bot_member.guild_permissions.manage_channels:
                await channel.edit(
                    overwrites=overwrites,
                    topic="Área privada para clientes verificados de TheDulcanDesign",
                    reason="Reparar acceso del área de clientes",
                )
            return

        if not bot_member.guild_permissions.manage_channels:
            logger.warning("El bot no tiene Gestionar canales para completar CLIENTES en %s", guild.name)
            return

        channel = await category.create_text_channel(
            name='zona-clientes',
            topic="Área privada para clientes verificados de TheDulcanDesign",
            overwrites=overwrites,
            reason="Completar el área privada de clientes",
        )
        embed = discord.Embed(
            title="🌟 Área privada de clientes",
            description=(
                "Bienvenido a tu espacio exclusivo de TheDulcanDesign. "
                "Aquí encontrarás novedades, atención y recursos para clientes verificados."
            ),
            color=0x2ecc71,
        )
        embed.add_field(
            name="Accesos rápidos",
            value="Usa `/mispedidos` para consultar tus compras y `/soporte` cuando necesites ayuda.",
            inline=False,
        )
        embed.set_footer(text="TheDulcanDesign · Clientes")
        await channel.send(embed=embed)
        logger.info("Canal privado #zona-clientes creado en %s", guild.name)

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        """Dar el rol al entrar si la cuenta de Discord ya está vinculada."""
        if not is_configured_guild(member.guild):
            return
        try:
            await self.sync_member_from_web(member)
        except Exception as error:
            logger.error("No se pudo sincronizar al nuevo miembro %s: %s", member.id, error)

    @tasks.loop(minutes=1)
    async def reconcile_web_roles(self):
        """Cubrir cuentas que se vincularon después de entrar al servidor."""
        if self._sync_lock.locked():
            return
        async with self._sync_lock:
            guild = get_configured_guild(self.bot)
            for guild in [guild] if guild else []:
                try:
                    await self.ensure_client_area(guild)
                    if not self.supabase.enabled:
                        continue
                    synced_count = await self.sync_guild_from_web(guild)
                    if synced_count:
                        logger.info(
                            "Sincronización automática web→Discord en %s: %s actualizados",
                            guild.name,
                            synced_count,
                        )
                except Exception as error:
                    logger.error("Error sincronizando roles en %s: %s", guild.name, error)

    @reconcile_web_roles.before_loop
    async def before_reconcile_web_roles(self):
        await self.bot.wait_until_ready()

    @commands.command(name='sync-discord')
    @commands.has_permissions(administrator=True)
    async def sync_discord_account(self, ctx, user_id: Optional[str] = None):
        """Sincronizar cuenta de Discord con Supabase: !sync-discord [user_id]"""
        try:
            # Si no se proporciona user_id, usar el del usuario
            target_user_id = user_id or str(ctx.author.id)
            discord_user = ctx.guild.get_member(int(target_user_id))

            if not discord_user:
                await ctx.send("❌ Usuario no encontrado en el servidor")
                return

            # Buscar usuario en Supabase por Discord ID
            user_data = self.supabase.get_user_by_discord_id(target_user_id)

            if user_data:
                # Usuario ya vinculado
                await ctx.send(f"✅ Usuario ya vinculado: {user_data.get('email', 'N/A')}")
                return

            # Crear usuario en Supabase si no existe
            # Nota: Esto requiere que el usuario se haya registrado en la web primero
            await ctx.send("⚠️ El usuario debe registrarse en la web primero para vincular su cuenta de Discord")

        except Exception as e:
            logger.error(f"Error en sync-discord: {e}")
            await ctx.send(f"❌ Error: {str(e)}")

    @commands.command(name='sync-roles')
    @commands.has_permissions(administrator=True)
    async def sync_roles_to_supabase(self, ctx):
        """Sincronizar roles de Discord a Supabase"""
        try:
            if not self.supabase.enabled:
                await ctx.send("❌ Supabase no está configurado")
                return

            synced_count = 0

            for member in ctx.guild.members:
                # Buscar usuario en Supabase por Discord ID
                user_data = self.supabase.get_user_by_discord_id(str(member.id))

                if user_data:
                    # Determinar rol más alto del usuario
                    member_roles = [role.name for role in member.roles if role.name != '@everyone']
                    highest_role = supabase_role_for_discord_roles(member_roles)

                    if highest_role and user_data.get('role') != highest_role:
                        # Actualizar rol en Supabase
                        self.supabase._request('PATCH', 'users', 
                            data={'role': highest_role}, 
                            table_id=user_data['id'])
                        synced_count += 1

            await ctx.send(f"✅ Sincronización completada. {synced_count} roles actualizados")
            logger.info(f"Sincronización de roles completada por {ctx.author}: {synced_count} actualizados")

        except Exception as e:
            logger.error(f"Error en sync-roles: {e}")
            await ctx.send(f"❌ Error: {str(e)}")

    @commands.command(name='sync-web-to-discord')
    @commands.has_permissions(administrator=True)
    async def sync_web_to_discord(self, ctx):
        """Sincronizar roles de Supabase a Discord"""
        try:
            if not self.supabase.enabled:
                await ctx.send("❌ Supabase no está configurado")
                return

            synced_count = await self.sync_guild_from_web(ctx.guild)

            await ctx.send(f"✅ Sincronización completada. {synced_count} roles actualizados en Discord")
            logger.info(f"Sincronización web→Discord completada por {ctx.author}: {synced_count} actualizados")

        except Exception as e:
            logger.error(f"Error en sync-web-to-discord: {e}")
            await ctx.send(f"❌ Error: {str(e)}")

async def setup(bot):
    await bot.add_cog(RoleSync(bot))
