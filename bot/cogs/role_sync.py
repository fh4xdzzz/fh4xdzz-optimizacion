"""
Role Sync - Sincronización de roles entre Discord y Supabase
"""

import discord
from discord.ext import commands
from typing import Optional
from database.supabase_client import get_supabase_client
from utils.logger import logger

class RoleSync(commands.Cog):
    """Sincronización de roles entre Discord y Supabase"""

    def __init__(self, bot):
        self.bot = bot
        self.supabase = get_supabase_client()

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

            # Mapeo de roles Discord a roles Supabase
            role_mapping = {
                'Admin': 'admin',
                'Staff': 'staff',
                'Cliente': 'client',
                'Miembro': 'client'
            }

            synced_count = 0

            for member in ctx.guild.members:
                # Buscar usuario en Supabase por Discord ID
                user_data = self.supabase.get_user_by_discord_id(str(member.id))

                if user_data:
                    # Determinar rol más alto del usuario
                    member_roles = [role.name for role in member.roles if role.name != '@everyone']
                    highest_role = None

                    for discord_role, supabase_role in role_mapping.items():
                        if discord_role in member_roles:
                            highest_role = supabase_role
                            break

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

            # Mapeo de roles Supabase a roles Discord
            role_mapping = {
                'admin': 'Admin',
                'staff': 'Staff',
                'client': 'Cliente'
            }

            # Obtener todos los usuarios de Supabase con Discord ID
            all_users = self.supabase._request('GET', 'users')

            if 'error' in all_users:
                await ctx.send("❌ Error obteniendo usuarios de Supabase")
                return

            synced_count = 0

            for user in all_users:
                discord_id = user.get('discord_id')
                supabase_role = user.get('role')

                if not discord_id or not supabase_role:
                    continue

                # Obtener miembro del servidor
                member = ctx.guild.get_member(int(discord_id))
                if not member:
                    continue

                # Obtener rol Discord correspondiente
                discord_role_name = role_mapping.get(supabase_role)
                if not discord_role_name:
                    continue

                discord_role = discord.utils.get(ctx.guild.roles, name=discord_role_name)
                if not discord_role:
                    continue

                # Agregar rol si no lo tiene
                if discord_role not in member.roles:
                    await member.add_roles(discord_role)
                    synced_count += 1

            await ctx.send(f"✅ Sincronización completada. {synced_count} roles actualizados en Discord")
            logger.info(f"Sincronización web→Discord completada por {ctx.author}: {synced_count} actualizados")

        except Exception as e:
            logger.error(f"Error en sync-web-to-discord: {e}")
            await ctx.send(f"❌ Error: {str(e)}")

async def setup(bot):
    await bot.add_cog(RoleSync(bot))
