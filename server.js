const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Helper function to read DB
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return { complaints: [], settings: {}, ab_stats: { a: 0, b: 0 } };
    }
};

// Helper function to write DB
const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("Error writing DB:", err);
    }
};

// Routes for Complaints
app.get('/api/complaints', (req, res) => {
    const db = readDB();
    res.json(db.complaints);
});

app.post('/api/complaints', (req, res) => {
    const db = readDB();
    const newComplaint = req.body;
    db.complaints.push(newComplaint);
    writeDB(db);
    res.status(201).json(newComplaint);
});

app.put('/api/complaints/:id', (req, res) => {
    const db = readDB();
    const id = req.params.id;
    const index = db.complaints.findIndex(c => c.id === id);
    if (index !== -1) {
        db.complaints[index] = { ...db.complaints[index], ...req.body };
        writeDB(db);
        res.json(db.complaints[index]);
    } else {
        res.status(404).json({ message: "Complaint not found" });
    }
});

app.delete('/api/complaints/:id', (req, res) => {
    const db = readDB();
    const id = req.params.id;
    db.complaints = db.complaints.filter(c => c.id !== id);
    writeDB(db);
    res.json({ message: "Complaint deleted" });
});

// Routes for Settings
app.get('/api/settings', (req, res) => {
    const db = readDB();
    res.json(db.settings);
});

app.post('/api/settings', (req, res) => {
    const db = readDB();
    db.settings = req.body;
    writeDB(db);
    res.json(db.settings);
});

// Routes for AB Stats
app.get('/api/ab_stats', (req, res) => {
    const db = readDB();
    res.json(db.ab_stats);
});

app.post('/api/ab_stats', (req, res) => {
    const db = readDB();
    db.ab_stats = req.body;
    writeDB(db);
    res.json(db.ab_stats);
});

app.post('/api/complaints/sync', (req, res) => {
    const db = readDB();
    db.complaints = req.body;
    writeDB(db);
    res.json({ message: "Complaints synced" });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
