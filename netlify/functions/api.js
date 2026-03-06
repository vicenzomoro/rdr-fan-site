const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações do Supabase (Priorizando Variáveis da Extensão)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const MASTER_KEY = process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899";

// Função para limpar o caminho e deixar apenas a rota final
const getCleanPath = (path) => {
    return path.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
};

// Middleware para normalizar caminhos (Essencial para Netlify)
app.use((req, res, next) => {
    req.url = getCleanPath(req.url);
    next();
});

// Rotas Diretas no App (Sem Router para evitar confusão de prefixos)

// Teste de Conexão
app.get('/ping', (req, res) => {
    res.json({
        message: "O servidor está vivo!",
        originalUrl: req.originalUrl,
        normalizedUrl: req.url
    });
});

// Registro
app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{ username, password: hashed, is_banned: false }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('username', username);
        if (error) throw error;
        if (data && data.length > 0) {
            const user = data[0];
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
            res.json({ message: "logged_in", username });
        } else { res.status(401).json({ error: 'Usuário não encontrado.' }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Verify
app.post('/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token === MASTER_KEY || token === supabaseKey) {
        res.json({ message: "authorized" });
    } else { res.status(401).json({ error: "unauthorized" }); }
});

// Comentários
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

// Rota 404 customizada para diagnóstico
app.use((req, res) => {
    res.status(404).json({
        error: "Rota não encontrada",
        url: req.url,
        originalUrl: req.originalUrl
    });
});

module.exports.handler = serverless(app);
