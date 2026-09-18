-- Políticas de Row Level Security (RLS) para el sistema de chat
-- Implementa seguridad basada en roles: client, staff, admin, owner

-- Habilitar RLS en todas las tablas
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA CHAT_SESSIONS
-- =====================================================

-- Clientes: Solo pueden ver sus propias sesiones
CREATE POLICY "clients_view_own_sessions"
  ON public.chat_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
      AND id = client_id
    )
  );

-- Clientes: Solo pueden crear sus propias sesiones
CREATE POLICY "clients_create_own_sessions"
  ON public.chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
      AND id = client_id
    )
  );

-- Staff: Puede ver todas las sesiones
CREATE POLICY "staff_view_all_sessions"
  ON public.chat_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Staff: Puede reclamar sesiones (cambiar assigned_agent_id)
CREATE POLICY "staff_claim_sessions"
  ON public.chat_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Admin/Owner: Puede ver todas las sesiones
CREATE POLICY "admin_view_all_sessions"
  ON public.chat_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Admin/Owner: Puede modificar cualquier sesión
CREATE POLICY "admin_modify_all_sessions"
  ON public.chat_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Admin/Owner: Puede eliminar cualquier sesión
CREATE POLICY "admin_delete_all_sessions"
  ON public.chat_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- POLÍTICAS PARA CHAT_MESSAGES
-- =====================================================

-- Clientes: Solo pueden ver mensajes de sus propias sesiones
CREATE POLICY "clients_view_own_messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id
      AND client_id = auth.uid()
    )
  );

-- Clientes: Solo pueden enviar mensajes a sus propias sesiones
CREATE POLICY "clients_send_own_messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id
      AND client_id = auth.uid()
    )
  );

-- Staff: Puede ver mensajes de todas las sesiones
CREATE POLICY "staff_view_all_messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Staff: Puede enviar mensajes a cualquier sesión
CREATE POLICY "staff_send_messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Staff: Puede marcar mensajes como leídos
CREATE POLICY "staff_mark_messages_read"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Admin/Owner: Puede eliminar mensajes
CREATE POLICY "admin_delete_messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- POLÍTICAS PARA CHAT_ATTACHMENTS
-- =====================================================

-- Clientes: Solo pueden ver archivos de sus propias sesiones
CREATE POLICY "clients_view_own_attachments"
  ON public.chat_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id
      AND client_id = auth.uid()
    )
  );

-- Clientes: Solo pueden subir archivos a sus propias sesiones
CREATE POLICY "clients_upload_own_attachments"
  ON public.chat_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id
      AND client_id = auth.uid()
    )
  );

-- Staff: Puede ver todos los archivos
CREATE POLICY "staff_view_all_attachments"
  ON public.chat_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Staff: Puede subir archivos a cualquier sesión
CREATE POLICY "staff_upload_attachments"
  ON public.chat_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- =====================================================
-- POLÍTICAS PARA CHAT_RATINGS
-- =====================================================

-- Clientes: Solo pueden ver sus propias calificaciones
CREATE POLICY "clients_view_own_ratings"
  ON public.chat_ratings FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
    )
  );

-- Clientes: Solo pueden crear calificaciones para sus propias sesiones
CREATE POLICY "clients_create_own_ratings"
  ON public.chat_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id
      AND client_id = auth.uid()
    )
  );

-- Staff: Puede ver todas las calificaciones
CREATE POLICY "staff_view_all_ratings"
  ON public.chat_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- =====================================================
-- POLÍTICAS PARA CANNED_RESPONSES
-- =====================================================

-- Staff: Puede ver todas las respuestas rápidas
CREATE POLICY "staff_view_canned_responses"
  ON public.canned_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Staff: Puede crear respuestas rápidas
CREATE POLICY "staff_create_canned_responses"
  ON public.canned_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Staff: Puede actualizar respuestas rápidas
CREATE POLICY "staff_update_canned_responses"
  ON public.canned_responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Admin/Owner: Puede eliminar respuestas rápidas
CREATE POLICY "admin_delete_canned_responses"
  ON public.canned_responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- POLÍTICAS PARA INTERNAL_NOTES
-- =====================================================

-- Staff: Puede ver notas de cualquier cliente
CREATE POLICY "staff_view_internal_notes"
  ON public.internal_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Staff: Puede crear notas internas
CREATE POLICY "staff_create_internal_notes"
  ON public.internal_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- =====================================================
-- POLÍTICAS PARA CHAT_AUDIT_LOGS
-- =====================================================

-- Staff: Puede ver logs de auditoría
CREATE POLICY "staff_view_audit_logs"
  ON public.chat_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- =====================================================
-- FUNCIÓN DE AYUDA PARA VERIFICAR ROL
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA ACTUALIZAR ESTADO DE AGENTE EN USERS
-- =====================================================

-- Staff: Puede actualizar su propio estado online/offline
CREATE POLICY "staff_update_own_status"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  )
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Admin/Owner: Puede actualizar cualquier estado de agente
CREATE POLICY "admin_update_agent_status"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );
