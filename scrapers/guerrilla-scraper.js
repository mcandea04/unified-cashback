const { chromium } = require("playwright");

class GuerrillaScraper {
  constructor() {
    this.source = "guerrilla";
    this.url = "https://www.guerrillaradio.ro/avanpost/";
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

      // Transform to unified format
      const results = [];
      for (const merchant of merchants) {
        if (!merchant.name) continue;

        results.push({
          name: merchant.name,
          source: this.source,
          url: merchant.url,
          offers: [
            {
              description: "Avanpost Radio Guerrilla",
              cashback: "Check details",
            },
          ],
        });
      }

      console.log(`Processed ${results.length} merchants from Guerrilla Radio`);
      return results;
    } catch (error) {
      console.error("Error scraping Guerrilla Radio:", error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

module.exports = GuerrillaScraper;
