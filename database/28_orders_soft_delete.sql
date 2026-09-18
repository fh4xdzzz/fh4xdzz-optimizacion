-- =====================================================
-- Implementar Soft Deletes para la tabla orders
-- Esto permite que los cambios en tiempo real funcionen
-- correctamente con RLS habilitado
-- =====================================================

-- Agregar campo deleted_at para soft deletes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Crear índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at) WHERE deleted_at IS NOT NULL;

-- Actualizar la función de eliminación para usar soft delete
CREATE OR REPLACE FUNCTION delete_order_soft(order_id UUID, user_id UUID, user_role TEXT)
RETURNS JSONB AS $$
DECLARE
  order_record RECORD;
BEGIN
  -- Verificar permisos
  IF user_role NOT IN ('admin', 'staff', 'owner') THEN
    RAISE EXCEPTION 'Solo admin, staff y owner pueden eliminar pedidos';
  END IF;

  -- Obtener el pedido para verificar
  SELECT * INTO order_record FROM public.orders WHERE id = order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  -- Soft delete: marcar como eliminado en lugar de borrar
  UPDATE public.orders 
  SET deleted_at = NOW() 
  WHERE id = order_id;

  -- Retornar el pedido eliminado
  RETURN row_to_json(order_record)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar la configuración
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
AND column_name = 'deleted_at';
