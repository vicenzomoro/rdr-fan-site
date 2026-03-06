const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

// Configurações do Supabase
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

// Normalização de Caminhos para Netlify
app.use((req, res, next) => {
    req.url = req.url.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
    next();
});

// Middleware de Autenticação Admin
const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization || req.body.token;
    if (token === MASTER_KEY || (supabaseKey && token === supabaseKey)) return next();

    // Logar tentativa falha
    try {
        await supabase.from('security_logs').insert([{
            ip_address: req.headers['x-nf-client-connection-ip'] || req.ip || 'desconhecido',
            device: req.headers['user-agent'] || 'desconhecido',
            password_attempt: token ? (token.length > 20 ? token.substring(0, 20) + "..." : token) : "vazio",
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error("Erro ao logar invasão:", e); }

    res.status(401).json({ error: "Acesso negado, forasteiro!" });
};

// --- ROTAS PÚBLICAS ---

app.get('/health', async (req, res) => {
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        res.json({ status: "alive", database: error ? "error" : "connected", timestamp: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ status: "fail", error: e.message });
    }
});

app.get('/ping', (req, res) => res.json({ message: "Servidor Ativo!" }));

app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) return res.status(400).json({ error: "Dados incompletos." });
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{
            username: String(username).trim(),
            password: hashed,
            is_banned: false
        }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('username', String(username).trim());
        if (error) throw error;
        if (data && data.length > 0) {
            const user = data[0];
            if (user.is_banned) return res.status(403).json({ error: "Você foi banido pelo Xerife!" });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
            res.json({ message: "logged_in", username: user.username });
        } else { res.status(401).json({ error: 'Usuário não encontrado.' }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/comments', async (req, res) => {
    const { author, text, date } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

app.get('/questions', async (req, res) => {
    const { data, error } = await supabase.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/questions', async (req, res) => {
    const { author, title, text, date } = req.body;
    const { data, error } = await supabase.from('questions').insert([{ author, title, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

app.get('/mods', async (req, res) => {
    const search = req.query.search || '';
    let query = supabase.from('mod_submissions').select('*').eq('is_approved', true);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error } = await query.order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/feedback', async (req, res) => {
    const { username, message } = req.body;
    await supabase.from('feedback').insert([{ username: username || 'Anônimo', message }]);
    res.json({ message: 'sucesso' });
});

app.post('/mods', upload.single('file'), async (req, res) => {
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
            username: username || 'Anônimo',
            link: publicUrl,
            is_approved: false
        }]);

        if (error) throw error;
        res.json({ message: "submitted" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar solicitação.", details: err.message });
    }
});

// --- ROTAS ADMIN ---

app.post('/admin/verify', adminAuth, (req, res) => res.json({ message: "authorized" }));

app.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        const [u, c, m, f] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('comments').select('*', { count: 'exact', head: true }),
            supabase.from('mod_submissions').select('*', { count: 'exact', head: true }).eq('is_approved', true),
            supabase.from('feedback').select('*', { count: 'exact', head: true })
        ]);
        res.json({ users: u.count, comments: c.count, mods: m.count, feedback: f.count });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/users', adminAuth, async (req, res) => {
    const { data } = await supabase.from('users').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/admin/feedback', adminAuth, async (req, res) => {
    const { data } = await supabase.from('feedback').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/admin/questions', adminAuth, async (req, res) => {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/admin/submissions', adminAuth, async (req, res) => {
    const { data } = await supabase.from('mod_submissions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/admin/logs', adminAuth, async (req, res) => {
    const { data } = await supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(50);
    res.json({ data: data || [] });
});

app.delete('/admin/comments/:id', adminAuth, async (req, res) => {
    const { error } = await supabase.from('comments').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

app.delete('/admin/questions/:id', adminAuth, async (req, res) => {
    const { error } = await supabase.from('questions').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

module.exports.handler = serverless(app);
