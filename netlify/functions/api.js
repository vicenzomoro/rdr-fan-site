const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Verificação de Variáveis (Log para o Netlify)
console.log("Iniciando Função de API...");
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO CRÍTICO: Chaves do Supabase não encontradas!");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const MASTER_KEY = process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899";

// Middleware de Normalização
app.use((req, res, next) => {
    req.url = req.url.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
    console.log(`Recebendo: ${req.method} ${req.url}`);
    next();
});

// Teste de Vida
app.get('/ping', (req, res) => res.json({ message: "Servidor vivo!", time: new Date().toISOString() }));

// --- LOGIN COM LOGS EXTREMOS ---
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Tentativa de login para: ${username}`);

    try {
        if (!username || !password) {
            return res.status(400).json({ error: "Nome e senha obrigatórios." });
        }

        // 1. Buscar usuário
        const { data, error } = await supabase.from('users').select('*').eq('username', username);

        if (error) {
            console.error("Erro na consulta do Supabase:", error);
            return res.status(500).json({ error: "Erro no banco de dados. Verifique as tabelas." });
        }

        if (data && data.length > 0) {
            const user = data[0];
            console.log("Usuário encontrado, verificando senha...");

            // 2. Verificar Senha
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                console.log("Senha incorreta.");
                return res.status(401).json({ error: 'Senha incorreta.' });
            }

            console.log("Login bem-sucedido!");
            res.json({ message: "logged_in", username });
        } else {
            console.log("Usuário não encontrado.");
            res.status(401).json({ error: 'Usuário não encontrado.' });
        }
    } catch (err) {
        console.error("ERRO FATAL NO LOGIN:", err);
        res.status(500).json({ error: "Erro interno no servidor.", details: err.message });
    }
});

// --- REGISTRO COM LOGS ---
app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log(`Registrando: ${username}`);
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{ username, password: hashed, is_banned: false }]);

        if (error) {
            console.error("Erro ao inserir usuário:", error);
            return res.status(400).json({ error: "Usuário já existe ou erro no banco." });
        }

        res.json({ message: "registered" });
    } catch (err) {
        console.error("Erro no registro:", err);
        res.status(500).json({ error: err.message });
    }
});

// Acionador do Admin
app.post('/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token === MASTER_KEY || token === supabaseKey) {
        res.json({ message: "authorized" });
    } else {
        res.status(401).json({ error: "unauthorized" });
    }
});

// Rotas de dados (Comentários e Mods)
app.get('/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [], error });
});

app.post('/comments', async (req, res) => {
    const { author, text, date } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
    res.json({ data: data ? data[0] : null, error });
});

module.exports.handler = serverless(app);
