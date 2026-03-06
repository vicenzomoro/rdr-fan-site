const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações do Supabase (Pegando do Netlify Extension)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Senha Mestra do Admin
const MASTER_KEY = process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899";

// Roteador de API
const router = express.Router();

// Teste de Conexão (Ping)
router.get('/ping', (req, res) => res.json({ message: "O servidor está vivo!", status: "ok" }));

// Registro
router.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{ username, password: hashed, is_banned: false }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login
router.post('/auth/login', async (req, res) => {
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
router.post('/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token === MASTER_KEY || token === supabaseKey) {
        res.json({ message: "authorized" });
    } else {
        res.status(401).json({ error: "unauthorized" });
    }
});

// Comentários
router.get('/comments', async (req, res) => {
    try {
        const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/comments', async (req, res) => {
    const { author, text, date } = req.body;
    try {
        const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
        if (error) throw error;
        res.json({ data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Acoplar o roteador
// Importante: No Netlify Functions, o handler recebe o path completo
app.use('/.netlify/functions/api', router);
app.use('/api', router);

module.exports.handler = serverless(app);
