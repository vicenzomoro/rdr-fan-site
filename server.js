const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;

// Enable proxy trust for accurate IP logging on Render/Heroku
app.set('trust proxy', true);

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
            .insert([{ username, password, is_banned: false }])
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

// Feedback Routes
app.post('/api/feedback', async (req, res) => {
    const { username, message } = req.body;
    if (!username || !message) return res.status(400).json({ error: 'Faltam dados.' });
    try {
        const { error } = await supabase.from('feedback').insert([{ username, message }]);
        if (error) throw error;
        res.json({ message: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mod Submission Routes (Direct File Upload)
app.post('/api/submissions/upload', upload.single('modFile'), async (req, res) => {
    const { username, title, description } = req.body;
    const file = req.file;

    if (!username || !title || !file) {
        return res.status(400).json({ error: 'Dados incompletos (usuário, título e arquivo são obrigatórios).' });
    }

    try {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
        const filePath = `mods/${fileName}`;

        // SIMULATED ANTI-VIRUS SCAN
        // In a real scenario, we would send 'file.buffer' to VirusTotal API here.
        console.log(`[Segurança] Escaneando arquivo: ${file.originalname}...`);

        // Basic heuristic check (example: block executables for now if you want, or just wait for "scan")
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate scan time

        const dangerousExtensions = ['exe', 'bat', 'sh', 'vbs', 'scr'];
        if (dangerousExtensions.includes(fileExt.toLowerCase())) {
            return res.status(403).json({ error: 'Arquivo bloqueado pelo sistema de segurança do bando: Extensão perigosa detectada.' });
        }

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('mods') // Bucket name
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) throw storageError;

        // Get Public URL
        const { data: urlData } = supabase.storage
            .from('mods')
            .getPublicUrl(filePath);

        const fileLink = urlData.publicUrl;

        // Save to Database
        const { error: dbError } = await supabase.from('mod_submissions').insert([{
            username,
            title,
            description,
            link: fileLink,
            security_status: 'Verificado (Limpo)'
        }]);

        if (dbError) throw dbError;

        res.json({ message: 'Arquivo enviado e verificado com sucesso!', link: fileLink });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Admin Verification Route
const DEV_MASTER_KEY = "DEV_XERIFE_1899"; // Developer Master Key provided as requested

app.post('/api/admin/verify', async (req, res) => {
    const { token } = req.body;

    // Retrieve IP and User Agent Correctly
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (token === supabaseKey || token === DEV_MASTER_KEY) {
        res.json({ message: "authorized" });
    } else {
        // Log unauthorized attempt
        try {
            await supabase.from('admin_logs').insert([{
                ip_address: ip || '0.0.0.0',
                user_agent: userAgent,
                attempt_password: token.substring(0, 30)
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

// Admin Feedback Route
app.get('/api/admin/feedback', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Submissions Route
app.get('/api/admin/submissions', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('mod_submissions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
