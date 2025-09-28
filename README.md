# Unified Cashback Search

A web application that searches for coupons and cashback offers across multiple Romanian services including Mastercard Premium Collection, CashClub, and more.

## Features

- 🔍 **Unified Search**: Search across multiple cashback and coupon platforms
- 🏪 **Multiple Sources**: Integrates with Mastercard Premium Collection, CashClub, and TopCashback (coming soon)
- 🚀 **Real-time Results**: Fast search with fuzzy matching
- 📱 **Responsive Design**: Works on desktop and mobile
- 🤖 **Automated Scraping**: Daily automated data collection from partner sites

## Setup & Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers** (for web scraping):
   ```bash
   npx playwright install
   ```

3. **Run the application**:
   ```bash
   npm start
   ```

4. **Access the app**: Open http://localhost:8888 in your browser

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

### ✅ Implemented
- **Mastercard Premium Collection** - Web scraping from priceless.com
- **CashClub** - Web scraping from cashclub.ro

### 🔄 Coming Soon
- **TopCashback** - Via Fidel API integration
- **UniCredit Shop Smart** - Advanced scraping techniques
- **Raiffeisen Smart Market** - Mobile app integration
- **Banca Transilvania Offers** - Banking portal integration

## Development

### Adding New Scrapers
1. Create a new scraper class in `scrapers/`
2. Implement the `scrape()` method
3. Add to `run-scrapers.js`

### Database Schema
- **merchants**: Store merchant information (name, source, URL)
- **offers**: Store offer details (description, cashback rate, type)

## Notes

- Data is refreshed daily via automated scraping
- Search uses fuzzy matching for better results
- All scrapers handle errors gracefully and continue operation
- The application uses SQLite for simplicity and portability