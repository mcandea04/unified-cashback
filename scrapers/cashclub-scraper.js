const https = require("https");

class CashClubScraper {
  constructor() {
    this.source = "cashclub";
    this.url = "https://cashclub.ro/magazine";
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
      let allOffers = [];
      let pageNumber = 1;
      let maxPages = 1;

      while (pageNumber <= maxPages) {
        console.log(`Scraping CashClub API page ${pageNumber}...`);
        const apiUrl = `https://api.cashclub.ro/api/shops?pageNumber=${pageNumber}`;

        try {
          const json = await this.fetchJson(apiUrl);

          // The new API returns data directly in the root object
          // Structure: { data: [...], lastPage: 86, ... }
          const shopsData = json.data;

          if (!shopsData || shopsData.length === 0) {
            console.log(
              `No more offers found on page ${pageNumber}. Stopping.`,
            );
            break;
          }

          if (pageNumber === 1) {
            maxPages = json.lastPage || 100;
            console.log(`Total pages set to: ${maxPages}`);
          }

          const offers = shopsData.map((shop) => {
            const name = shop.name;
            const cashback = shop.cashbackValue || "Disponibil";
            let description = `Cashback disponibil pentru ${name}`;
            if (cashback !== "Disponibil") {
              description = `${name} oferă ${cashback} cashback prin CashClub`;
            }
            // Updated URL format based on user feedback and API data
            const url = `https://cashclub.ro/magazine/${shop.trimmedDomain}/${shop.detailsId}`;

            return {
              name,
              source: this.source,
              url,
              offers: [
                {
                  description,
                  cashback,
                },
              ],
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

      // Remove duplicates
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

      return uniqueOffers;
    } catch (error) {
      console.error("Error scraping CashClub:", error);
      throw error;
    }
  }
}

module.exports = CashClubScraper;
