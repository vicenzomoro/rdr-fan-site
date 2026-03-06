const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações do Supabase
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

// --- TESTE ---
app.get('/api/ping', (req, res) => res.json({ message: "Servidor Ativo!", status: "ok" }));

// --- AUTENTICAÇÃO ---
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
    } catch (err) { res.status(500).json({ error: "Erro no servidor", details: err.message }); }
});

// --- COMENTÁRIOS ---
app.get('/api/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/api/comments', async (req, res) => {
    const { author, text, date } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

// --- MODS E PERGUNTAS ---
app.get('/api/mods', async (req, res) => {
    const { data, error } = await supabase.from('mod_submissions').select('*').eq('is_approved', true);
    res.json({ data: data || [] });
});

app.get('/api/questions', async (req, res) => {
    const { data, error } = await supabase.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

// --- ADMIN ---
app.post('/api/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token === MASTER_KEY || token === supabaseKey) {
        res.json({ message: "authorized" });
    } else { res.status(401).json({ error: "unauthorized" }); }
});

module.exports = app;
