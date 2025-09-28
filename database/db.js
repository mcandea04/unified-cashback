const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, "cashback.db"));
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create merchants table
        this.db.run(`
                    CREATE TABLE IF NOT EXISTS merchants (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        normalized_name TEXT NOT NULL,
                        source TEXT NOT NULL,
                        url TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

        // Create offers table
        this.db.run(`
                    CREATE TABLE IF NOT EXISTS offers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        merchant_id INTEGER NOT NULL,
                        description TEXT,
                        cashback_rate TEXT,
                        offer_type TEXT,
                        source TEXT NOT NULL,
                        active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (merchant_id) REFERENCES merchants (id)
                    )
                `);

        // Create indexes for better search performance
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_merchants_normalized ON merchants(normalized_name)`,
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_merchants_source ON merchants(source)`,
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_offers_merchant ON offers(merchant_id)`,
          (err) => {
            if (err) {
              console.error("Database initialization failed:", err);
              reject(err);
            } else {
              console.log("Database initialized");
              resolve();
            }
          },
        );
      });
    });
  }

  normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async insertMerchant(name, source, url = null) {
    return new Promise((resolve, reject) => {
      const normalizedName = this.normalizeName(name);

      // Check if merchant already exists
      this.db.get(
        "SELECT id FROM merchants WHERE normalized_name = ? AND source = ?",
        [normalizedName, source],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            resolve(row.id);
            return;
          }

          // Insert new merchant
          this.db.run(
            "INSERT INTO merchants (name, normalized_name, source, url) VALUES (?, ?, ?, ?)",
            [name, normalizedName, source, url],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            },
          );
        },
      );
    });
  }

  async insertOffer(merchantId, description, cashbackRate, offerType, source) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO offers (merchant_id, description, cashback_rate, offer_type, source) VALUES (?, ?, ?, ?, ?)",
        [merchantId, description, cashbackRate, offerType, source],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        },
      );
    });
  }

  async searchMerchants(query) {
    return new Promise((resolve, reject) => {
      const normalizedQuery = this.normalizeName(query);

      this.db.all(
        `
                SELECT m.*, GROUP_CONCAT(o.description) as offer_descriptions,
                       GROUP_CONCAT(o.cashback_rate) as cashback_rates,
                       GROUP_CONCAT(o.offer_type) as offer_types
                FROM merchants m
                LEFT JOIN offers o ON m.id = o.merchant_id AND o.active = 1
                WHERE m.normalized_name LIKE ?
                GROUP BY m.id
                ORDER BY
                    CASE
                        WHEN m.normalized_name = ? THEN 1
                        WHEN m.normalized_name LIKE ? THEN 2
                        ELSE 3
                    END,
                    m.name
            `,
        [`%${normalizedQuery}%`, normalizedQuery, `${normalizedQuery}%`],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        },
      );
    });
  }

  async clearSourceData(source) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("DELETE FROM offers WHERE source = ?", [source]);
        this.db.run(
          "DELETE FROM merchants WHERE source = ?",
          [source],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
        );
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
