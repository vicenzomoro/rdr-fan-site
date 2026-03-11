const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const axios = require('axios');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

// Configurações do Supabase
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MASTER_KEY = (process.env.DEV_MASTER_KEY || "DEV_XERIFE_1899").trim();

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

// Normalização de Caminhos para Netlify
app.use((req, res, next) => {
    req.url = req.url.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
    next();
});

// Helper: Extrair nome do arquivo da URL pública do Supabase Storage
const extractStorageFileName = (url) => {
    if (!url) return null;
    try {
        const parts = url.split('/storage/v1/object/public/mods/');
        return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
    } catch (e) { return null; }
};

// Helper: Deletar arquivo do Supabase Storage
const deleteStorageFile = async (link) => {
    const fileName = extractStorageFileName(link);
    if (fileName) {
        try {
            await supabase.storage.from('mods').remove([fileName]);
            console.log('Arquivo deletado do storage:', fileName);
        } catch (e) { console.error('Erro ao deletar arquivo:', e); }
    }
};

// Helper: Criar notificação para um usuário
const createNotification = async (username, message, type = 'info') => {
    try {
        await supabase.from('notifications').insert([{
            username,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error('Erro ao criar notificação:', e); }
};

// Middleware de Autenticação Admin
const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization || req.body.token;
    if (token === MASTER_KEY || (supabaseKey && token === supabaseKey)) return next();

    try {
        await supabase.from('security_logs').insert([{
            ip_address: req.headers['x-nf-client-connection-ip'] || req.ip || 'desconhecido',
            device: req.headers['user-agent'] || 'desconhecido',
            password_attempt: token ? (token.length > 20 ? token.substring(0, 20) + "..." : token) : "vazio",
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error("Erro ao logar invasão:", e); }

    res.status(401).json({ error: "Acesso negado, forasteiro!" });
};

// --- ROTAS PÚBLICAS ---

app.get('/health', async (req, res) => {
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        res.json({ status: "alive", database: error ? "error" : "connected", timestamp: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ status: "fail", error: e.message });
    }
});

app.get('/ping', (req, res) => res.json({ message: "Servidor Ativo!" }));

app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) return res.status(400).json({ error: "Dados incompletos." });
        const hashed = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('users').insert([{
            username: String(username).trim(),
            password: hashed,
            is_banned: false
        }]);
        if (error) throw error;
        res.json({ message: "registered" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('username', String(username).trim());
        if (error) throw error;
        if (data && data.length > 0) {
            const user = data[0];
            if (user.is_banned) return res.status(403).json({ error: "Você foi banido pelo Xerife!" });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
            res.json({ message: "logged_in", username: user.username });
        } else { res.status(401).json({ error: 'Usuário não encontrado.' }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/comments', async (req, res) => {
    const { author, text, date } = req.body;
    const { data, error } = await supabase.from('comments').insert([{ author, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

app.get('/questions', async (req, res) => {
    const { data, error } = await supabase.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/questions', async (req, res) => {
    const { author, title, text, date } = req.body;
    const { data, error } = await supabase.from('questions').insert([{ author, title, text, date }]).select();
    res.json({ data: data ? data[0] : null });
});

app.get('/mods', async (req, res) => {
    const search = req.query.search || '';
    let query = supabase.from('mod_submissions').select('*').eq('is_approved', true);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error } = await query.order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/feedback', async (req, res) => {
    const { username, message } = req.body;
    await supabase.from('feedback').insert([{ username: username || 'Anônimo', message }]);
    res.json({ message: 'sucesso' });
});

app.post('/mods', upload.single('file'), async (req, res) => {
    const { title, description, username } = req.body;
    const file = req.file;

    try {
        let publicUrl = "";

        if (file) {
            const fileName = `${Date.now()}_${file.originalname}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('mods')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) {
                console.error("Storage Error:", uploadError);
                return res.status(500).json({ error: "Erro ao subir arquivo. Verifique se o bucket 'mods' existe no Supabase Storage." });
            }

            const { data: { publicUrl: url } } = supabase.storage
                .from('mods')
                .getPublicUrl(fileName);

            publicUrl = url;
        }

        const { error } = await supabase.from('mod_submissions').insert([{
            title,
            description,
            username: username || 'Anônimo',
            link: publicUrl,
            is_approved: false
        }]);

        if (error) throw error;

        await createNotification(username || 'Anônimo', `Seu mod "${title}" foi enviado e está aguardando aprovação do Xerife!`, 'info');
        res.json({ message: "submitted" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar solicitação.", details: err.message });
    }
});

// --- ROTAS DE NOTIFICAÇÕES ---

app.get('/notifications/:username', async (req, res) => {
    const { data } = await supabase.from('notifications').select('*')
        .eq('username', req.params.username)
        .order('created_at', { ascending: false })
        .limit(20);
    res.json({ data: data || [] });
});

app.post('/notifications/:id/read', async (req, res) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id);
    res.json({ message: "ok" });
});

app.post('/notifications/read-all', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    await supabase.from('notifications').update({ is_read: true }).eq('username', username).eq('is_read', false);
    res.json({ message: "ok" });
});

// --- ROTAS ADMIN ---

app.post('/admin/verify', adminAuth, (req, res) => res.json({ message: "authorized" }));

app.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        const [u, c, m, f, q] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('comments').select('*', { count: 'exact', head: true }),
            supabase.from('mod_submissions').select('*', { count: 'exact', head: true }),
            supabase.from('feedback').select('*', { count: 'exact', head: true }),
            supabase.from('questions').select('*', { count: 'exact', head: true })
        ]);
        res.json({ users: u.count, comments: c.count, mods: m.count, feedback: f.count, questions: q.count });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/users', adminAuth, async (req, res) => {
    const { data } = await supabase.from('users').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.post('/admin/users/:id/ban', adminAuth, async (req, res) => {
    const { banned } = req.body;
    const { error } = await supabase.from('users').update({ is_banned: banned }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "success" });
});

app.get('/admin/feedback', adminAuth, async (req, res) => {
    const { data } = await supabase.from('feedback').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/admin/questions', adminAuth, async (req, res) => {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

app.get('/admin/submissions', adminAuth, async (req, res) => {
    const { data } = await supabase.from('mod_submissions').select('*').order('id', { ascending: false });
    res.json({ data: data || [] });
});

// Aprovar/Desativar mod — ao desativar, deleta arquivo do storage
app.post('/admin/mods/:id/approve', adminAuth, async (req, res) => {
    const { approved } = req.body;
    const modId = req.params.id;

    try {
        // Se está desativando, deletar arquivo do storage
        if (!approved) {
            const { data: mod } = await supabase.from('mod_submissions').select('link, username, title').eq('id', modId).single();
            if (mod) {
                await deleteStorageFile(mod.link);
                await createNotification(mod.username, `Seu mod "${mod.title}" foi desativado pelo Xerife.`, 'warning');
            }
        } else {
            // Notificar que foi aprovado
            const { data: mod } = await supabase.from('mod_submissions').select('username, title').eq('id', modId).single();
            if (mod) {
                await createNotification(mod.username, `🎉 Seu mod "${mod.title}" foi aprovado pelo Xerife! Agora está visível na galeria.`, 'success');
            }
        }

        const { error } = await supabase.from('mod_submissions').update({ is_approved: approved }).eq('id', modId);
        if (error) throw error;
        res.json({ message: "success" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Recusar mod — deleta do banco E do storage
app.delete('/admin/mods/:id', adminAuth, async (req, res) => {
    const modId = req.params.id;
    try {
        const { data: mod } = await supabase.from('mod_submissions').select('link, username, title').eq('id', modId).single();
        if (mod) {
            await deleteStorageFile(mod.link);
            await createNotification(mod.username, `Seu mod "${mod.title}" foi recusado pelo Xerife. Tente novamente com melhorias!`, 'error');
        }

        const { error } = await supabase.from('mod_submissions').delete().eq('id', modId);
        if (error) throw error;
        res.json({ message: "deleted" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/admin/logs', adminAuth, async (req, res) => {
    const { data } = await supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(50);
    res.json({ data: data || [] });
});

app.delete('/admin/comments/:id', adminAuth, async (req, res) => {
    const { error } = await supabase.from('comments').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

app.delete('/admin/questions/:id', adminAuth, async (req, res) => {
    const { error } = await supabase.from('questions').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "deleted" });
});

// --- CHAT DUTCH (GEMINI) ---
const DUTCH_SYSTEM = `Você é Dutch Van der Linde, líder carismático da gangue Van der Linde do jogo Red Dead Redemption 2. 
Fale em português brasileiro, com tom de velho oeste: firme, eloquente e às vezes misterioso. 
Mencione "parceiro", "o plano", "fé" e o fim da era dos fora-da-lei quando fizer sentido. 
Seja breve (2-4 frases). Se perguntarem algo fora do tema do jogo, redirecione com classe para o Velho Oeste.`;

app.post('/chat', async (req, res) => {
    const apiKey = (process.env.GEN_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'Chat temporariamente indisponível.' });

    const { message } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Mensagem inválida.' });

    const userText = message.trim().slice(0, 500);
    if (!userText) return res.status(400).json({ error: 'Mensagem vazia.' });

    const model = (process.env.GEN_MODEL || 'gemini-1.5-flash-latest').trim();
    try {
        const prompt = `${DUTCH_SYSTEM}\n\nUsuário pergunta: ${userText}\n\nDutch responde:`;
        const { data } = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 256, temperature: 0.8 }
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return res.status(502).json({ error: 'Resposta vazia do assistente.' });
        res.json({ response: text.trim() });
    } catch (err) {
        const body = err.response?.data;
        const status = err.response?.status;
        console.error('Gemini chat error:', status, body || err.message);
        let msg = 'O telegrafo falhou. Tente de novo.';
        if (status === 429) msg = 'Muitas mensagens. Espere um pouco, parceiro.';
        else if (status === 404) msg = 'Modelo de IA indisponível. Avise o Xerife.';
        else if (body?.error?.message) msg = body.error.message;
        res.status(status || 500).json({ error: msg });
    }
});

module.exports.handler = serverless(app);
