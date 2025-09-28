const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const Database = require('./database/db');
const searchRoutes = require('./routes/search');
const runScrapers = require('./scrapers/run-scrapers');

const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
const db = new Database();
db.init();

// Routes
app.use('/api', searchRoutes);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Schedule scrapers to run daily at 6 AM
cron.schedule('0 6 * * *', () => {
    console.log('Running daily scrapers...');
    runScrapers();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Run scrapers manually with: npm run scrape');
});
