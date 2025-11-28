# Project Context

## Purpose
The `unified-cashback-search` project is a centralized platform designed to aggregate and search for coupons and cashback offers from multiple sources (e.g., CashClub, Guerrilla Radio). It aims to provide users with a unified interface to find the best deals across various merchants.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (`sqlite3`)
- **Scraping**: Playwright, Native Node.js `https` module
- **Search**: Fuse.js (fuzzy search)
- **Scheduling**: node-cron
- **Frontend**: Static HTML/JS (served from `public/`)

## Project Conventions

### Code Style
- **Language**: JavaScript (CommonJS `require`)
- **Formatting**: 2-space indentation, semicolons used.
- **Naming**:
    - Variables/Functions: `camelCase`
    - Classes: `PascalCase` (e.g., `CashClubScraper`)
    - Files: `kebab-case` (e.g., `run-scrapers.js`)

### Architecture Patterns
- **Server**: `server.js` acts as the entry point, initializing the database, setting up routes, and scheduling cron jobs.
- **Scrapers**: Located in `scrapers/`. Each scraper is a class with a `scrape()` method.
- **Database**: Database logic is encapsulated in `database/db.js`.
- **Routes**: API routes are defined in `routes/` (e.g., `routes/search.js`).

### Testing Strategy
- Currently ad-hoc/manual testing.
- Scrapers can be run manually via `npm run scrape`.

### Git Workflow
- Standard feature branch workflow (implied).

## Domain Context
- **Merchants**: Stores or services offering deals.
- **Offers**: Specific cashback rates or coupons associated with a merchant.
- **Sources**: The origin of the offer (e.g., "cashclub", "guerrilla").

## Important Constraints
- Scrapers must handle potential anti-bot measures or API rate limits.
- Data is refreshed daily via cron job.

## External Dependencies
- **CashClub**: `https://cashclub.ro` (and its API)
- **Guerrilla Radio**: `https://www.guerrillaradio.ro`
- **Mastercard Premium Collection**: `https://www.priceless.com`
