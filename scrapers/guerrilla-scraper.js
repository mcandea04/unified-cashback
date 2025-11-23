const { chromium } = require("playwright");
const Database = require("../database/db");

class GuerrillaScraper {
  constructor() {
    this.source = "guerrilla";
    this.url = "https://www.guerrillaradio.ro/avanpost/";
    this.db = new Database();
  }

  async scrape() {
    console.log("Starting Guerrilla Radio Avanpost scraper...");

    const browser = await chromium.launch({
      headless: true,
    });
    const page = await browser.newPage();

    try {
      await page.goto(this.url, { waitUntil: "networkidle" });

      // Scroll to bottom to ensure all items load
      let previousHeight = 0;
      let currentHeight = await page.evaluate(() => document.body.scrollHeight);

      while (previousHeight !== currentHeight) {
        previousHeight = currentHeight;
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1000);
        currentHeight = await page.evaluate(() => document.body.scrollHeight);
      }

      // Extract data
      const merchants = await page.evaluate(() => {
        const items = document.querySelectorAll("a.outpost-inner");
        return Array.from(items).map((item) => {
          const nameElement = item.querySelector("h3");
          return {
            name: nameElement ? nameElement.innerText.trim() : "Unknown",
            url: item.href,
          };
        });
      });

      console.log(`Found ${merchants.length} merchants from Guerrilla Radio`);

      // Clear existing data
      await this.db.clearSourceData(this.source);

      // Insert new data
      let savedCount = 0;
      for (const merchant of merchants) {
        try {
          if (!merchant.name) continue;

          const merchantId = await this.db.insertMerchant(
            merchant.name,
            this.source,
            merchant.url
          );

          // Since there are no specific offers listed on the main page, we add a generic one
          await this.db.insertOffer(
            merchantId,
            "Avanpost Radio Guerrilla",
            "Check details",
            "avanpost",
            this.source
          );

          savedCount++;
        } catch (error) {
          console.error(`Error saving merchant ${merchant.name}:`, error);
        }
      }

      console.log(`Saved ${savedCount} merchants from Guerrilla Radio`);
      return savedCount;
    } catch (error) {
      console.error("Error scraping Guerrilla Radio:", error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

module.exports = GuerrillaScraper;
