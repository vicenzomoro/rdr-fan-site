const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Log de Inicialização
console.log("--- INICIANDO BACKEND RDR FAN SITE ---");

// Configurações do Supabase
// A extensão do Netlify injeta essas variáveis automaticamente
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO: Credenciais do Supabase não encontradas no ambiente do Netlify!");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const MASTER_KEY = process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899";

// Middleware para normalizar caminhos do Netlify
app.use((req, res, next) => {
    // Remove prefixos comuns do Netlify para que o roteamento interno funcione
    const cleanUrl = req.url.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
    req.url = cleanUrl;
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// --- ROTA DE SAÚDE (Diagnóstico) ---
app.get('/health', (req, res) => {
    res.json({
        status: "alive",
        supabase_url_ok: supabaseUrl.startsWith('http'),
        supabase_key_ok: supabaseKey.length > 20,
        node_version: process.version,
        timestamp: new Date().toISOString()
    });
});

app.get('/ping', (req, res) => res.json({ message: "O servidor está vivo!" }));

// --- AUTENTICAÇÃO ---

app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) return res.status(400).json({ error: "Faltam dados." });

        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{ username, password: hashed, is_banned: false }]);

        if (error) {
            console.error("Erro Supabase (Insert):", error);
            return res.status(400).json({
                error: "Erro no Banco de Dados",
                details: error.message,
                hint: "Verifique se a tabela 'users' existe no painel do Supabase."
            });
        }
        res.json({ message: "registered" });
    } catch (err) {
        console.error("Erro Fatal (Register):", err);
        res.status(500).json({ error: "Erro interno", details: err.message });
    }
});

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
        } else {
            res.status(401).json({ error: 'Usuário não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: "Erro no servidor", details: err.message });
    }
});

// --- ADMIN ---
app.post('/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token === MASTER_KEY || token === supabaseKey) {
        res.json({ message: "authorized" });
    } else {
        res.status(401).json({ error: "unauthorized" });
    }
});

// --- DADOS ---
app.get('/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/comments', async (req, res) => {
    const { author, text, date } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

module.exports.handler = serverless(app);
