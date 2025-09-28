const https = require("https");
const Database = require("../database/db");

class CashClubScraper {
  constructor() {
    this.source = "cashclub";
    this.url = "https://cashclub.ro/magazine";
    this.db = new Database();
  }

  async getBuildId() {
    return new Promise((resolve, reject) => {
      https
        .get(this.url, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const match = data.match(/"buildId":"([^"]+)"/);
              if (match && match[1]) {
                resolve(match[1]);
              } else {
                reject("Could not find buildId");
              }
            } catch (e) {
              reject(e);
            }
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  async fetchJson(url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  async scrape() {
    console.log("Starting CashClub scraper...");

    try {
      const buildId = await this.getBuildId();
      console.log(`Found CashClub buildId: ${buildId}`);

      let allOffers = [];
      let pageNumber = 1;
      let maxPages = 1; // Will be updated from the first API response

      while (pageNumber <= maxPages) {
        console.log(`Scraping CashClub API page ${pageNumber}...`);
        const apiUrl = `https://cashclub.ro/_next/data/${buildId}/ro/shops.json?page=${pageNumber}`;

        try {
          const json = await this.fetchJson(apiUrl);
          const shopsData = json?.pageProps?.shops;

          if (!shopsData || !shopsData.data || shopsData.data.length === 0) {
            console.log(
              `No more offers found on page ${pageNumber}. Stopping.`,
            );
            break;
          }

          if (pageNumber === 1) {
            maxPages = shopsData.last_page || 105; // Fallback to 105 if not found
            console.log(`Total pages set to: ${maxPages}`);
          }

          const offers = shopsData.data.map((shop) => {
            const name = shop.name;
            const cashback = shop.cashbackValue || "Disponibil";
            let description = `Cashback disponibil pentru ${name}`;
            if (cashback !== "Disponibil") {
              description = `${name} oferă ${cashback} cashback prin CashClub`;
            }
            const url = `https://cashclub.ro/shops/${shop.trimmedDomain}`;

            return {
              name,
              description,
              cashback,
              url,
            };
          });

          console.log(`Found ${offers.length} offers on page ${pageNumber}`);
          allOffers = allOffers.concat(offers);

          pageNumber++;
        } catch (error) {
          console.error(
            `Failed to fetch or process page ${pageNumber}:`,
            error.message,
          );
          // Stop if a page fails, as subsequent pages might depend on it
          break;
        }
      }

      // Remove duplicates - though with API this is less likely
      const uniqueOffers = [];
      const seenNames = new Set();

      for (const offer of allOffers) {
        const normalizedName = offer.name.toLowerCase().replace(/[^\w]/g, "");
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniqueOffers.push(offer);
        }
      }

      console.log(
        `Found ${uniqueOffers.length} unique offers from CashClub across ${pageNumber - 1} pages.`,
      );

      // Clear existing data for this source
      await this.db.clearSourceData(this.source);

      // Insert new data
      let savedCount = 0;
      for (const offer of uniqueOffers) {
        try {
          const merchantId = await this.db.insertMerchant(
            offer.name,
            this.source,
            offer.url,
          );

          await this.db.insertOffer(
            merchantId,
            offer.description,
            offer.cashback,
            "cashback",
            this.source,
          );

          savedCount++;
        } catch (error) {
          console.error(`Error saving offer for ${offer.name}:`, error.message);
        }
      }

      console.log(`Saved ${savedCount} offers from CashClub`);
      return savedCount;
    } catch (error) {
      console.error("Error scraping CashClub:", error);
      throw error;
    }
  }
}

module.exports = CashClubScraper;
