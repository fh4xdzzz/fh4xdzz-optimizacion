import discord
from typing import Optional

def has_permissions(member: discord.Member, required_permissions: list) -> bool:
    """Verifica si un miembro tiene los permisos requeridos"""
    return all(perm in member.guild_permissions for perm in required_permissions)

def is_staff(member: discord.Member, staff_role_id: Optional[str]) -> bool:
    """Verifica si un miembro es staff"""
    if not staff_role_id:
        return False
    return any(role.id == int(staff_role_id) for role in member.roles)

def is_admin(member: discord.Member, admin_role_id: Optional[str]) -> bool:
    """Verifica si un miembro es admin"""
    if not admin_role_id:
        return False
    return any(role.id == int(admin_role_id) for role in member.roles)

def format_error(error: Exception) -> str:
    """Formatea errores para mostrar al usuario"""
    error_type = type(error).__name__
    error_msg = str(error)
    return f"❌ Error ({error_type}): {error_msg}"
