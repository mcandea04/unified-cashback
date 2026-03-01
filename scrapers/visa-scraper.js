const { chromium } = require("playwright");

class VisaScraper {
  constructor() {
    this.source = "visa";
    this.url = "https://www.visa.ro/ro_ro/visa-oferte-si-avantaje/";
  }

  async scrape() {
    console.log("Starting MyVisa scraper...");

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(this.url, { waitUntil: "networkidle", timeout: 30000 });

      // Scroll to load all offers (lazy loading)
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight)
        );
        await page.waitForTimeout(800);
      }

      const offers = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a"));
        const results = [];
        const seen = new Set();

        for (const link of links) {
          const href = link.getAttribute("href") || "";
          if (
            !href.match(/\/visa-oferte-si-avantaje\/[a-z]/) ||
            href.endsWith("/visa-oferte-si-avantaje/")
          )
            continue;

          const parts = href.split("/").filter(Boolean);
          const slug = parts[parts.length - 2] || "";
          if (seen.has(slug) || slug.length < 2) continue;
          seen.add(slug);

          const name = decodeURIComponent(slug)
            .replace(/-/g, " ")
            .replace(/%E2%80%93/g, " - ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

          const desc = link.innerText.trim().slice(0, 200);

          results.push({ name, href, desc });
        }
        return results;
      });

      console.log(`Found ${offers.length} offers from MyVisa`);

      const results = offers.map((offer) => ({
        name: offer.name,
        source: this.source,
        url: `https://www.visa.ro${offer.href}`,
        offers: [
          {
            description: offer.desc || `Oferta Visa la ${offer.name}`,
            cashback: "Oferta Visa",
          },
        ],
      }));

      console.log(`Processed ${results.length} offers from MyVisa`);
      return results;
    } catch (error) {
      console.error("Error scraping MyVisa:", error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

module.exports = VisaScraper;
