const MastercardScraper = require("./mastercard-scraper");
const CashclubScraper = require("./cashclub-scraper");
const GuerrillaScraper = require("./guerrilla-scraper");
const Database = require("../database/db");

async function runScrapers() {
  console.log("Starting scraper run...");

  // Initialize database first
  const db = new Database();
  await db.init();

  const startTime = Date.now();

  const allScrapers = [
    {
      name: "Mastercard Premium Collection",
      scraper: new MastercardScraper(),
      key: "mastercard",
    },
    { name: "CashClub", scraper: new CashclubScraper(), key: "cashclub" },
    {
      name: "Guerrilla Radio Avanpost",
      scraper: new GuerrillaScraper(),
      key: "guerrilla",
    },
  ];

  const targetScraper = process.argv[2];
  const scrapersToRun = targetScraper
    ? allScrapers.filter((s) => s.key === targetScraper)
    : allScrapers;

  if (scrapersToRun.length === 0) {
    console.error(
      `No scraper found for key: ${targetScraper}. Available keys: ${allScrapers
        .map((s) => s.key)
        .join(", ")}`,
    );
    return;
  }

  const results = {};

  for (const { name, scraper } of scrapersToRun) {
    try {
      console.log(`\n--- Running ${name} scraper ---`);
      const count = await scraper.scrape();
      results[name] = { success: true, count };
      console.log(`✓ ${name}: ${count} offers scraped`);
    } catch (error) {
      console.error(`✗ ${name} failed:`, error.message);
      results[name] = { success: false, error: error.message };
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log("\n--- Scraper Summary ---");
  console.log(`Total time: ${duration}s`);

  let totalOffers = 0;
  for (const [name, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✓ ${name}: ${result.count} offers`);
      totalOffers += result.count;
    } else {
      console.log(`✗ ${name}: Failed - ${result.error}`);
    }
  }

  console.log(`Total offers scraped: ${totalOffers}`);
  return results;
}

// Allow running directly
if (require.main === module) {
  runScrapers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Scraper run failed:", error);
      process.exit(1);
    });
}

module.exports = runScrapers;
