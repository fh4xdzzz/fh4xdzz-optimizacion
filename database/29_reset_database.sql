-- =====================================================
-- LIMPIEZA COMPLETA DE BASE DE DATOS
-- Este script elimina todos los datos para implementar
-- autenticación solo con Discord
-- =====================================================

-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos
-- Ejecutar solo si estás seguro

-- Eliminar chats (debido a restricciones de clave foránea)
DELETE FROM public.chat_messages;
DELETE FROM public.chat_audit_logs;
DELETE FROM public.chat_sessions;

-- Eliminar pedidos
DELETE FROM public.order_events;
DELETE FROM public.orders;

-- Eliminar servicios (si se desea reiniciar)
-- DELETE FROM public.services;

-- Eliminar usuarios
DELETE FROM public.users;

-- Verificar que las tablas estén vacías
SELECT 
  'chat_messages' as table_name, COUNT(*) as count FROM public.chat_messages
UNION ALL
SELECT 
  'chat_audit_logs' as table_name, COUNT(*) as count FROM public.chat_audit_logs
UNION ALL
SELECT 
  'chat_sessions' as table_name, COUNT(*) as count FROM public.chat_sessions
UNION ALL
SELECT 
  'order_events' as table_name, COUNT(*) as count FROM public.order_events
UNION ALL
SELECT 
  'orders' as table_name, COUNT(*) as count FROM public.orders
UNION ALL
SELECT 
  'users' as table_name, COUNT(*) as count FROM public.users;
