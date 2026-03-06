const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const MASTER_KEY = process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899";

// Middleware para normalizar caminhos
app.use((req, res, next) => {
    req.url = req.url.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
    next();
});

// --- ROTAS DE AUTENTICAÇÃO ---

app.get('/ping', (req, res) => res.json({ message: "O servidor está vivo!", status: "ok" }));

app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{ username, password: hashed, is_banned: false }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('username', username);
        if (error) throw error;
        if (data && data.length > 0) {
            const user = data[0];
            if (user.is_banned) return res.status(403).json({ error: 'Sua conta foi banida pelo Xerife.' });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
            res.json({ message: "logged_in", username });
        } else { res.status(401).json({ error: 'Usuário não encontrado.' }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROTAS DO ADMIN ---

app.post('/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token === MASTER_KEY || token === supabaseKey) {
        res.json({ message: "authorized" });
    } else { res.status(401).json({ error: "unauthorized" }); }
});

app.get('/admin/stats', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== MASTER_KEY && token !== supabaseKey) return res.status(401).json({ error: "unauthorized" });
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

// --- ROTAS PÚBLICAS (COMENTÁRIOS, MODS, Q&A) ---

app.get('/comments', async (req, res) => {
    try {
        const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/comments', async (req, res) => {
    const { author, text, date } = req.body;
    try {
        const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
        if (error) throw error;
        res.json({ data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/mods', async (req, res) => {
    try {
        const { data, error } = await supabase.from('mod_submissions').select('*').eq('is_approved', true).order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/questions', async (req, res) => {
    try {
        const { data, error } = await supabase.from('questions').select('*, replies(*)').order('id', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/questions', async (req, res) => {
    const { author, title, text, date } = req.body;
    try {
        const { data, error } = await supabase.from('questions').insert([{ author, title, text, date }]).select();
        if (error) throw error;
        res.json({ data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/feedback', async (req, res) => {
    const { username, message } = req.body;
    try {
        const { error } = await supabase.from('feedback').insert([{ username, message }]);
        if (error) throw error;
        res.json({ message: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.handler = serverless(app);
