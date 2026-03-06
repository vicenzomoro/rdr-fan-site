const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações do Supabase
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO: Credenciais do Supabase não encontradas!");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

// No Vercel, o roteamento é automático através do vercel.json
// mas vamos garantir que o Express ignore o prefixo /api se ele chegar
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        req.url = req.url.replace('/api', '');
    }
    next();
});

// --- ROTAS ---

app.get('/ping', (req, res) => res.json({ message: "Servidor Vercel Ativo!", status: "ok" }));

app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{
            username: String(username).trim(),
            password: hashed,
            is_banned: false
        }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) { res.status(400).json({ error: "Erro no registro", details: err.message }); }
});

app.post('/auth/login', async (req, res) => {
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

// Comentários, Perguntas e Mods (Acesso direto)
app.get('/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/comments', async (req, res) => {
    const { author, text, date } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

module.exports = app;
