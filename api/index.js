const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

// Middleware de Autenticação Admin
const adminAuth = (req, res, next) => {
    const token = req.headers.authorization || req.body.token;
    if (token === MASTER_KEY || token === supabaseKey) return next();
    res.status(401).json({ error: "Acesso negado, forasteiro!" });
};

// --- ROTAS PÚBLICAS ---
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
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
            res.json({ message: "logged_in", username: user.username });
        } else { res.status(401).json({ error: 'Usuário não encontrado.' }); }
    } catch (err) { res.status(500).json({ error: "Erro interno", details: err.message }); }
});

// Comentários e Dúvidas (Públicos)
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

app.post('/api/feedback', async (req, res) => {
    const { username, message } = req.body;
    await supabase.from('feedback').insert([{ username, message }]);
    res.json({ message: 'sucesso' });
});

// --- ROTAS ADMIN (Protegidas) ---

app.post('/api/admin/verify', adminAuth, (req, res) => res.json({ message: "authorized" }));

app.get('/api/admin/stats', adminAuth, async (req, res) => {
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

app.get('/api/admin/users', adminAuth, async (req, res) => {
    const { data } = await supabase.from('users').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
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

app.get('/api/admin/logs', adminAuth, async (req, res) => {
    const { data } = await supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(50);
    res.json({ data: data || [] });
});

module.exports = app;
