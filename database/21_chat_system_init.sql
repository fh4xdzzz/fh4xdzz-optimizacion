-- Sistema de Chat de Soporte Profesional para TheDulcanDesign
-- Extiende la tabla users existente y crea tablas para el sistema de chat

-- Habilitar extensión pgcrypto para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear tipos enumerados para el sistema de chat
CREATE TYPE chat_status AS ENUM ('waiting', 'active', 'pending', 'closed', 'spam');
CREATE TYPE chat_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE message_type AS ENUM ('text', 'attachment', 'system');

-- Extender la tabla users existente con campos de soporte
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS vip_level INTEGER NOT NULL DEFAULT 0 CHECK (vip_level BETWEEN 0 AND 2),
ADD COLUMN IF NOT EXISTS is_support_agent BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS online BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accepting_chats BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_concurrent_chats INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{es}',
ADD COLUMN IF NOT EXISTS specializations TEXT[] NOT NULL DEFAULT '{general}',
ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;

-- Tabla de sesiones de chat
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_number VARCHAR(20) UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status chat_status NOT NULL DEFAULT 'waiting',
  priority chat_priority NOT NULL DEFAULT 'normal',
  language VARCHAR(10) NOT NULL DEFAULT 'es',
  subject TEXT NOT NULL DEFAULT 'Soporte',
  service_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.users(id),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_response_at TIMESTAMPTZ,
  resolution_time_seconds INTEGER
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'admin', 'staff', 'owner')),
  message TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de calificaciones de soporte
CREATE TABLE IF NOT EXISTS public.chat_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

-- Tabla de respuestas rápidas (canned responses)
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de notas internas del cliente
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de auditoría de acciones de chat
CREATE TABLE IF NOT EXISTS public.chat_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'CHAT_CREATED',
    'CHAT_CLAIMED',
    'CHAT_TRANSFERRED',
    'CHAT_CLOSED',
    'CHAT_REOPENED',
    'PRIORITY_CHANGED',
    'AGENT_STATUS_CHANGED',
    'NOTE_CREATED',
    'MESSAGE_DELETED'
  )),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client_id ON public.chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_assigned_agent_id ON public.chat_sessions(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_priority ON public.chat_sessions(priority);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON public.chat_sessions(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_session_id ON public.chat_attachments(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id ON public.chat_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_internal_notes_client_id ON public.internal_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_session_id ON public.internal_notes(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_audit_logs_actor_id ON public.chat_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_chat_audit_logs_session_id ON public.chat_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_audit_logs_created_at ON public.chat_audit_logs(created_at DESC);

-- Función para generar número de conversación único
CREATE OR REPLACE FUNCTION generate_conversation_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'CHAT-' || LPAD(nextval('conversation_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Crear secuencia para números de conversación
CREATE SEQUENCE IF NOT EXISTS conversation_number_seq START 1;

-- Trigger para asignar número de conversación automáticamente
CREATE OR REPLACE FUNCTION assign_conversation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_number IS NULL OR NEW.conversation_number = '' THEN
    NEW.conversation_number := generate_conversation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_conversation_number
  BEFORE INSERT ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION assign_conversation_number();

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para actualizar last_message_at cuando se envía un mensaje
CREATE OR REPLACE FUNCTION update_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET last_message_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message_at
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_last_message_at();

-- Trigger para establecer first_response_at en el primer mensaje de un agente
CREATE OR REPLACE FUNCTION set_first_response_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_role IN ('admin', 'staff', 'owner') THEN
    UPDATE public.chat_sessions
    SET first_response_at = NEW.created_at
    WHERE id = NEW.session_id
    AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_first_response_at
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_first_response_at();

-- Función para calcular tiempo de resolución
CREATE OR REPLACE FUNCTION calculate_resolution_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.resolution_time_seconds := EXTRACT(EPOCH FROM (NEW.closed_at - NEW.created_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_resolution_time
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_resolution_time();
