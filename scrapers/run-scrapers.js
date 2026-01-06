const fs = require("fs");
const path = require("path");
const MastercardScraper = require("./mastercard-scraper");
const CashclubScraper = require("./cashclub-scraper");
const GuerrillaScraper = require("./guerrilla-scraper");

const OUTPUT_PATH = path.join(__dirname, "..", "docs", "data", "offers.json");

async function runScrapers() {
  console.log("Starting scraper run...");

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
  let allOffers = [];

  // If running a single scraper, load existing data first
  if (targetScraper) {
    try {
      const existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
      // Keep offers from other sources
      allOffers = existingData.offers.filter(
        (o) => o.source !== targetScraper,
      );
      console.log(
        `Loaded ${allOffers.length} existing offers from other sources`,
      );
    } catch (e) {
      console.log("No existing data found, starting fresh");
    }
  }

  for (const { name, scraper, key } of scrapersToRun) {
    try {
      console.log(`\n--- Running ${name} scraper ---`);
      const offers = await scraper.scrape();
      results[name] = { success: true, count: offers.length };
      allOffers = allOffers.concat(offers);
      console.log(`✓ ${name}: ${offers.length} offers scraped`);
    } catch (error) {
      console.error(`✗ ${name} failed:`, error.message);
      results[name] = { success: false, error: error.message };
    }
  }

  // Write to JSON file
  const outputData = {
    lastUpdated: new Date().toISOString(),
    offers: allOffers,
  };

  // Ensure directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2));
  console.log(`\nWrote ${allOffers.length} offers to ${OUTPUT_PATH}`);

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
