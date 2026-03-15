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
const supabase = createClient(supabaseUrl, supabaseKey);

const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

// Helper: Extrair nome do arquivo da URL publica do Supabase Storage
const extractStorageFileName = (url) => {
    if (!url) return null;
    try {
        const parts = url.split('/storage/v1/object/public/mods/');
        return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
    } catch (e) { return null; }
};

// Helper: Deletar arquivo do Supabase Storage
const deleteStorageFile = async (link) => {
    const fileName = extractStorageFileName(link);
    if (fileName) {
        try {
            await supabase.storage.from('mods').remove([fileName]);
            console.log('Arquivo deletado do storage:', fileName);
        } catch (e) { console.error('Erro ao deletar arquivo:', e); }
    }
};

// Helper: Criar notificacao para um usuario
const createNotification = async (username, message, type) => {
    type = type || 'info';
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

// Middleware de Autenticacao Admin
const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization || req.body.token;
    const isAuthorized = token === MASTER_KEY || (supabaseKey && token === supabaseKey);

    if (isAuthorized) return next();

    try {
        await supabase.from('security_logs').insert([{
            ip_address: req.headers['x-forwarded-for'] || req.ip || 'desconhecido',
            device: req.headers['user-agent'] || 'desconhecido',
            password_attempt: token ? (token.length > 30 ? token.substring(0, 30) + "..." : token) : "vazio",
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error("Erro no Log de Seguranca:", e); }

    res.status(401).json({ error: "Acesso negado. O Xerife esta de olho!" });
};

// --- ROTAS PUBLICAS ---
app.get('/api/ping', (req, res) => res.json({ message: "Servidor Ativo!", status: "ok" }));

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{ username: String(username).trim(), password: hashed, is_banned: false }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) { res.status(400).json({ error: "Erro no registro", details: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('username', String(username).trim());
        if (error) throw error;
        if (data && data.length > 0) {
            const user = data[0];
            if (user.is_banned) return res.status(403).json({ error: "Voce foi banido pelo Xerife!" });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
            res.json({ message: "logged_in", username: user.username });
        } else { res.status(401).json({ error: 'Usuario nao encontrado.' }); }
    } catch (err) { res.status(500).json({ error: "Erro interno", details: err.message }); }
});

app.get('/api/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/comments', async (req, res) => {
    const { author, text, date } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

app.get('/api/questions', async (req, res) => {
    const { data, error } = await supabase.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/questions', async (req, res) => {
    const { author, title, text, date } = req.body;
    const { data, error } = await supabase.from('questions').insert([{ author, title, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

app.get('/api/mods', async (req, res) => {
    const search = req.query.search || '';
    let query = supabase.from('mod_submissions').select('*').eq('is_approved', true);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error } = await query.order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/feedback', async (req, res) => {
    const { username, message } = req.body;
    await supabase.from('feedback').insert([{ username: username || "Anonimo", message }]);
    res.json({ message: 'sucesso' });
});

// --- ROTAS DE DOACOES ---

app.post('/api/donations', async (req, res) => {
    const { donor_name, donor_email, amount, payment_method, message, is_public } = req.body;
    
    if (!donor_name || !amount || !payment_method) {
        return res.status(400).json({ error: 'Nome, valor e método de pagamento são obrigatórios.' });
    }
    
    try {
        const { data, error } = await supabase.from('donations').insert([{
            donor_name: String(donor_name).trim(),
            donor_email: donor_email ? String(donor_email).trim() : null,
            amount: parseFloat(amount),
            payment_method: payment_method,
            message: message ? String(message).trim() : null,
            is_public: is_public !== false
        }]).select();
        
        if (error) throw error;
        
        if (donor_name) {
            await createNotification(donor_name, 'Obrigado por sua doação de R$ ' + parseFloat(amount).toFixed(2) + '! Você é parte essencial do bando.', 'success');
        }
        
        res.json({ message: 'success', data: data[0] });
    } catch (err) {
        console.error('Erro ao registrar doação:', err);
        res.status(500).json({ error: 'Erro ao registrar doação.' });
    }
});

app.get('/api/donations', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    
    try {
        const { data, error } = await supabase.from('donations')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        res.json({ data: data || [] });
    } catch (err) {
        console.error('Erro ao buscar doações:', err);
        res.status(500).json({ error: 'Erro ao buscar doações.' });
    }
});

app.post('/api/mods', upload.single('file'), async (req, res) => {
    const { title, description, username } = req.body;
    const file = req.file;

    try {
        let publicUrl = "";

        if (file) {
            const fileName = `${Date.now()}_${file.originalname}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('mods')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) {
                console.error("Storage Error:", uploadError);
                return res.status(500).json({ error: "Erro ao subir arquivo. Verifique se o bucket 'mods' existe no Supabase Storage." });
            }

            const { data: { publicUrl: url } } = supabase.storage
                .from('mods')
                .getPublicUrl(fileName);

            publicUrl = url;
        }

        const { error } = await supabase.from('mod_submissions').insert([{
            title,
            description,
            username: username || 'Anonimo',
            link: publicUrl,
            is_approved: false
        }]);

        if (error) throw error;

        await createNotification(username || 'Anonimo', 'Seu mod "' + title + '" foi enviado e esta aguardando aprovacao do Xerife!', 'info');
        res.json({ message: "submitted" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar solicitacao.", details: err.message });
    }
});

// --- ROTAS DE NOTIFICACOES ---

app.get('/api/notifications/:username', async (req, res) => {
    const { data } = await supabase.from('notifications').select('*')
        .eq('username', req.params.username)
        .order('created_at', { ascending: false })
        .limit(20);
    res.json({ data: data || [] });
});

app.post('/api/notifications/:id/read', async (req, res) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id);
    res.json({ message: "ok" });
});

app.post('/api/notifications/read-all', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    await supabase.from('notifications').update({ is_read: true }).eq('username', username).eq('is_read', false);
    res.json({ message: "ok" });
});

// --- ROTAS ADMIN ---

app.post('/api/admin/verify', adminAuth, (req, res) => res.json({ message: "authorized" }));

app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        const [u, c, m, f, q] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('comments').select('*', { count: 'exact', head: true }),
            supabase.from('mod_submissions').select('*', { count: 'exact', head: true }),
            supabase.from('feedback').select('*', { count: 'exact', head: true }),
            supabase.from('questions').select('*', { count: 'exact', head: true })
        ]);
        res.json({ users: u.count, comments: c.count, mods: m.count, feedback: f.count, questions: q.count });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
    const { data } = await supabase.from('users').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/admin/users/:id/ban', adminAuth, async (req, res) => {
    const { banned } = req.body;
    const { error } = await supabase.from('users').update({ is_banned: banned }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "success" });
});

app.get('/api/admin/feedback', adminAuth, async (req, res) => {
    const { data } = await supabase.from('feedback').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/api/admin/questions', adminAuth, async (req, res) => {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/api/admin/submissions', adminAuth, async (req, res) => {
    const { data } = await supabase.from('mod_submissions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

// Aprovar/Desativar mod — ao desativar, deleta arquivo do storage
app.post('/api/admin/mods/:id/approve', adminAuth, async (req, res) => {
    const { approved } = req.body;
    const modId = req.params.id;

    try {
        if (!approved) {
            const { data: mod } = await supabase.from('mod_submissions').select('link, username, title').eq('id', modId).single();
            if (mod) {
                await deleteStorageFile(mod.link);
                await createNotification(mod.username, 'Seu mod "' + mod.title + '" foi desativado pelo Xerife.', 'warning');
            }
        } else {
            const { data: mod } = await supabase.from('mod_submissions').select('username, title').eq('id', modId).single();
            if (mod) {
                await createNotification(mod.username, 'Seu mod "' + mod.title + '" foi aprovado pelo Xerife! Agora esta visivel na galeria.', 'success');
            }
        }

        const { error } = await supabase.from('mod_submissions').update({ is_approved: approved }).eq('id', modId);
        if (error) throw error;
        res.json({ message: "success" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Recusar mod — deleta do banco E do storage
app.delete('/api/admin/mods/:id', adminAuth, async (req, res) => {
    const modId = req.params.id;
    try {
        const { data: mod } = await supabase.from('mod_submissions').select('link, username, title').eq('id', modId).single();
        if (mod) {
            await deleteStorageFile(mod.link);
            await createNotification(mod.username, 'Seu mod "' + mod.title + '" foi recusado pelo Xerife. Tente novamente com melhorias!', 'error');
        }

        const { error } = await supabase.from('mod_submissions').delete().eq('id', modId);
        if (error) throw error;
        res.json({ message: "deleted" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/admin/logs', adminAuth, async (req, res) => {
    const { data } = await supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(50);
    res.json({ data: data || [] });
});

app.delete('/api/admin/comments/:id', adminAuth, async (req, res) => {
    const { error } = await supabase.from('comments').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

app.delete('/api/admin/questions/:id', adminAuth, async (req, res) => {
    const { error } = await supabase.from('questions').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

// Vercel Serverless Function Handler
module.exports = app;

// Para Vercel: handler serverless
const serverless = require('serverless-http');
module.exports.handler = serverless(app);
