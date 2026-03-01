const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const sharp = require("sharp");

const SOURCES = {
  smartmarket: {
    inputDir: "smartmarket-input",
    framesDir: "smartmarket-frames",
    fps: 2,
    rotate: null,
    dedupThreshold: 10,
  },
  ing: {
    inputDir: "ing-input",
    framesDir: "ing-frames",
    fps: 2,
    rotate: 90,
    dedupThreshold: 5,
  },
  unicredit: {
    inputDir: "unicredit-input",
    framesDir: "unicredit-frames",
    fps: 2,
    rotate: null,
    dedupThreshold: 10,
  },
};

const DEFAULT_SIMILARITY_THRESHOLD = 10;

async function main() {
  const sourceKey = process.argv[2];

  if (!sourceKey || !SOURCES[sourceKey]) {
    console.error(
      `Usage: node extract-frames.js <source>\nAvailable sources: ${Object.keys(SOURCES).join(", ")}`
    );
    process.exit(1);
  }

  const config = SOURCES[sourceKey];
  const inputDir = path.join(__dirname, config.inputDir);
  const framesDir = path.join(__dirname, config.framesDir);

  const videoPath = findVideoFile(inputDir);
  if (!videoPath) {
    console.error(`No video file found in ${inputDir}`);
    process.exit(1);
  }

  console.log(`Source: ${sourceKey}`);
  console.log(`Video: ${path.basename(videoPath)}`);
  console.log(`FPS: ${config.fps}`);
  console.log(`Rotate: ${config.rotate || "none"}`);
  console.log();

  // Prepare frames directory
  fs.mkdirSync(framesDir, { recursive: true });
  cleanFrames(framesDir);

  // Build FFmpeg filter chain
  const filters = [`fps=${config.fps}`];
  if (config.rotate === 90) {
    filters.push("transpose=1");
  } else if (config.rotate === -90 || config.rotate === 270) {
    filters.push("transpose=2");
  }

  const outputPattern = path.join(framesDir, "frame-%04d.png");
  const filterStr = filters.join(",");

  console.log("Extracting frames...");
  execSync(
    `ffmpeg -i "${videoPath}" -vf "${filterStr}" "${outputPattern}" -y`,
    { stdio: "pipe" }
  );

  const rawFrames = listFrames(framesDir);
  console.log(`Extracted ${rawFrames.length} raw frames`);

  // Deduplicate
  const threshold = config.dedupThreshold || DEFAULT_SIMILARITY_THRESHOLD;
  console.log(`Deduplicating by perceptual hash (threshold=${threshold})...`);
  const rawPaths = rawFrames.map((f) => path.join(framesDir, f));
  const uniquePaths = await deduplicateFrames(rawPaths, threshold);

  // Remove duplicates from disk
  const uniqueSet = new Set(uniquePaths.map((f) => path.basename(f)));
  let removed = 0;
  for (const file of rawFrames) {
    if (!uniqueSet.has(file)) {
      fs.unlinkSync(path.join(framesDir, file));
      removed++;
    }
  }

  console.log(
    `\n${rawFrames.length} raw frames -> ${uniquePaths.length} unique frames (removed ${removed} duplicates)`
  );
  console.log(`Saved to: ${framesDir}`);
}

function findVideoFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const extensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  for (const file of fs.readdirSync(dir)) {
    if (extensions.includes(path.extname(file).toLowerCase())) {
      return path.join(dir, file);
    }
  }
  return null;
}

function cleanFrames(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith("frame-")) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

function listFrames(dir) {
  return fs
    .readdirSync(dir)
    .filter(
      (f) =>
        f.startsWith("frame-") && (f.endsWith(".png") || f.endsWith(".jpg"))
    )
    .sort();
}

async function calculatePHash(imagePath) {
  const { data } = await sharp(imagePath)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (const pixel of data) sum += pixel;
  const avg = sum / data.length;

  let hash = BigInt(0);
  for (let i = 0; i < data.length; i++) {
    if (data[i] > avg) {
      hash |= BigInt(1) << BigInt(i);
    }
  }
  return hash;
}

function hammingDistance(hash1, hash2) {
  let xor = hash1 ^ hash2;
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

async function deduplicateFrames(framePaths, threshold) {
  const uniqueFrames = [];
  const hashes = [];

  for (const framePath of framePaths) {
    const hash = await calculatePHash(framePath);
    let isDuplicate = false;
    for (const existingHash of hashes) {
      if (hammingDistance(hash, existingHash) < threshold) {
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
