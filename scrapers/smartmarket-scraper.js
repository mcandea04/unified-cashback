const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");
const sharp = require("sharp");

class SmartMarketScraper {
  constructor() {
    this.source = "smartmarket";
    this.url = "https://www.raiffeisen.ro/smart-market";
    this.inputDir = path.join(__dirname, "smartmarket-input");
    this.framesDir = path.join(__dirname, "smartmarket-frames");
    this.ollamaUrl = "http://localhost:11434/api/generate";
    this.primaryModel = "llama3.2-vision";
    this.fallbackModel = null;
    this.similarityThreshold = 10;
  }

  async scrape() {
    console.log("Starting Smart Market scraper...");

    try {
      // Extract frames from video if no frames exist yet
      let frameFiles = this.getFrameFiles();
      if (frameFiles.length === 0) {
        const videoPath = this.findVideoFile();
        if (!videoPath) {
          console.log(
            "No frames or video found. Place a screen recording in scrapers/smartmarket-input/"
          );
          return [];
        }

        console.log(`Found video: ${path.basename(videoPath)}`);
        await this.extractFrames(videoPath);
        frameFiles = this.getFrameFiles();
      }

      if (frameFiles.length === 0) {
        console.log("Frame extraction produced no frames");
        return [];
      }

      const frameLimit = process.env.FRAME_LIMIT
        ? parseInt(process.env.FRAME_LIMIT, 10)
        : frameFiles.length;
      const framesToProcess = frameFiles.slice(0, frameLimit);

      console.log(
        `Processing ${framesToProcess.length} of ${frameFiles.length} frames...`
      );

      const allOffers = [];

      for (let i = 0; i < framesToProcess.length; i++) {
        const frameFile = framesToProcess[i];
        const framePath = path.join(this.framesDir, frameFile);
        console.log(`\nFrame ${i + 1}/${framesToProcess.length}: ${frameFile}`);

        try {
          const offers = await this.processFrame(framePath);
          console.log(`  Extracted ${offers.length} offers`);
          allOffers.push(...offers);
        } catch (error) {
          console.error(`  Error processing frame: ${error.message}`);
        }
      }

      console.log(`\nTotal offers before deduplication: ${allOffers.length}`);
      const uniqueOffers = this.deduplicateOffers(allOffers);
      console.log(`Unique offers after deduplication: ${uniqueOffers.length}`);

      return uniqueOffers;
    } catch (error) {
      console.error("Error in Smart Market scraper:", error);
      throw error;
    }
  }

  findVideoFile() {
    if (!fs.existsSync(this.inputDir)) {
      return null;
    }

    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const files = fs.readdirSync(this.inputDir);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (videoExtensions.includes(ext)) {
        return path.join(this.inputDir, file);
      }
    }
    return null;
  }

  async extractFrames(videoPath) {
    console.log("Extracting frames from video at 1 fps...");

    fs.mkdirSync(this.framesDir, { recursive: true });

    // Clean existing frames
    for (const file of fs.readdirSync(this.framesDir)) {
      if (file.startsWith("frame-")) {
        fs.unlinkSync(path.join(this.framesDir, file));
      }
    }

    const outputPattern = path.join(this.framesDir, "frame-%04d.png");
    execSync(`ffmpeg -i "${videoPath}" -vf fps=1 "${outputPattern}" -y`, {
      stdio: "pipe",
    });

    const rawFrames = this.getFrameFiles();
    console.log(`Extracted ${rawFrames.length} raw frames`);

    // Deduplicate similar frames using perceptual hashing
    const uniqueFrames = await this.deduplicateFrames(
      rawFrames.map((f) => path.join(this.framesDir, f))
    );

    // Remove duplicate frames from disk
    const uniqueSet = new Set(uniqueFrames.map((f) => path.basename(f)));
    for (const file of rawFrames) {
      if (!uniqueSet.has(file)) {
        fs.unlinkSync(path.join(this.framesDir, file));
      }
    }

    console.log(
      `Kept ${uniqueFrames.length} unique frames after deduplication`
    );
  }

  async calculatePHash(imagePath) {
    const { data } = await sharp(imagePath)
      .resize(8, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (const pixel of data) {
      sum += pixel;
    }
    const avg = sum / data.length;

    let hash = BigInt(0);
    for (let i = 0; i < data.length; i++) {
      if (data[i] > avg) {
        hash |= BigInt(1) << BigInt(i);
      }
    }
    return hash;
  }

  hammingDistance(hash1, hash2) {
    let xor = hash1 ^ hash2;
    let distance = 0;
    while (xor > 0n) {
      distance += Number(xor & 1n);
      xor >>= 1n;
    }
    return distance;
  }

  async deduplicateFrames(framePaths) {
    console.log("Deduplicating frames by perceptual hash...");

    const uniqueFrames = [];
    const hashes = [];

    for (const framePath of framePaths) {
      const hash = await this.calculatePHash(framePath);

      let isDuplicate = false;
      for (const existingHash of hashes) {
        if (this.hammingDistance(hash, existingHash) < this.similarityThreshold) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueFrames.push(framePath);
        hashes.push(hash);
      }
    }

    return uniqueFrames;
  }

  getFrameFiles() {
    if (!fs.existsSync(this.framesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.framesDir)
      .filter(
        (f) =>
          f.startsWith("frame-") && (f.endsWith(".png") || f.endsWith(".jpg"))
      )
      .sort();
  }

  async processFrame(framePath) {
    const cards = await this.cropCards(framePath);
    console.log(`  Cropped ${cards.length} cards`);

    const offers = [];

    for (let i = 0; i < cards.length; i++) {
      try {
        const cardBuffer = cards[i];
        const extracted = await this.extractFromCard(cardBuffer);

        if (extracted && extracted.merchant && extracted.cashback) {
          const merchantName = extracted.merchant.trim();
          const lowerName = merchantName.toLowerCase();

          // Filter out UI elements, app branding, and invalid entries
          const invalidNames = [
            "descopera", "recomandate", "cauta", "filtre",
            "toate campaniile", "campaniile mele", "parteneri",
            "recompense", "profil", "la noriel", "la avon",
            "smart market", "raiffeisen smart market",
          ];

          if (
            merchantName &&
            merchantName.length >= 2 &&
            !invalidNames.includes(lowerName) &&
            !lowerName.startsWith("la ") &&
            !lowerName.startsWith("ai de la")
          ) {
            offers.push({
              name: merchantName,
              source: this.source,
              url: this.url,
              offers: [
                {
                  description: `${extracted.cashback} la ${merchantName}`,
                  cashback: extracted.cashback,
                },
              ],
            });
          }
        }
      } catch (error) {
        console.log(`    Card ${i + 1} extraction failed: ${error.message}`);
      }
    }

    return offers;
  }

  async cropCards(framePath) {
    const image = sharp(framePath);
    const metadata = await image.metadata();

    const { width, height } = metadata;
    console.log(`  Image dimensions: ${width}x${height}`);

    // Card layout for 1080x2340 screenshots (based on visual analysis)
    // - Header + search bar + "Recomandate" label: ~460px
    // - Cards in 2 columns with ~20px margins
    // - Each card ~510px wide, ~540px tall (image + logo + description)
    // - Row spacing: ~580px (card height + gap)

    const cardWidth = 510;
    const cardHeight = 540;
    const leftColX = 20;
    const rightColX = 550;
    const startY = 460;
    const rowSpacing = 580;

    const cardPositions = [];

    // Calculate visible rows (typically 2-3 rows visible per frame)
    const maxRows = Math.floor((height - startY - 120) / rowSpacing) + 1;
    const numRows = Math.min(maxRows, 3);

    for (let row = 0; row < numRows; row++) {
      const y = startY + row * rowSpacing;

      // Only add cards that fit within image bounds
      if (y + cardHeight <= height) {
        // Left column
        if (leftColX + cardWidth <= width) {
          cardPositions.push({ x: leftColX, y, width: cardWidth, height: cardHeight });
        }
        // Right column
        if (rightColX + cardWidth <= width) {
          cardPositions.push({ x: rightColX, y, width: cardWidth, height: cardHeight });
        }
      }
    }

    const cards = [];

    for (const pos of cardPositions) {
      try {
        const cardBuffer = await sharp(framePath)
          .extract({
            left: pos.x,
            top: pos.y,
            width: pos.width,
            height: pos.height,
          })
          .toBuffer();

        cards.push(cardBuffer);
      } catch (error) {
        // Skip cards that can't be extracted
      }
    }

    return cards;
  }

  async extractFromCard(cardBuffer) {
    const base64Image = cardBuffer.toString("base64");

    // Try primary model, optionally fallback
    const models = [this.primaryModel];
    if (this.fallbackModel) {
      models.push(this.fallbackModel);
    }

    for (const model of models) {
      try {
        const result = await this.callOllama(model, base64Image);
        if (result && result.merchant) {
          return result;
        }
      } catch (error) {
        console.log(`    Model ${model} failed: ${error.message}`);
      }
    }

    return null;
  }

  callOllama(model, base64Image) {
    return new Promise((resolve, reject) => {
      const prompt = `Analyze this Romanian banking app offer card image.

This card shows ONE merchant offer with:
1. A promotional image at the top
2. A badge showing cashback/discount (e.g., "10%", "150", "7%", "40")
3. A merchant LOGO with the brand name (e.g., "AVON", "Raiffeisen Bank", "Noriel", "eMAG")
4. Description text in Romanian

Extract ONLY:
- merchant: The brand/merchant name from the LOGO (not from description text)
- cashback: The value from the badge (add "%" if percentage, "puncte" if points number like 40/150/250)

Common merchants: AVON, Raiffeisen Bank, Noriel, eMAG, iBarber.ro, vegis.ro, Bagno, GUNNAR, Zandra, Adinish, INPUFF

Return JSON only: {"merchant": "NAME", "cashback": "VALUE"}
Example: {"merchant": "AVON", "cashback": "10%"}
Example: {"merchant": "Raiffeisen Bank", "cashback": "150 puncte"}`;

      const requestBody = JSON.stringify({
        model: model,
        prompt: prompt,
        images: [base64Image],
        stream: false,
      });

      const options = {
        hostname: "localhost",
        port: 11434,
        path: "/api/generate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            const responseText = response.response || "";

            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[^{}]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              resolve(parsed);
            } else {
              reject(new Error("No JSON found in response"));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.write(requestBody);
      req.end();
    });
  }

  deduplicateOffers(offers) {
    // Group by normalized merchant name
    const merchantMap = new Map();

    // Known name corrections for OCR errors
    const nameCorrections = {
      "em ag": "eMAG",
      "emag": "eMAG",
      "e mag": "eMAG",
      "ra i": "Raiffeisen Bank",
      "ra or r": "Raiffeisen Bank",
      "ra…i": "Raiffeisen Bank",
      "ra…": "Raiffeisen Bank",
      "raiffeisen": "Raiffeisen Bank",
      "raiffeisen bank": "Raiffeisen Bank",
      "norile": "Noriel",
      "noriel": "Noriel",
      "vegus": "vegis.ro",
      "vegig": "vegis.ro",
      "vegisro": "vegis.ro",
      "vegis.ro": "vegis.ro",
      "vegis": "vegis.ro",
      "bebe organic": "Bebe Organic",
      "bebe": "Bebe Organic",
      "ibarber.ro": "iBarber.ro",
      "ibarber": "iBarber.ro",
      "sanovita": "SanoVita",
      "inpuff": "INPUFF",
      "gunnar": "GUNNAR",
      "avon": "AVON",
      "bagno": "Bagno",
      "zandra": "Zandra",
      "adinish": "Adinish",
      "rozmarin": "Rozmarin",
    };

    for (const offer of offers) {
      let normalizedName = offer.name
        .toLowerCase()
        .replace(/[^\w\s\.]/g, "")
        .trim();

      // Apply name corrections
      if (nameCorrections[normalizedName]) {
        offer.name = nameCorrections[normalizedName];
        normalizedName = offer.name.toLowerCase().replace(/[^\w\s\.]/g, "").trim();
      }

      if (!merchantMap.has(normalizedName)) {
        merchantMap.set(normalizedName, {
          offers: [],
          cashbackCounts: {},
        });
      }

      const entry = merchantMap.get(normalizedName);
      entry.offers.push(offer);

      const cashback = offer.offers[0].cashback;
      entry.cashbackCounts[cashback] =
        (entry.cashbackCounts[cashback] || 0) + 1;
    }

    // Select most frequent cashback for each merchant
    const deduplicated = [];

    for (const [, entry] of merchantMap) {
      // Find most frequent cashback value
      let maxCount = 0;
      let mostFrequentCashback = null;

      for (const [cashback, count] of Object.entries(entry.cashbackCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostFrequentCashback = cashback;
        }
      }

      // Find the first offer with this cashback value
      const representative = entry.offers.find(
        (o) => o.offers[0].cashback === mostFrequentCashback
      );

      if (representative) {
        // Normalize cashback formatting
        representative.offers[0].cashback = this.normalizeCashback(
          representative.offers[0].cashback
        );
        representative.offers[0].description = `${representative.offers[0].cashback} la ${representative.name}`;
        deduplicated.push(representative);
      }
    }

    return deduplicated;
  }

  normalizeCashback(value) {
    if (!value) return value;
    let v = value.trim();

    // Already has % sign
    if (v.endsWith("%")) return v;

    // "12% reduc" or "10% cashback" -> "12%"
    const pctMatch = v.match(/^(\d+%)/);
    if (pctMatch) return pctMatch[1];

    // "15 Lei" -> "15 Lei"
    if (/^\d+\s*lei$/i.test(v)) {
      const num = v.match(/\d+/)[0];
      return `${num} Lei`;
    }

    // Bare number (points) - e.g. "40", "150", "250"
    if (/^\d+$/.test(v)) {
      return `${v} puncte`;
    }

    // "X puncte" - already formatted
    if (/^\d+\s*puncte$/i.test(v)) return v;

    return v;
  }
}

module.exports = SmartMarketScraper;
