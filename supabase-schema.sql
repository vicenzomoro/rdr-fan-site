-- ============================================================
-- RDR Fan Site - Schema Supabase
-- Execute no Supabase: SQL Editor > New query > Cole e rode
-- ============================================================
--
-- Depois de rodar:
-- 1. Storage > bucket "downloads": suba o APK (rdr-fan-site-app.apk).
-- 2. Clique no arquivo > "Get URL" e use em app-download-config.json:
--    {"apkUrl": "https://SEU_PROJECT.supabase.co/storage/v1/object/public/downloads/rdr-fan-site-app.apk"}
-- ============================================================

-- ---------- TABELAS ----------

-- Usuários (login/registro)
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários (relatos)
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback (voz do acampamento)
CREATE TABLE IF NOT EXISTS public.feedback (
  id BIGSERIAL PRIMARY KEY,
  username TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perguntas (mural de dúvidas)
CREATE TABLE IF NOT EXISTS public.questions (
  id BIGSERIAL PRIMARY KEY,
  author TEXT,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Submissões de mods (aguardam aprovação)
CREATE TABLE IF NOT EXISTS public.mod_submissions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  username TEXT,
  link TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notificações (sino para o usuário)
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de segurança (tentativas de acesso admin)
CREATE TABLE IF NOT EXISTS public.security_logs (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT,
  device TEXT,
  password_attempt TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- ÍNDICES (opcional, melhora consultas) ----------
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_submissions_approved ON public.mod_submissions(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_notifications_username ON public.notifications(username);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(username, is_read) WHERE is_read = false;

-- ---------- STORAGE (buckets para arquivos) ----------
-- Bucket "mods": arquivos de mods enviados pelos usuários (já usado pelo código)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mods',
  'mods',
  true,
  52428800,
  ARRAY['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket "downloads": APK do app (para link no site)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'downloads',
  'downloads',
  true,
  104857600,
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: leitura pública para mods e downloads
CREATE POLICY "Public read mods"
ON storage.objects FOR SELECT
USING (bucket_id = 'mods');

CREATE POLICY "Public read downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'downloads');

-- Upload/delete em "mods" e "downloads": feito pelo backend (service_role).
-- Se der erro de policy ao subir arquivo, no Dashboard: Storage > bucket > Policies,
-- adicione policy de INSERT para authenticated ou service_role conforme sua API.

-- ---------- RLS (Row Level Security) ----------
-- Ative RLS nas tabelas; o backend usa service_role e ignora RLS.
-- Assim, acesso direto pelo cliente (anon) fica bloqueado.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mod_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Políticas que permitem tudo para service_role (backend).
-- Para anon/authenticated, não crie policy = sem acesso direto (uso só pela API).
CREATE POLICY "Service role full access users"
ON public.users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access comments"
ON public.comments FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access feedback"
ON public.feedback FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access questions"
ON public.questions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access mod_submissions"
ON public.mod_submissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access notifications"
ON public.notifications FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access security_logs"
ON public.security_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
