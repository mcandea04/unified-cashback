# Unified Cashback Search

A web application that searches for coupons and cashback offers across multiple Romanian services including Mastercard Premium Collection and CashClub.

## Features

- 🔍 **Unified Search**: Search across multiple cashback and coupon platforms
- 🏪 **Multiple Sources**: Integrates with Mastercard Premium Collection and CashClub
- 🚀 **Real-time Results**: Fast search results
- 📱 **Responsive Design**: Works on desktop and mobile
- 🤖 **Automated Scraping**: Daily automated data collection from partner sites

## Setup & Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the application**:
   ```bash
   npm start
   ```

3. **Access the app**: Open http://localhost:8888 in your browser

## Usage

### Manual Scraping
Run scrapers manually to populate the database:
```bash
npm run scrape
```

### Automated Scraping
Scrapers run automatically every day at 6 AM. You can modify the schedule in `server.js`.

### Search
Simply enter a merchant name in the search box (e.g., "eMAG", "H&M", "Zara") to find available cashback offers.

## API Endpoints

- `GET /api/search?q=<query>` - Search for merchants and offers
- `GET /api/sources` - Get available data sources
- `GET /api/health` - Health check

## Project Structure

```
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── database/
│   └── db.js             # SQLite database operations
├── scrapers/
│   ├── mastercard-scraper.js
│   ├── cashclub-scraper.js
│   └── run-scrapers.js   # Scraper orchestrator
├── routes/
│   └── search.js         # API routes
└── public/
    ├── index.html        # Frontend
    ├── style.css         # Styles
    └── script.js         # Frontend JavaScript
```

## Supported Sources

- **Mastercard Premium Collection** - Web scraping from priceless.com
- **CashClub** - Web scraping from cashclub.ro

## Development

### Adding New Scrapers
1. Create a new scraper file in `scrapers/`.
2. Implement the scraping logic.
3. Add the new scraper to `scrapers/run-scrapers.js`.
