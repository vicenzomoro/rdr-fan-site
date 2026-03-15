-- ============================================================
-- RDR Fan Site - Schema Supabase COMPLETO (v2.0)
-- Execute no Supabase: SQL Editor > New query > Cole e rode
-- ============================================================
-- ATENÇÃO: Isso vai adicionar NOVAS tabelas e colunas ao schema existente.
-- Tabelas existentes serão preservadas e atualizadas.
-- ============================================================

-- ========== ATUALIZAÇÕES NAS TABELAS EXISTENTES ==========

-- Adicionar colunas extras em users para perfil completo
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mods INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_donations DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following INTEGER DEFAULT 0;

-- Adicionar sistema de temas (dark/light)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';

-- Adicionar rating e downloads em mod_submissions
ALTER TABLE public.mod_submissions 
ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ========== NOVAS TABELAS ==========

-- 1. GALERIA DE SCREENSHOTS
CREATE TABLE IF NOT EXISTS public.screenshots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'geral',
  tags TEXT[],
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Votos em screenshots
CREATE TABLE IF NOT EXISTS public.screenshot_votes (
  id BIGSERIAL PRIMARY KEY,
  screenshot_id BIGINT REFERENCES public.screenshots(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(screenshot_id, username)
);

-- 2. FÓRUM DE DISCUSSÃO
CREATE TABLE IF NOT EXISTS public.forum_topics (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id BIGINT REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  is_accepted BOOLEAN DEFAULT false,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SISTEMA DE CONQUISTAS
CREATE TABLE IF NOT EXISTS public.achievements (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  category TEXT DEFAULT 'geral',
  points INTEGER DEFAULT 10,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  achievement_id BIGINT REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- 4. NOTÍCIAS/ATUALIZAÇÕES
CREATE TABLE IF NOT EXISTS public.news (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Admin',
  cover_image TEXT,
  category TEXT DEFAULT 'geral',
  tags TEXT[],
  views INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. GUIA DE INSTALAÇÃO DE MODS (WIKI)
CREATE TABLE IF NOT EXISTS public.mod_guides (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  difficulty TEXT DEFAULT 'facil' CHECK (difficulty IN ('facil', 'medio', 'dificil')),
  estimated_time TEXT,
  author TEXT,
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AVALIAÇÕES DE MODS
CREATE TABLE IF NOT EXISTS public.mod_reviews (
  id BIGSERIAL PRIMARY KEY,
  mod_id BIGINT REFERENCES public.mod_submissions(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mod_id, username)
);

-- 7. SEGUIDORES DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.user_follows (
  id BIGSERIAL PRIMARY KEY,
  follower_username TEXT NOT NULL,
  following_username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_username, following_username)
);

-- 8. NEWSLETTER
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

-- 9. EVENTOS DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT DEFAULT 'competicao' CHECK (event_type IN ('competicao', 'desafio', 'encontro', 'lancamento')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  prize TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'ativo', 'encerrado', 'cancelado')),
  cover_image TEXT,
  rules TEXT,
  winners TEXT[],
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_participants (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES public.events(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  submission_url TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, username)
);

-- 10. WIKI/ENCICLOPÉDIA RDR
CREATE TABLE IF NOT EXISTS public.wiki_entries (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  entry_type TEXT DEFAULT 'personagem' CHECK (entry_type IN ('personagem', 'arma', 'local', 'missao', 'animal', 'item', 'gangue')),
  summary TEXT,
  cover_image TEXT,
  related_entries BIGINT[],
  views INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. SISTEMA DE DENÚNCIAS
CREATE TABLE IF NOT EXISTS public.reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_username TEXT NOT NULL,
  reported_username TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('comment', 'question', 'mod', 'screenshot', 'forum_topic', 'forum_reply', 'user')),
  content_id BIGINT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'resolvido', 'rejeitado')),
  moderator_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. LOAD ORDER / COMPARADOR DE MODS
CREATE TABLE IF NOT EXISTS public.mod_load_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mods_json JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. ATIVIDADE RECENTE DOS USUÁRIOS
CREATE TABLE IF NOT EXISTS public.user_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  content_type TEXT,
  content_id BIGINT,
  content_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========== ÍNDICES PARA PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_screenshots_approved ON public.screenshots(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_screenshots_votes ON public.screenshots(votes_up DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON public.forum_topics(category);
CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned ON public.forum_topics(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_wiki_entries_type ON public.wiki_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity(username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- ========== DADOS INICIAIS - CONQUISTAS ==========
INSERT INTO public.achievements (name, description, icon, category, points, rarity) VALUES
  ('Primeiros Passos', 'Crie sua conta no site', '🎯', 'inicio', 5, 'common'),
  ('Contador de Histórias', 'Publique seu primeiro relato', '📖', 'social', 10, 'common'),
  ('Modder Iniciante', 'Envie seu primeiro mod', '📦', 'mods', 15, 'common'),
  ('Apoiador', 'Faça sua primeira doação', '💰', 'doacao', 20, 'rare'),
  ('Explorador', 'Visite 10 páginas diferentes', '🗺️', 'exploracao', 10, 'common'),
  ('Popular', 'Receba 50 curtidas em screenshots', '⭐', 'social', 25, 'rare'),
  ('Lendário', 'Seja o maior doador do mês', '👑', 'doacao', 100, 'legendary'),
  ('Fórum Master', 'Crie 100 tópicos no fórum', '💬', 'forum', 50, 'epic'),
  ('Wiki Contributor', 'Ajude a editar 10 artigos da wiki', '📚', 'wiki', 30, 'rare'),
  ('Detetive', 'Resolva 25 dúvidas no mural', '🔍', 'ajuda', 25, 'rare'),
  ('Veterano', 'Esteja ativo por 1 ano', '🎖️', 'tempo', 75, 'epic'),
  ('Pistoleiro', 'Compartilhe 50 screenshots de ação', '🔫', 'screenshots', 40, 'rare'),
  ('Herói do Oeste', 'Tenha 100 seguidores', '🤠', 'social', 50, 'epic'),
  ('Colecionador', 'Baixe 100 mods diferentes', '📥', 'mods', 35, 'rare'),
  ('Crítico', 'Avalie 50 mods', '⭐', 'mods', 30, 'rare');

-- ========== BUCKETS DE STORAGE ADICIONAIS ==========
-- Screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Covers/thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Avatars de usuários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de leitura pública
CREATE POLICY "Public read screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'screenshots');

CREATE POLICY "Public read covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- ========== FUNÇÕES UTILITÁRIAS ==========

-- Função para atualizar contadores de usuário
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'comments' THEN
      UPDATE public.users SET total_comments = total_comments + 1
      WHERE username = NEW.author;
    ELSIF TG_TABLE_NAME = 'mod_submissions' AND NEW.is_approved THEN
      UPDATE public.users SET total_mods = total_mods + 1
      WHERE username = NEW.username;
    ELSIF TG_TABLE_NAME = 'donations' AND NEW.is_public THEN
      UPDATE public.users SET total_donations = total_donations + NEW.amount
      WHERE username = NEW.donor_name;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'comments' THEN
      UPDATE public.users SET total_comments = GREATEST(0, total_comments - 1)
      WHERE username = OLD.author;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Função específica para mods (suporta INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION update_user_stats_mods()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_approved THEN
    UPDATE public.users SET total_mods = total_mods + 1
    WHERE username = NEW.username;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_approved = false AND NEW.is_approved = true THEN
      UPDATE public.users SET total_mods = total_mods + 1
      WHERE username = NEW.username;
    ELSIF OLD.is_approved = true AND NEW.is_approved = false THEN
      UPDATE public.users SET total_mods = GREATEST(0, total_mods - 1)
      WHERE username = OLD.username;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.is_approved THEN
    UPDATE public.users SET total_mods = GREATEST(0, total_mods - 1)
    WHERE username = OLD.username;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular média de rating
CREATE OR REPLACE FUNCTION update_mod_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    UPDATE public.mod_submissions SET
      rating_avg = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.mod_reviews
        WHERE mod_id = COALESCE(NEW.mod_id, OLD.mod_id)
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM public.mod_reviews
        WHERE mod_id = COALESCE(NEW.mod_id, OLD.mod_id)
      )
    WHERE id = COALESCE(NEW.mod_id, OLD.mod_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ========== TRIGGERS ==========

-- Triggers para stats de usuário
DROP TRIGGER IF EXISTS trg_user_stats_comments ON public.comments;
CREATE TRIGGER trg_user_stats_comments
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_user_stats();

DROP TRIGGER IF EXISTS trg_user_stats_mods ON public.mod_submissions;
CREATE TRIGGER trg_user_stats_mods
  AFTER INSERT OR UPDATE OR DELETE ON public.mod_submissions
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_mods();

DROP TRIGGER IF EXISTS trg_mod_rating ON public.mod_reviews;
CREATE TRIGGER trg_mod_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.mod_reviews
  FOR EACH ROW EXECUTE FUNCTION update_mod_rating();

-- ========== VIEWS ÚTEIS ==========

-- Top doadores
CREATE OR REPLACE VIEW public.top_donors AS
SELECT 
  donor_name,
  SUM(amount) as total_donated,
  COUNT(*) as donation_count
FROM public.donations
WHERE is_public = true
GROUP BY donor_name
ORDER BY total_donated DESC
LIMIT 100;

-- Mods populares
CREATE OR REPLACE VIEW public.popular_mods AS
SELECT 
  m.*,
  u.username as author_name
FROM public.mod_submissions m
LEFT JOIN public.users u ON m.username = u.username
WHERE m.is_approved = true
ORDER BY m.download_count DESC, m.rating_avg DESC
LIMIT 50;

-- Screenshots em alta
CREATE OR REPLACE VIEW public.trending_screenshots AS
SELECT 
  s.*,
  u.avatar_url
FROM public.screenshots s
LEFT JOIN public.users u ON s.username = u.username
WHERE s.is_approved = true
ORDER BY s.votes_up DESC, s.views DESC
LIMIT 50;

-- ========== PERMISSÕES RLS ==========
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mod_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mod_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mod_load_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Policies para service_role (backend)
CREATE POLICY "Service role full access screenshots" ON public.screenshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access forum_topics" ON public.forum_topics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access forum_replies" ON public.forum_replies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access achievements" ON public.achievements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access user_achievements" ON public.user_achievements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access news" ON public.news FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access mod_guides" ON public.mod_guides FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access mod_reviews" ON public.mod_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access user_follows" ON public.user_follows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access newsletter" ON public.newsletter_subscribers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access events" ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access event_participants" ON public.event_participants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access wiki_entries" ON public.wiki_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access reports" ON public.reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access mod_load_orders" ON public.mod_load_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access user_activity" ON public.user_activity FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies de leitura pública para conteúdo aprovado
CREATE POLICY "Public read screenshots" ON public.screenshots FOR SELECT USING (is_approved = true);
CREATE POLICY "Public read forum_topics" ON public.forum_topics FOR SELECT USING (true);
CREATE POLICY "Public read forum_replies" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Public read news" ON public.news FOR SELECT USING (is_published = true);
CREATE POLICY "Public read mod_guides" ON public.mod_guides FOR SELECT USING (is_published = true);
CREATE POLICY "Public read mod_reviews" ON public.mod_reviews FOR SELECT USING (true);
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public read wiki_entries" ON public.wiki_entries FOR SELECT USING (is_published = true);

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
