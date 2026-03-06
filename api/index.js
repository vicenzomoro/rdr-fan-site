const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Forçar a captura das variáveis (Vercel usa essas chaves)
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Rota de teste para ver se o Vercel carregou o ambiente
app.get('/api/ping', (req, res) => {
    res.json({
        message: "Servidor Vercel Ativo!",
        supabase_url_ok: supabaseUrl.startsWith('https://'),
        supabase_key_ok: supabaseKey.length > 50,
        env_check: !!process.env.SUPABASE_URL
    });
});

// Inicializa o cliente apenas se tiver as chaves
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!supabase) return res.status(500).json({ error: "Erro de Configuração: Chaves do banco não encontradas no Vercel." });

    try {
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{
            username: String(username).trim(),
            password: hashed,
            is_banned: false
        }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) {
        res.status(400).json({ error: "Erro no Banco", details: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!supabase) return res.status(500).json({ error: "Servidor sem chaves do banco." });

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
        res.status(500).json({ error: "Erro interno", details: err.message });
    }
});

// Exporta para o Vercel
module.exports = app;
