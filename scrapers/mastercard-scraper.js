const https = require("https");

class MastercardScraper {
  constructor() {
    this.source = "mastercard";
    this.baseUrl = "https://www.priceless.com";
    this.apiUrl =
      "https://www.priceless.com/filter/getFilterProducts?offset=%OFFSET%&limit=50";
  }

  fetchPage(offset) {
    const url = this.apiUrl.replace("%OFFSET%", offset);
    return new Promise((resolve, reject) => {
      https
        .get(url, { headers: { Cookie: "site=ro_RO" } }, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse page at offset ${offset}`));
            }
          });
        })
        .on("error", reject);
    });
  }

  async scrape() {
    console.log("Starting Mastercard Premium Collection scraper...");

    try {
      const firstPage = await this.fetchPage(0);
      const total = firstPage.pagination.total || 0;
      console.log(`API reports ${total} total products`);

      const allProducts = [...firstPage.results];
      let offset = 50;

      while (offset < total) {
        try {
          const page = await this.fetchPage(offset);
          if (!page.results || page.results.length === 0) break;
          allProducts.push(...page.results);
          console.log(
            `  Fetched offset ${offset}: ${page.results.length} products`
          );
        } catch (e) {
          console.log(`  Skipping offset ${offset}: ${e.message}`);
        }
        offset += 50;
      }

      console.log(`Found ${allProducts.length} products from Mastercard`);

      const results = [];
      for (const product of allProducts) {
        const name = product.productName;
        if (!name) continue;

        const href = product.attributes?.href || "";
        const priceText = product.priceText || "";
        const location = product.productLocationText || "";

        results.push({
          name,
          source: this.source,
          url: href ? `${this.baseUrl}${href}` : this.baseUrl,
          offers: [
            {
              description: [name, location].filter(Boolean).join(" - "),
              cashback: priceText || "Oferta",
            },
          ],
        });
      }

      console.log(
        `Processed ${results.length} offers from Mastercard Premium Collection`
      );
      return results;
    } catch (error) {
      console.error("Error scraping Mastercard:", error);
      throw error;
    }
  }
}

module.exports = MastercardScraper;
