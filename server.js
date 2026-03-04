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
app.post('/api/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token === supabaseKey) {
        res.json({ message: "authorized" });
    } else {
        res.status(401).json({ error: "unauthorized" });
    }
});

// Delete Comment Route
app.delete('/api/comments/:id', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== supabaseKey) {
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
