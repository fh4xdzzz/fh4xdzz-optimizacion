-- =====================================================
-- Verificar estado online de los usuarios
-- =====================================================

-- Verificar usuarios admin/staff/owner y su estado online
SELECT 
  id,
  full_name,
  role,
  online,
  accepting_chats,
  discord_avatar,
  avatar_url
FROM public.users
WHERE role IN ('admin', 'staff', 'owner')
ORDER BY role, full_name;

-- Verificar si hay usuarios con online=true que no deberían tenerlo
SELECT 
  id,
  full_name,
  role,
  online,
  accepting_chats
FROM public.users
WHERE online = true
ORDER BY role, full_name;
