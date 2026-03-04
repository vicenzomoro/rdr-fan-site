const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the current directory
app.use(express.static(__dirname));

// Initialize SQLite database
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            date TEXT NOT NULL
        )`);
    }
});

// API Routes

// Get all comments
app.get('/api/comments', (req, res) => {
    db.all("SELECT * FROM comments ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// Add a new comment
app.post('/api/comments', (req, res) => {
    const { author, text, date } = req.body;
    if (!author || !text) {
        res.status(400).json({ error: 'Author and text are required.' });
        return;
    }

    const sql = "INSERT INTO comments (author, text, date) VALUES (?,?,?)";
    const params = [author, text, date];
    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: {
                id: this.lastID,
                author,
                text,
                date
            }
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
