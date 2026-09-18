-- =====================================================
-- Arreglar trigger de order_number para evitar duplicados
-- =====================================================
-- El problema es que el trigger puede generar números duplicados
-- Vamos a mejorarlo para usar un enfoque más robusto

-- Modificar la función para usar un número aleatorio más grande
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    base_num TEXT;
    counter INTEGER;
    attempts INTEGER := 0;
    max_attempts INTEGER := 10;
    final_order_number TEXT;
BEGIN
    base_num := 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Intentar generar un número único hasta 10 veces
    WHILE attempts < max_attempts LOOP
        SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 8) AS INTEGER)), 0) + 1
        INTO counter
        FROM public.orders
        WHERE order_number LIKE base_num || '%';
        
        final_order_number := base_num || LPAD(counter::TEXT, 4, '0');
        
        -- Verificar si este número ya existe
        IF NOT EXISTS (
            SELECT 1 FROM public.orders 
            WHERE order_number = final_order_number
        ) THEN
            NEW.order_number := final_order_number;
            RETURN NEW;
        END IF;
        
        attempts := attempts + 1;
    END LOOP;
    
    -- Si después de 10 intentos no encontramos un número único,
    -- usar un componente aleatorio para garantizar unicidad
    final_order_number := base_num || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
    NEW.order_number := final_order_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reactivar el trigger
DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Verificar el trigger
SELECT 
    'Trigger de order_number actualizado' as status;