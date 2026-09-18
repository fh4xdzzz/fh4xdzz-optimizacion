-- Configuración de Supabase Storage para archivos adjuntos del chat
-- Nota: Este SQL debe ejecutarse en el SQL Editor de Supabase después de crear el bucket manualmente

-- Crear bucket para archivos adjuntos del chat
-- Esto debe hacerse desde el panel de Supabase: Storage > New Bucket
-- Nombre del bucket: chat-attachments
-- Public: false (privado para seguridad)

-- Después de crear el bucket, ejecuta estas políticas:

-- Política para permitir a clientes subir archivos
CREATE POLICY "clients_upload_chat_attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
    )
  );

-- Política para permitir a clientes ver sus propios archivos
CREATE POLICY "clients_view_own_chat_attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
    )
  );

-- Política para permitir a staff ver todos los archivos
CREATE POLICY "staff_view_all_chat_attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Política para permitir a staff subir archivos
CREATE POLICY "staff_upload_chat_attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );

-- Política para permitir a staff eliminar archivos
CREATE POLICY "staff_delete_chat_attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Política para firmar URLs de descarga
CREATE POLICY "clients_download_own_chat_attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "staff_download_chat_attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('staff', 'admin', 'owner')
    )
  );
