const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

// ========== HELPERS ==========

const extractStorageFileName = (url) => {
    if (!url) return null;
    try {
        const parts = url.split('/storage/v1/object/public/');
        return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
    } catch (e) { return null; }
};

const deleteStorageFile = async (link, bucket = 'mods') => {
    const fileName = extractStorageFileName(link);
    if (fileName && supabase) {
        try {
            await supabase.storage.from(bucket).remove([fileName]);
            console.log('Arquivo deletado do storage:', fileName);
        } catch (e) { console.error('Erro ao deletar arquivo:', e); }
    }
};

const createNotification = async (username, message, type = 'info') => {
    if (!supabase) return;
    try {
        await supabase.from('notifications').insert([{
            username,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error('Erro ao criar notificacao:', e); }
};

const createActivity = async (username, activityType, contentType = null, contentId = null, contentTitle = null) => {
    if (!supabase) return;
    try {
        await supabase.from('user_activity').insert([{
            username,
            activity_type: activityType,
            content_type: contentType,
            content_id: contentId,
            content_title: contentTitle,
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error('Erro ao criar atividade:', e); }
};

const awardAchievement = async (username, achievementName) => {
    if (!supabase) return;
    try {
        const { data: achievement } = await supabase.from('achievements')
            .select('id')
            .eq('name', achievementName)
            .single();
        
        if (achievement) {
            const { data: user } = await supabase.from('users')
                .select('id')
                .eq('username', username)
                .single();
            
            if (user) {
                await supabase.from('user_achievements').insert([{
                    user_id: user.id,
                    username,
                    achievement_id: achievement.id,
                    earned_at: new Date().toISOString()
                }]).ignoreDuplicates();
                
                await createNotification(username, `Conquista desbloqueada: ${achievementName}!`, 'success');
            }
        }
    } catch (e) { console.error('Erro ao dar conquista:', e); }
};

const sanitize = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (s) => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return map[s];
    });
};

// ========== MIDDLEWARES ==========

const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization || req.body.token;
    const isAuthorized = token === MASTER_KEY || (supabaseKey && token === supabaseKey);

    if (isAuthorized) return next();

    try {
        await supabase?.from('security_logs').insert([{
            ip_address: req.headers['x-forwarded-for'] || req.ip || 'desconhecido',
            device: req.headers['user-agent'] || 'desconhecido',
            password_attempt: token ? (token.length > 30 ? token.substring(0, 30) + "..." : token) : "vazio",
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error("Erro no Log de Seguranca:", e); }

    res.status(401).json({ error: "Acesso negado. O Xerife esta de olho!" });
};

const requireAuth = async (req, res, next) => {
    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ error: 'Login necessario.' });
    
    try {
        const { data: user } = await supabase?.from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });
        if (user.is_banned) return res.status(403).json({ error: 'Voce foi banido pelo Xerife!' });
        
        req.user = user;
        next();
    } catch (e) {
        res.status(500).json({ error: 'Erro de autenticacao.' });
    }
};

// ========== ROTAS PÚBLICAS ==========

app.get('/api/ping', (req, res) => res.json({ message: "Servidor Ativo!", status: "ok" }));

// --- AUTH ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e senha obrigatorios.' });
    
    try {
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase?.from('users').insert([{
            username: String(username).trim(),
            password: hashed,
            email: email || null,
            is_banned: false
        }]);
        
        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Username ja existe.' });
            throw error;
        }
        
        await awardAchievement(String(username).trim(), 'Primeiros Passos');
        await createNotification(String(username).trim(), 'Bem-vindo ao bando, parceiro!', 'success');
        
        res.json({ message: "registered", username: String(username).trim() });
    } catch (err) { 
        res.status(400).json({ error: "Erro no registro", details: err.message }); 
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase?.from('users').select('*').eq('username', String(username).trim());
        if (error) throw error;
        
        if (data && data.length > 0) {
            const user = data[0];
            if (user.is_banned) return res.status(403).json({ error: "Voce foi banido pelo Xerife!" });
            
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
            
            await supabase?.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
            
            res.json({ message: "logged_in", username: user.username });
        } else { 
            res.status(401).json({ error: 'Usuario nao encontrado.' }); 
        }
    } catch (err) { 
        res.status(500).json({ error: "Erro interno", details: err.message }); 
    }
});

app.get('/api/users/:username', async (req, res) => {
    try {
        const { data, error } = await supabase?.from('users')
            .select('id, username, email, bio, avatar_url, total_comments, total_mods, total_donations, followers, following, created_at')
            .eq('username', req.params.username)
            .single();
        
        if (error || !data) return res.status(404).json({ error: 'Usuario nao encontrado.' });
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== COMENTÁRIOS ==========

app.get('/api/comments', async (req, res) => {
    const { data, error } = await supabase?.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/comments', requireAuth, async (req, res) => {
    const { author, text, date } = req.body;
    try {
        const { data, error } = await supabase?.from('comments').insert([{ author, text, date }]).select();
        if (error) throw error;
        
        await createActivity(req.user.username, 'comment', 'comment', data[0].id, text.substring(0, 50));
        await awardAchievement(req.user.username, 'Contador de Historias');
        
        res.json({ data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== PERGUNTAS ==========

app.get('/api/questions', async (req, res) => {
    const { data, error } = await supabase?.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/questions', requireAuth, async (req, res) => {
    const { author, title, text, date } = req.body;
    try {
        const { data, error } = await supabase?.from('questions').insert([{ author, title, text, date }]).select();
        if (error) throw error;
        
        await createActivity(req.user.username, 'question', 'question', data[0].id, title);
        
        res.json({ data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== MODS ==========

app.get('/api/mods', async (req, res) => {
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';
    
    let query = supabase?.from('mod_submissions').select('*').eq('is_approved', true);
    
    if (search) query = query.ilike('title', `%${search}%`);
    if (category) query = query.eq('category', category);
    
    if (sort === 'popular') query = query.order('download_count', { ascending: false });
    else if (sort === 'rating') query = query.order('rating_avg', { ascending: false });
    else query = query.order('id', { ascending: false });
    
    const { data, error } = await query;
    res.json({ data: data || [] });
});

app.post('/api/mods', upload.single('file'), async (req, res) => {
    const { title, description, username, category, tags } = req.body;
    const file = req.file;

    try {
        let publicUrl = "";

        if (file) {
            const fileName = `${Date.now()}_${file.originalname}`;
            const { data: uploadData, error: uploadError } = await supabase?.storage
                .from('mods')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl: url } } = supabase?.storage.from('mods').getPublicUrl(fileName);
            publicUrl = url;
        }

        const { data, error } = await supabase?.from('mod_submissions').insert([{
            title,
            description,
            username: username || 'Anonimo',
            link: publicUrl,
            category: category || 'geral',
            tags: tags ? JSON.parse(tags) : [],
            is_approved: false
        }]).select();

        if (error) throw error;

        await createNotification(username || 'Anonimo', `Seu mod "${title}" foi enviado e esta aguardando aprovacao do Xerife!`, 'info');
        await createActivity(username || 'Anonimo', 'mod_submit', 'mod', data[0].id, title);
        
        res.json({ message: "submitted", data: data[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar solicitacao.", details: err.message });
    }
});

app.post('/api/mods/:id/download', async (req, res) => {
    try {
        const { data: mod } = await supabase?.from('mod_submissions')
            .select('download_count')
            .eq('id', req.params.id)
            .single();
        
        if (mod) {
            await supabase?.from('mod_submissions')
                .update({ download_count: (mod.download_count || 0) + 1 })
                .eq('id', req.params.id);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== FEEDBACK ==========

app.post('/api/feedback', async (req, res) => {
    const { username, message } = req.body;
    await supabase?.from('feedback').insert([{ username: username || "Anonimo", message }]);
    res.json({ message: 'sucesso' });
});

// ========== DOAÇÕES ==========

app.post('/api/donations', async (req, res) => {
    const { donor_name, donor_email, amount, payment_method, message, is_public } = req.body;

    if (!donor_name || !amount || !payment_method) {
        return res.status(400).json({ error: 'Nome, valor e metodo de pagamento sao obrigatorios.' });
    }

    try {
        const { data, error } = await supabase?.from('donations').insert([{
            donor_name: String(donor_name).trim(),
            donor_email: donor_email ? String(donor_email).trim() : null,
            amount: parseFloat(amount),
            payment_method: payment_method,
            message: message ? String(message).trim() : null,
            is_public: is_public !== false
        }]).select();

        if (error) throw error;

        if (donor_name) {
            await createNotification(donor_name, `Obrigado por sua doacao de R$ ${parseFloat(amount).toFixed(2)}! Voce e parte essencial do bando.`, 'success');
            
            // Award achievements
            if (parseFloat(amount) >= 20) await awardAchievement(donor_name, 'Apoiador');
            if (parseFloat(amount) >= 100) await awardAchievement(donor_name, 'Lendario');
        }

        res.json({ message: 'success', data: data[0] });
    } catch (err) {
        console.error('Erro ao registrar doacao:', err);
        res.status(500).json({ error: 'Erro ao registrar doacao.' });
    }
});

app.get('/api/donations', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;

    try {
        const { data, error } = await supabase?.from('donations')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        res.json({ data: data || [] });
    } catch (err) {
        console.error('Erro ao buscar doacoes:', err);
        res.status(500).json({ error: 'Erro ao buscar doacoes.' });
    }
});

app.get('/api/donations/total', async (req, res) => {
    try {
        const { count, error } = await supabase?.from('donations')
            .select('*', { count: 'exact', head: true })
            .eq('is_public', true);

        if (error) throw error;

        const { data: sumData } = await supabase?.from('donations')
            .select('amount')
            .eq('is_public', true);

        const total = sumData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

        res.json({ count: count || 0, total });
    } catch (err) {
        res.json({ count: 0, total: 0 });
    }
});

// ========== NOTIFICAÇÕES ==========

app.get('/api/notifications/:username', async (req, res) => {
    const { data } = await supabase?.from('notifications').select('*')
        .eq('username', req.params.username)
        .order('created_at', { ascending: false })
        .limit(20);
    res.json({ data: data || [] });
});

app.post('/api/notifications/:id/read', async (req, res) => {
    await supabase?.from('notifications').update({ is_read: true }).eq('id', req.params.id);
    res.json({ message: "ok" });
});

app.post('/api/notifications/read-all', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    await supabase?.from('notifications').update({ is_read: true }).eq('username', username).eq('is_read', false);
    res.json({ message: "ok" });
});

// ========== CHAT DUTCH (GEMINI) ==========

const DUTCH_SYSTEM = `Voce e Dutch Van der Linde, lider carismatico da gangue Van der Linde do jogo Red Dead Redemption 2.
Fale em portugues brasileiro, com tom de velho oeste: firme, eloquente e as vezes misterioso.
Mencione "parceiro", "o plano", "fe" e o fim da era dos fora-da-lei quando fizer sentido.
Seja breve (2-4 frases). Se perguntarem algo fora do tema do jogo, redirecione com classe para o Velho Oeste.`;

app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GEN_API_KEY || '';
    if (!apiKey) return res.status(503).json({ error: 'Chat temporariamente indisponivel.' });

    const { message } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Mensagem invalida.' });

    const userText = message.trim().slice(0, 500);
    if (!userText) return res.status(400).json({ error: 'Mensagem vazia.' });

    const model = process.env.GEN_MODEL || 'gemini-1.5-flash-latest';
    
    try {
        const axios = require('axios');
        const prompt = `${DUTCH_SYSTEM}\n\nUsuario pergunta: ${userText}\n\nDutch responde:`;
        const { data } = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 256, temperature: 0.8 }
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return res.status(502).json({ error: 'Resposta vazia do assistente.' });
        res.json({ response: text.trim() });
    } catch (err) {
        const body = err.response?.data;
        const status = err.response?.status;
        console.error('Gemini chat error:', status, body || err.message);
        let msg = 'O telegrafo falhou. Tente de novo.';
        if (status === 429) msg = 'Muitas mensagens. Espere um pouco, parceiro.';
        else if (status === 404) msg = 'Modelo de IA indisponivel. Avise o Xerife.';
        else if (body?.error?.message) msg = body.error.message;
        res.status(status || 500).json({ error: msg });
    }
});

// ========== ADMIN ==========

app.post('/api/admin/verify', adminAuth, (req, res) => res.json({ message: "authorized" }));

app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        const [u, c, m, f, q, s, t, e, w] = await Promise.all([
            supabase?.from('users').select('*', { count: 'exact', head: true }),
            supabase?.from('comments').select('*', { count: 'exact', head: true }),
            supabase?.from('mod_submissions').select('*', { count: 'exact', head: true }),
            supabase?.from('feedback').select('*', { count: 'exact', head: true }),
            supabase?.from('questions').select('*', { count: 'exact', head: true }),
            supabase?.from('screenshots').select('*', { count: 'exact', head: true }),
            supabase?.from('forum_topics').select('*', { count: 'exact', head: true }),
            supabase?.from('events').select('*', { count: 'exact', head: true }),
            supabase?.from('wiki_entries').select('*', { count: 'exact', head: true })
        ]);
        
        res.json({ 
            users: u?.count || 0, 
            comments: c?.count || 0, 
            mods: m?.count || 0, 
            feedback: f?.count || 0, 
            questions: q?.count || 0,
            screenshots: s?.count || 0,
            forum_topics: t?.count || 0,
            events: e?.count || 0,
            wiki_entries: w?.count || 0
        });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
    const { data } = await supabase?.from('users').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/admin/users/:id/ban', adminAuth, async (req, res) => {
    const { banned } = req.body;
    const { error } = await supabase?.from('users').update({ is_banned: banned }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "success" });
});

app.get('/api/admin/feedback', adminAuth, async (req, res) => {
    const { data } = await supabase?.from('feedback').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/api/admin/questions', adminAuth, async (req, res) => {
    const { data } = await supabase?.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/api/admin/submissions', adminAuth, async (req, res) => {
    const { data } = await supabase?.from('mod_submissions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/admin/mods/:id/approve', adminAuth, async (req, res) => {
    const { approved } = req.body;
    const modId = req.params.id;

    try {
        if (!approved) {
            const { data: mod } = await supabase?.from('mod_submissions').select('link, username, title').eq('id', modId).single();
            if (mod) {
                await deleteStorageFile(mod.link);
                await createNotification(mod.username, `Seu mod "${mod.title}" foi desativado pelo Xerife.`, 'warning');
            }
        } else {
            const { data: mod } = await supabase?.from('mod_submissions').select('username, title').eq('id', modId).single();
            if (mod) {
                await createNotification(mod.username, `Seu mod "${mod.title}" foi aprovado pelo Xerife! Agora esta visivel na galeria.`, 'success');
                await awardAchievement(mod.username, 'Modder Iniciante');
            }
        }

        const { error } = await supabase?.from('mod_submissions').update({ is_approved: approved }).eq('id', modId);
        if (error) throw error;
        res.json({ message: "success" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/admin/mods/:id', adminAuth, async (req, res) => {
    const modId = req.params.id;
    try {
        const { data: mod } = await supabase?.from('mod_submissions').select('link, username, title').eq('id', modId).single();
        if (mod) {
            await deleteStorageFile(mod.link);
            await createNotification(mod.username, `Seu mod "${mod.title}" foi recusado pelo Xerife. Tente novamente com melhorias!`, 'error');
        }

        const { error } = await supabase?.from('mod_submissions').delete().eq('id', modId);
        if (error) throw error;
        res.json({ message: "deleted" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/admin/logs', adminAuth, async (req, res) => {
    const { data } = await supabase?.from('security_logs').select('*').order('created_at', { ascending: false }).limit(50);
    res.json({ data: data || [] });
});

app.delete('/api/admin/comments/:id', adminAuth, async (req, res) => {
    const { error } = await supabase?.from('comments').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

app.delete('/api/admin/questions/:id', adminAuth, async (req, res) => {
    const { error } = await supabase?.from('questions').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

// ========== ROTAS COMPLEMENTARES ==========
const routes = require('./routes');
app.use('/api', routes);

// Vercel Serverless Handler
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

module.exports = app;
