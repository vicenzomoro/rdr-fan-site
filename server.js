const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const bcrypt = require('bcrypt');
require('dotenv').config();

// simple sanitizer to strip potentially dangerous characters
const sanitize = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (s) => {
        switch (s) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return s;
        }
    });
};

const upload = multer({ storage: multer.memoryStorage() });
// secrets should come from environment variables (see .env or hosting configuration)
const VT_API_KEY = process.env.VT_API_KEY || ""; // VirusTotal API key
if (!VT_API_KEY) console.warn('Warning: VT_API_KEY is not defined. File scanning may not function properly.');


const app = express();
const PORT = process.env.PORT || 3000;

// Enable proxy trust for accurate IP logging on Render/Heroku
app.set('trust proxy', true);

// Supabase Connection
const supabaseUrl = process.env.SUPABASE_URL || 'https://utgvmwqtioghilavuceo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_hwHJAWfiOu82lxdweW4TQQ_KTvicO2-';
if (!process.env.SUPABASE_KEY) {
    console.warn('Warning: SUPABASE_KEY environment variable not set, using default publishable key. This may be insecure.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors({
    origin: '*', // Permite que o frontend acesse de qualquer lugar (útil se usar Netlify + Render)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Garante que caminhos estáticos funcionem no Linux/Windows

// Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Constants and Environment Variables
const DEV_MASTER_KEY_SECRET = process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899";
const GEN_API_KEY = process.env.GEN_API_KEY || process.env.GEMINI_API_KEY || "";

// Group all API routes in a Router for compatibility
const apiRouter = express.Router();

// API Routes (moved into router)
apiRouter.post('/auth/register', async (req, res) => {
    let { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    username = sanitize(username);
    try {
        const hashed = await bcrypt.hash(password, 10);
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password: hashed, is_banned: false }])
            .select();
        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Este nome de usuário já existe no bando. Por favor, escolha outro.' });
            throw error;
        }
        res.json({ message: "registered" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('username', sanitize(username));
        if (error) throw error;
        if (data.length > 0) {
            const user = data[0];
            if (user.is_banned) return res.status(403).json({ error: 'Sua conta foi banida pelo Xerife da cidade.' });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Apelido ou senha incorretos.' });
            res.json({ message: "logged_in", username });
        } else { res.status(401).json({ error: 'Apelido ou senha incorretos.' }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/comments', async (req, res) => {
    try {
        const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
        if (error) throw error;
        res.json({ message: "success", data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/comments', async (req, res) => {
    let { author, text, date } = req.body;
    if (!author || !text) return res.status(400).json({ error: 'Author and text are required.' });
    author = sanitize(author); text = sanitize(text);
    try {
        const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
        if (error) throw error;
        res.json({ message: "success", data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/questions', async (req, res) => {
    try {
        const { data, error } = await supabase.from('questions').select('*, replies(*)').order('id', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/questions', async (req, res) => {
    let { author, title, text, date } = req.body;
    if (!author || !title || !text) return res.status(400).json({ error: 'Dados incompletos.' });
    author = sanitize(author); title = sanitize(title); text = sanitize(text);
    try {
        const { data, error } = await supabase.from('questions').insert([{ author, title, text, date }]).select();
        if (error) throw error;
        res.json({ message: 'success', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/questions/:id/replies', async (req, res) => {
    let { author, text, date } = req.body;
    const qid = req.params.id;
    if (!author || !text) return res.status(400).json({ error: 'Dados incompletos.' });
    author = sanitize(author); text = sanitize(text);
    try {
        const { data, error } = await supabase.from('replies').insert([{ question_id: qid, author, text, date }]).select();
        if (error) throw error;
        res.json({ message: 'success', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/feedback', async (req, res) => {
    let { username, message } = req.body;
    if (!username || !message) return res.status(400).json({ error: 'Faltam dados.' });
    username = sanitize(username); message = sanitize(message);
    try {
        const { error } = await supabase.from('feedback').insert([{ username, message }]);
        if (error) throw error;
        res.json({ message: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/mods', async (req, res) => {
    const { search } = req.query;
    try {
        let query = supabase.from('mod_submissions').select('*').eq('is_approved', true).order('created_at', { ascending: false });
        if (search) query = query.ilike('title', `%${search}%`);
        const { data, error } = await query;
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/submissions/upload', upload.single('modFile'), async (req, res) => {
    let { username, title, description } = req.body;
    const file = req.file;
    if (!username || !title || !file) return res.status(400).json({ error: 'Dados incompletos.' });
    username = sanitize(username); title = sanitize(title); description = sanitize(description || '');
    try {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `mods/${fileName}`;
        const dangerousExtensions = ['exe', 'bat', 'sh', 'vbs', 'scr'];
        if (dangerousExtensions.includes(fileExt.toLowerCase())) return res.status(403).json({ error: 'Arquivo bloqueado: Extensão perigosa.' });
        const { error: storageError } = await supabase.storage.from('mods').upload(filePath, file.buffer, { contentType: file.mimetype });
        if (storageError) throw storageError;
        const { data: urlData } = supabase.storage.from('mods').getPublicUrl(filePath);
        const { error: dbError } = await supabase.from('mod_submissions').insert([{
            username, title, description, link: urlData.publicUrl, security_status: 'Verificado', is_approved: false
        }]);
        if (dbError) throw dbError;
        res.json({ message: 'Mod enviado com sucesso!', link: urlData.publicUrl });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/admin/verify', async (req, res) => {
    const { token } = req.body;
    if (token === supabaseKey || token === DEV_MASTER_KEY_SECRET) {
        res.json({ message: "authorized" });
    } else { res.status(401).json({ error: "unauthorized" }); }
});

apiRouter.get('/admin/stats', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY_SECRET) return res.status(401).json({ error: "unauthorized" });
    try {
        const [{ count: u }, { count: c }, { count: q }, { count: m }, { count: pm }, { count: f }] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact' }),
            supabase.from('comments').select('*', { count: 'exact' }),
            supabase.from('questions').select('*', { count: 'exact' }),
            supabase.from('mod_submissions').select('*', { count: 'exact' }).eq('is_approved', true),
            supabase.from('mod_submissions').select('*', { count: 'exact' }).eq('is_approved', false),
            supabase.from('feedback').select('*', { count: 'exact' })
        ]);
        res.json({ users: u, comments: c, questions: q, mods: m, pendingMods: pm, feedback: f });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem vazia.' });
    try {
        const systemPrompt = "Você é Dutch van der Linde líderes da gangue de RDR2.";
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEN_API_KEY}`;
        const response = await axios.post(url, { contents: [{ parts: [{ text: `${systemPrompt}\n\nUsuário: ${message}` }] }] });
        const aiResponse = response.data.candidates[0].content.parts[0].text;
        res.json({ response: aiResponse });
    } catch (err) { res.status(500).json({ response: "Desculpe, o telégrafo falhou." }); }
});

// Admin management routes (example)
apiRouter.get('/admin/users', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY_SECRET) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/admin/submissions', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY_SECRET) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('mod_submissions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/admin/logs', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY_SECRET) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/admin/feedback', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY_SECRET) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/admin/submissions/:id/approve', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY_SECRET) return res.status(401).json({ error: "unauthorized" });
    const { id } = req.params; const { is_approved } = req.body;
    try {
        const { error } = await supabase.from('mod_submissions').update({ is_approved }).eq('id', id);
        if (error) throw error;
        res.json({ message: "success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Use the router for both standard /api and Netlify's internal path
app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);

app.get('/api/admin/submissions', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY_SECRET) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('mod_submissions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the app for Netlify Functions
module.exports = app;
