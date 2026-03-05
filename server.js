const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Connection
// The user will need to provide their own keys either via environment variables or hardcoded here temporarily
const supabaseUrl = process.env.SUPABASE_URL || 'https://utgvmwqtioghilavuceo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_hwHJAWfiOu82lxdweW4TQQ_KTvicO2-';

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// API Routes
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password }])
            .select();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Nome de usuário já existe.' });
            throw error;
        }
        res.json({ message: "registered" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password);

        if (error) throw error;

        if (data.length > 0) {
            const user = data[0];
            if (user.is_banned) {
                return res.status(403).json({ error: 'Sua conta foi banida pelo Xerife da cidade.' });
            }
            res.json({ message: "logged_in", username });
        } else {
            res.status(401).json({ error: 'Apelido ou senha incorretos.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/comments', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        res.json({ message: "success", data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/comments', async (req, res) => {
    const { author, text, date } = req.body;

    if (!author || !text) {
        return res.status(400).json({ error: 'Author and text are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('comments')
            .insert([{ author, text, date }])
            .select();

        if (error) throw error;

        res.json({
            message: "success",
            data: data[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Verification Route
const DEV_MASTER_KEY = "DEV_XERIFE_1899"; // Developer Master Key provided as requested

app.post('/api/admin/verify', async (req, res) => {
    const { token } = req.body;

    // Retrieve IP and User Agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (token === supabaseKey || token === DEV_MASTER_KEY) {
        res.json({ message: "authorized" });
    } else {
        // Log unauthorized attempt
        try {
            await supabase.from('admin_logs').insert([{
                ip_address: ip,
                user_agent: userAgent,
                attempt_password: token.substring(0, 15) // prevent overly long inserts
            }]);
        } catch (e) {
            console.error("Failed to log security breach:", e);
        }
        res.status(401).json({ error: "unauthorized" });
    }
});

// Delete Comment Route
app.delete('/api/comments/:id', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) {
        return res.status(401).json({ error: "unauthorized" });
    }

    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: "deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Users Route
app.get('/api/admin/users', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });

    try {
        const { data, error } = await supabase.from('users').select('id, username, is_banned').order('id', { ascending: true });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Toggle Ban Route
app.put('/api/admin/users/:id/ban', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });

    const { id } = req.params;
    const { is_banned } = req.body;

    try {
        const { error } = await supabase.from('users').update({ is_banned }).eq('id', id);
        if (error) throw error;
        res.json({ message: "success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Logs Route
app.get('/api/admin/logs', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });

    try {
        const { data, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
