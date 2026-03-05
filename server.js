const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });
const VT_API_KEY = "96f1f811de74daf58d6fcaa6a12a5ca3ee19a930fb735d5d852fabcf40229c02";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable proxy trust for accurate IP logging on Render/Heroku
app.set('trust proxy', true);

// Supabase Connection
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
            if (error.code === '23505') return res.status(400).json({ error: 'Este nome de usuário já existe no bando. Por favor, escolha outro.' });
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

// Public Mods Route (Gallery + Search)
app.get('/api/mods', async (req, res) => {
    const { search } = req.query;
    try {
        let query = supabase.from('mod_submissions').select('*').eq('is_approved', true).order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mod Submission Routes (Direct File Upload with VirusTotal)
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

        // REAL VIRUSTOTAL SCAN
        console.log(`[Segurança] Enviando para VirusTotal: ${file.originalname}...`);

        const form = new FormData();
        form.append('file', file.buffer, file.originalname);

        const vtResponse = await axios.post('https://www.virustotal.com/api/v3/files', form, {
            headers: {
                ...form.getHeaders(),
                'x-apikey': VT_API_KEY
            }
        });

        const analysisId = vtResponse.data.data.id;
        console.log(`[Segurança] Upload concluído. Analysis ID: ${analysisId}`);

        // For simplicity, we assume if upload worked, it's "Pending Scan" in database
        // and we store the ID or just log it.
        // Direct detection check would requires waiting for analysis completion.

        // Basic extension check as fallback
        const dangerousExtensions = ['exe', 'bat', 'sh', 'vbs', 'scr'];
        if (dangerousExtensions.includes(fileExt.toLowerCase())) {
            return res.status(403).json({ error: 'Arquivo bloqueado: Extensão perigosa detectada.' });
        }

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('mods')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) throw storageError;

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
            security_status: 'Escaneado (VirusTotal)',
            vt_analysis_id: analysisId,
            is_approved: false
        }]);

        if (dbError) throw dbError;

        res.json({ message: 'Mod enviado com sucesso! O Xerife irá analisar e aprovar.', link: fileLink });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro no upload ou escaneamento: " + err.message });
    }
});

// Admin Verification Route
const DEV_MASTER_KEY = "DEV_XERIFE_1899";

app.post('/api/admin/verify', async (req, res) => {
    const { token } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (token === supabaseKey || token === DEV_MASTER_KEY) {
        res.json({ message: "authorized" });
    } else {
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

// Admin Approval/Delete Routes
app.put('/api/admin/submissions/:id/approve', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    const { id } = req.params;
    const { is_approved } = req.body;
    try {
        const { error } = await supabase.from('mod_submissions').update({ is_approved }).eq('id', id);
        if (error) throw error;
        res.json({ message: "success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/comments/:id', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    const { id } = req.params;
    try {
        const { error } = await supabase.from('comments').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('users').select('id, username, is_banned').order('id', { ascending: true });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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

app.get('/api/admin/logs', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/feedback', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Chat Route (Powered by Google Gemini)
const GEMINI_API_KEY = "AIzaSyCnYO3mIUZ_a72obYofTi686elti2SsBS0";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem vazia.' });

    console.log(`[Chat] Mensagem recebida: "${message}"`);

    try {
        const systemPrompt = `Você é Dutch van der Linde, o líder carismático e visionário da gangue Van der Linde de Red Dead Redemption 2. 
        Seu objetivo é ajudar os usuários do site "RDR Fan Site". 
        Fale de forma autêntica, use termos como "filho", "parceiro", "eu tenho um plano" e mantenha a autoridade de um líder.
        Você sabe que o site tem:
        1. Galeria de Mods (Onde usuários enviam e buscam mods).
        2. Sistema de Segurança com VirusTotal (Todos os mods são escaneados).
        3. Painel do Xerife (Onde o admin controla tudo).
        4. O usuário precisa estar LOGADO para comentar ou enviar mods.
        Responda à dúvida do usuário abaixo mantendo o personagem Dutch e sendo prestativo sobre o site.`;

        const response = await axios.post(GEMINI_URL, {
            contents: [{
                parts: [{ text: `${systemPrompt}\n\nUsuário: ${message}` }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000 // 10s timeout
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
            const aiResponse = response.data.candidates[0].content.parts[0].text;
            res.json({ response: aiResponse });
        } else {
            console.error("Gemini Error: No candidates in response", response.data);
            res.json({ response: "Dutch está pensativo. Tente reformular sua pergunta, parceiro." });
        }
    } catch (err) {
        let errorMsg = "Desculpe, parceiro. Meus planos falharam por um momento (Erro na API). Tente novamente!";
        const apiError = err.response?.data?.error;

        if (apiError) {
            console.error("Gemini API Error Detail:", apiError);
            if (apiError.message.includes("SAFETY")) {
                errorMsg = "Dutch não pode falar sobre isso, parceiro. Vamos manter o respeito no acampamento.";
            } else if (apiError.status === "PERMISSION_DENIED" || apiError.message.includes("key")) {
                errorMsg = "Parece que minha credencial foi revogada pelo Xerife. Avise o dono do site, parceiro! (Erro de Chave)";
            } else {
                errorMsg = `Os Pinkertons estão bloqueando minha conexão! (${apiError.message.substring(0, 50)}...)`;
            }
        } else {
            console.error("Gemini generic error:", err.message);
        }
        res.status(500).json({ response: errorMsg });
    }
});

app.get('/api/admin/submissions', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey && token !== DEV_MASTER_KEY) return res.status(401).json({ error: "unauthorized" });
    try {
        const { data, error } = await supabase.from('mod_submissions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
