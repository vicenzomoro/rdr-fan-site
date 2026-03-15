// API Complementar - Novas Funcionalidades
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

// Middleware Admin
const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization || req.body.token;
    const isAuthorized = token === MASTER_KEY || (supabaseKey && token === supabaseKey);
    if (isAuthorized) return next();
    res.status(401).json({ error: "Acesso negado." });
};

// ========== SCREENSHOTS ==========

router.get('/screenshots', async (req, res) => {
    try {
        const category = req.query.category || '';
        const sort = req.query.sort || 'votes';
        
        let query = supabase?.from('screenshots').select('*').eq('is_approved', true);
        
        if (category) query = query.eq('category', category);
        
        if (sort === 'votes') query = query.order('votes_up', { ascending: false });
        else if (sort === 'views') query = query.order('views', { ascending: false });
        else if (sort === 'newest') query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/screenshots', upload.single('image'), async (req, res) => {
    try {
        const { username, title, description, category, tags } = req.body;
        const file = req.file;
        
        let imageUrl = '';
        if (file) {
            const fileName = `${Date.now()}_${file.originalname}`;
            const { data: uploadData } = await supabase?.storage
                .from('screenshots')
                .upload(fileName, file.buffer, { contentType: file.mimetype });
            
            const { data: { publicUrl } } = supabase?.storage.from('screenshots').getPublicUrl(fileName);
            imageUrl = publicUrl;
        }
        
        const { data, error } = await supabase?.from('screenshots').insert([{
            username,
            title,
            description,
            image_url: imageUrl,
            category: category || 'geral',
            tags: tags ? JSON.parse(tags) : [],
            is_approved: true
        }]).select();
        
        if (error) throw error;
        
        res.json({ message: "uploaded", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/screenshots/:id/vote', async (req, res) => {
    try {
        const { username, vote_type } = req.body; // 'up' ou 'down'
        const screenshotId = req.params.id;
        
        // Verificar se já votou
        const { data: existingVote } = await supabase?.from('screenshot_votes')
            .select('*')
            .eq('screenshot_id', screenshotId)
            .eq('username', username)
            .single();
        
        if (existingVote) {
            // Atualizar voto
            await supabase?.from('screenshot_votes')
                .update({ vote_type })
                .eq('id', existingVote.id);
        } else {
            // Criar novo voto
            await supabase?.from('screenshot_votes').insert([{
                screenshot_id: screenshotId,
                username,
                vote_type
            }]);
        }
        
        // Recalcular votos
        const { data: votes } = await supabase?.from('screenshot_votes')
            .select('vote_type')
            .eq('screenshot_id', screenshotId);
        
        const votes_up = votes?.filter(v => v.vote_type === 'up').length || 0;
        const votes_down = votes?.filter(v => v.vote_type === 'down').length || 0;
        
        await supabase?.from('screenshots')
            .update({ votes_up, votes_down })
            .eq('id', screenshotId);
        
        res.json({ success: true, votes_up, votes_down });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/screenshots/:id/view', async (req, res) => {
    try {
        const { data: screenshot } = await supabase?.from('screenshots')
            .select('views')
            .eq('id', req.params.id)
            .single();
        
        if (screenshot) {
            await supabase?.from('screenshots')
                .update({ views: (screenshot.views || 0) + 1 })
                .eq('id', req.params.id);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== FÓRUM ==========

router.get('/forum/topics', async (req, res) => {
    try {
        const category = req.query.category || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        
        let query = supabase?.from('forum_topics').select('*');
        
        if (category) query = query.eq('category', category);
        
        query = query.order('is_pinned', { ascending: false })
                    .order('last_reply_at', { ascending: false, nullsFirst: false });
        
        const { data, error } = await query.range((page - 1) * limit).range(page * limit - 1);
        res.json({ data: data || [], page, total: data?.length || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/forum/topics/:id', async (req, res) => {
    try {
        const { data: topic, error } = await supabase?.from('forum_topics')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (error || !topic) return res.status(404).json({ error: 'Topico nao encontrado.' });
        
        // Incrementar views
        await supabase?.from('forum_topics')
            .update({ views: (topic.views || 0) + 1 })
            .eq('id', req.params.id);
        
        // Buscar replies
        const { data: replies } = await supabase?.from('forum_replies')
            .select('*')
            .eq('topic_id', req.params.id)
            .order('created_at', { ascending: true });
        
        res.json({ data: { ...topic, replies: replies || [] } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/forum/topics', async (req, res) => {
    try {
        const { user_id, username, title, content, category, tags } = req.body;
        
        const { data, error } = await supabase?.from('forum_topics').insert([{
            user_id,
            username,
            title,
            content,
            category: category || 'geral',
            tags: tags || [],
            last_reply_at: new Date().toISOString()
        }]).select();
        
        if (error) throw error;
        
        res.json({ message: "created", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/forum/topics/:id/reply', async (req, res) => {
    try {
        const { user_id, username, content, parent_id } = req.body;
        const topicId = req.params.id;
        
        const { data, error } = await supabase?.from('forum_replies').insert([{
            topic_id: topicId,
            user_id,
            username,
            content,
            parent_id: parent_id || null
        }]).select();
        
        if (error) throw error;
        
        // Atualizar tópico
        const { data: topic } = await supabase?.from('forum_topics')
            .select('replies_count')
            .eq('id', topicId)
            .single();
        
        await supabase?.from('forum_topics')
            .update({
                replies_count: (topic?.replies_count || 0) + 1,
                last_reply_at: new Date().toISOString(),
                last_reply_by: username
            })
            .eq('id', topicId);
        
        res.json({ message: "replied", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/forum/replies/:id/vote', async (req, res) => {
    try {
        const { vote } = req.body; // +1 ou -1
        const { data: reply } = await supabase?.from('forum_replies')
            .select('votes')
            .eq('id', req.params.id)
            .single();
        
        if (reply) {
            await supabase?.from('forum_replies')
                .update({ votes: (reply.votes || 0) + vote })
                .eq('id', req.params.id);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== CONQUISTAS ==========

router.get('/achievements', async (req, res) => {
    try {
        const { data } = await supabase?.from('achievements').select('*').order('points', { ascending: false });
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/achievements/user/:username', async (req, res) => {
    try {
        const { data } = await supabase?.from('user_achievements')
            .select('*, achievements(*)')
            .eq('username', req.params.username)
            .order('earned_at', { ascending: false });
        
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== NOTÍCIAS ==========

router.get('/news', async (req, res) => {
    try {
        const category = req.query.category || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        
        let query = supabase?.from('news').select('*').eq('is_published', true);
        
        if (category) query = query.eq('category', category);
        
        query = query.order('published_at', { ascending: false });
        
        const { data, error } = await query.range((page - 1) * limit).range(page * limit - 1);
        res.json({ data: data || [], page });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/news/:slug', async (req, res) => {
    try {
        const { data: news } = await supabase?.from('news')
            .select('*')
            .eq('slug', req.params.slug)
            .eq('is_published', true)
            .single();
        
        if (news) {
            await supabase?.from('news')
                .update({ views: (news.views || 0) + 1 })
                .eq('id', news.id);
        }
        
        res.json({ data: news || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== EVENTOS ==========

router.get('/events', async (req, res) => {
    try {
        const status = req.query.status || 'agendado';
        const { data } = await supabase?.from('events')
            .select('*')
            .eq('status', status)
            .order('start_date', { ascending: true });
        
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/events/:id', async (req, res) => {
    try {
        const { data: event } = await supabase?.from('events')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        const { data: participants } = await supabase?.from('event_participants')
            .select('username, joined_at, submission_url')
            .eq('event_id', req.params.id);
        
        res.json({ data: { ...event, participants: participants || [] } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/events/:id/join', async (req, res) => {
    try {
        const { username, submission_url } = req.body;
        
        const { data, error } = await supabase?.from('event_participants').insert([{
            event_id: parseInt(req.params.id),
            username,
            submission_url
        }]).select();
        
        if (error) throw error;
        
        // Atualizar contador
        const { data: event } = await supabase?.from('events')
            .select('current_participants')
            .eq('id', req.params.id)
            .single();
        
        await supabase?.from('events')
            .update({ current_participants: (event?.current_participants || 0) + 1 })
            .eq('id', req.params.id);
        
        res.json({ message: "joined", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== NEWSLETTER ==========

router.post('/newsletter/subscribe', async (req, res) => {
    try {
        const { email, username } = req.body;
        
        const { data, error } = await supabase?.from('newsletter_subscribers').insert([{
            email,
            username: username || null
        }]).select();
        
        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Email ja cadastrado.' });
            throw error;
        }
        
        res.json({ message: "subscribed", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/newsletter/unsubscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        await supabase?.from('newsletter_subscribers')
            .update({ 
                is_active: false,
                unsubscribed_at: new Date().toISOString()
            })
            .eq('email', email);
        
        res.json({ message: "unsubscribed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== WIKI ==========

router.get('/wiki', async (req, res) => {
    try {
        const type = req.query.type || '';
        const search = req.query.search || '';
        
        let query = supabase?.from('wiki_entries').select('*').eq('is_published', true);
        
        if (type) query = query.eq('entry_type', type);
        if (search) query = query.ilike('title', `%${search}%`);
        
        query = query.order('title', { ascending: true });
        
        const { data, error } = await query;
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/wiki/:slug', async (req, res) => {
    try {
        const { data: entry } = await supabase?.from('wiki_entries')
            .select('*')
            .eq('slug', req.params.slug)
            .eq('is_published', true)
            .single();
        
        if (entry) {
            await supabase?.from('wiki_entries')
                .update({ views: (entry.views || 0) + 1 })
                .eq('id', entry.id);
        }
        
        res.json({ data: entry || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== DENÚNCIAS ==========

router.post('/reports', async (req, res) => {
    try {
        const { reporter_username, reported_username, content_type, content_id, reason, description } = req.body;
        
        const { data, error } = await supabase?.from('reports').insert([{
            reporter_username,
            reported_username,
            content_type,
            content_id,
            reason,
            description: description || null,
            status: 'pendente'
        }]).select();
        
        if (error) throw error;
        
        res.json({ message: "reported", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/admin/reports', adminAuth, async (req, res) => {
    try {
        const status = req.query.status || 'pendente';
        const { data } = await supabase?.from('reports')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });
        
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admin/reports/:id/resolve', adminAuth, async (req, res) => {
    try {
        const { status, moderator_notes } = req.body;
        
        await supabase?.from('reports')
            .update({
                status,
                moderator_notes,
                resolved_by: 'admin',
                resolved_at: new Date().toISOString()
            })
            .eq('id', req.params.id);
        
        res.json({ message: "resolved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== LOAD ORDER ==========

router.get('/load-orders', async (req, res) => {
    try {
        const { data } = await supabase?.from('mod_load_orders')
            .select('*')
            .eq('is_public', true)
            .order('votes', { ascending: false });
        
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/load-orders', async (req, res) => {
    try {
        const { user_id, username, name, description, mods_json, is_public } = req.body;
        
        const { data, error } = await supabase?.from('mod_load_orders').insert([{
            user_id,
            username,
            name,
            description,
            mods_json,
            is_public: is_public || false
        }]).select();
        
        if (error) throw error;
        
        res.json({ message: "created", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== AVALIAÇÕES DE MODS ==========

router.get('/mods/:id/reviews', async (req, res) => {
    try {
        const { data } = await supabase?.from('mod_reviews')
            .select('*')
            .eq('mod_id', req.params.id)
            .order('created_at', { ascending: false });
        
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mods/:id/review', async (req, res) => {
    try {
        const { user_id, username, rating, comment } = req.body;
        
        const { data, error } = await supabase?.from('mod_reviews').insert([{
            mod_id: parseInt(req.params.id),
            user_id,
            username,
            rating,
            comment: comment || null
        }]).select();
        
        if (error) throw error;
        
        res.json({ message: "reviewed", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== SEGUIDORES ==========

router.get('/users/:username/followers', async (req, res) => {
    try {
        const { data } = await supabase?.from('user_follows')
            .select('follower_username, created_at')
            .eq('following_username', req.params.username);
        
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/users/:username/following', async (req, res) => {
    try {
        const { data } = await supabase?.from('user_follows')
            .select('following_username, created_at')
            .eq('follower_username', req.params.username);
        
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/users/:username/follow', async (req, res) => {
    try {
        const { follower_username } = req.body;
        const following_username = req.params.username;
        
        const { data, error } = await supabase?.from('user_follows').insert([{
            follower_username,
            following_username
        }]).select();
        
        if (error) throw error;
        
        // Atualizar contadores
        await supabase?.from('users')
            .update({ followers: supabase.raw('followers + 1') })
            .eq('username', following_username);
        
        await supabase?.from('users')
            .update({ following: supabase.raw('following + 1') })
            .eq('username', follower_username);
        
        res.json({ message: "followed", data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:username/unfollow', async (req, res) => {
    try {
        const { follower_username } = req.body;
        const following_username = req.params.username;
        
        await supabase?.from('user_follows')
            .delete()
            .eq('follower_username', follower_username)
            .eq('following_username', following_username);
        
        res.json({ message: "unfollowed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
