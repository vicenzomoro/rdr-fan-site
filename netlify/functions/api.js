const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Limpeza e Captura de Variáveis (Trim remove espaços invisíveis)
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO: Variáveis do Supabase vazias no Netlify!");
}

// Inicialização com motor de fetch global (Mais estável no Node 18+)
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

// Normalização de Caminhos
app.use((req, res, next) => {
    req.url = req.url.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
    next();
});

// --- NOVO HEALTH CHECK (Teste Real) ---
app.get('/health', async (req, res) => {
    let db_status = "não testado";
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        db_status = error ? `Erro: ${error.message}` : "Conectado com Sucesso!";
    } catch (e) {
        db_status = `Falha Catastrófica: ${e.message}`;
    }

    res.json({
        status: "alive",
        database_connection: db_status,
        url_preview: supabaseUrl.substring(0, 15) + "...",
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
        const { error } = await supabase.from('users').insert([{
            username: String(username).trim(),
            password: hashed,
            is_banned: false
        }]);

        if (error) {
            return res.status(400).json({
                error: "Erro no Banco de Dados",
                details: error.message,
                code: error.code
            });
        }
        res.json({ message: "registered" });
    } catch (err) {
        res.status(500).json({ error: "Erro interno", details: err.message });
    }
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
        } else {
            res.status(401).json({ error: 'Usuário não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: "Erro no servidor", details: err.message });
    }
});

module.exports.handler = serverless(app);
