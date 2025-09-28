const { chromium } = require("playwright");
const Database = require("../database/db");

class MastercardScraper {
  constructor() {
    this.source = "mastercard";
    this.url = "https://www.priceless.com/filter/options";
    this.db = new Database();
  }

  extractMerchantNameFromUrl(url) {
    try {
      const urlParts = url.split("/");
      if (urlParts.length > 2) {
        const slug = urlParts[urlParts.length - 3];
        if (slug) {
          // Convert slug to title case
          return slug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
            .replace(/ At /g, " at "); // Fix casing for "at"
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  async scrape() {
    console.log("Starting Mastercard Premium Collection scraper...");

    const browser = await chromium.launch({
      headless: true,
    });
    const page = await browser.newPage();

    try {
      await page.goto(this.url, { waitUntil: "networkidle" });

      let offers = [];
      let previousHeight = 0;
      let currentHeight = await page.evaluate(() => document.body.scrollHeight);

      // Keep scrolling until we can't scroll any further
      while (previousHeight !== currentHeight) {
        previousHeight = currentHeight;
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(2000); // Wait for new content to load
        currentHeight = await page.evaluate(() => document.body.scrollHeight);
      }

      // Now that we have scrolled to the bottom, get all the offers
      offers = await page.evaluate(() => {
        if (window.g_category_products_and_collections) {
          return window.g_category_products_and_collections;
        }
        return [];
      });

      console.log(`Found ${offers.length} offers from Mastercard`);

      // Clear existing data for this source
      await this.db.clearSourceData(this.source);

      // Insert new data
      let savedCount = 0;
      for (const offer of offers) {
        try {
          const merchantName =
            this.extractMerchantNameFromUrl(offer.productUrl) ||
            offer.pDisplayName;

          const merchantId = await this.db.insertMerchant(
            merchantName,
            this.source,
            `https://www.priceless.com${offer.productUrl}`
          );

          await this.db.insertOffer(
            merchantId,
            offer.pDisplayName,
            offer.displayPrice,
            "premium_collection",
            this.source
          );

          savedCount++;
        } catch (error) {
          console.error(`Error saving offer for ${offer.pDisplayName}:`, error);
        }
      }

      console.log(
        `Saved ${savedCount} offers from Mastercard Premium Collection`
      );
      return savedCount;
    } catch (error) {
      console.error("Error scraping Mastercard:", error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

module.exports = MastercardScraper;
