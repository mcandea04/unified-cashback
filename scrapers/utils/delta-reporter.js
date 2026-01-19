const fs = require("fs");
const path = require("path");

const DELTA_REPORTS_DIR = path.join(__dirname, "..", "delta-reports");

function compareOffers(existingOffers, newOffers, sourceKey) {
  const existingForSource = existingOffers.filter((o) => o.source === sourceKey);
  const existingMap = new Map(existingForSource.map((o) => [o.name, o]));
  const newMap = new Map(newOffers.map((o) => [o.name, o]));

  const added = [];
  const removed = [];
  const changed = [];
  let unchangedCount = 0;

  for (const [name, newOffer] of newMap) {
    const existing = existingMap.get(name);
    if (!existing) {
      added.push({
        name: newOffer.name,
        cashback: getCashbackSummary(newOffer),
      });
    } else {
      const oldCashback = getCashbackSummary(existing);
      const newCashback = getCashbackSummary(newOffer);
      if (oldCashback !== newCashback) {
        changed.push({
          name: newOffer.name,
          oldCashback,
          newCashback,
        });
      } else {
        unchangedCount++;
      }
    }
  }

  for (const [name, existing] of existingMap) {
    if (!newMap.has(name)) {
      removed.push({
        name: existing.name,
        cashback: getCashbackSummary(existing),
      });
    }
  }

  return {
    added,
    removed,
    changed,
    unchangedCount,
    totalBefore: existingForSource.length,
    totalAfter: newOffers.length,
  };
}

function getCashbackSummary(offer) {
  if (!offer.offers || offer.offers.length === 0) {
    return "N/A";
  }
  if (offer.offers.length === 1) {
    return offer.offers[0].cashback || offer.offers[0].description || "N/A";
  }
  return offer.offers.map((o) => o.cashback || o.description).join(", ");
}

function formatConsoleReport(delta, sourceKey, runDate) {
  const lines = [];
  const dateStr = runDate.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  lines.push("");
  lines.push(`=== ${sourceKey.toUpperCase()} Delta Report ===`);
  lines.push(`Run: ${dateStr}`);
  lines.push("");

  if (delta.added.length > 0) {
    lines.push(`ADDED (${delta.added.length}):`);
    for (const item of delta.added) {
      lines.push(`  + ${item.name} - ${item.cashback}`);
    }
    lines.push("");
  }

  if (delta.removed.length > 0) {
    lines.push(`REMOVED (${delta.removed.length}):`);
    for (const item of delta.removed) {
      lines.push(`  - ${item.name} - ${item.cashback}`);
    }
    lines.push("");
  }

  if (delta.changed.length > 0) {
    lines.push(`CHANGED (${delta.changed.length}):`);
    for (const item of delta.changed) {
      lines.push(`  ~ ${item.name}: ${item.oldCashback} -> ${item.newCashback}`);
    }
    lines.push("");
  }

  lines.push(`UNCHANGED: ${delta.unchangedCount} offers`);
  lines.push("");

  const totalChanges = delta.added.length + delta.removed.length + delta.changed.length;
  lines.push(
    `Summary: ${delta.added.length} added, ${delta.removed.length} removed, ${delta.changed.length} changed out of ${delta.totalAfter} total`
  );

  if (totalChanges === 0) {
    lines.push("No changes detected.");
  }

  lines.push("");

  return lines.join("\n");
}

function ensureReportsDir() {
  if (!fs.existsSync(DELTA_REPORTS_DIR)) {
    fs.mkdirSync(DELTA_REPORTS_DIR, { recursive: true });
  }
}

function saveDeltaReport(delta, sourceKey, runDate) {
  ensureReportsDir();

  const timestamp = runDate.toISOString().replace(/[:.]/g, "-");
  const filename = `${sourceKey}-${timestamp}.json`;
  const filepath = path.join(DELTA_REPORTS_DIR, filename);

  const report = {
    source: sourceKey,
    runDate: runDate.toISOString(),
    ...delta,
  };

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  return filepath;
}

function updateSummary(delta, sourceKey, runDate) {
  ensureReportsDir();

  const summaryPath = path.join(DELTA_REPORTS_DIR, "summary.json");
  let summary = {};

  if (fs.existsSync(summaryPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    } catch (e) {
      summary = {};
    }
  }

  if (!summary[sourceKey]) {
    summary[sourceKey] = [];
  }

  summary[sourceKey].push({
    runDate: runDate.toISOString(),
    added: delta.added.length,
    removed: delta.removed.length,
    changed: delta.changed.length,
    unchanged: delta.unchangedCount,
    total: delta.totalAfter,
  });

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  return summaryPath;
}

function generateDeltaReport(existingOffers, newOffers, sourceKey) {
  const runDate = new Date();
  const delta = compareOffers(existingOffers, newOffers, sourceKey);

  const consoleOutput = formatConsoleReport(delta, sourceKey, runDate);
  console.log(consoleOutput);

  const reportPath = saveDeltaReport(delta, sourceKey, runDate);
  console.log(`Delta report saved: ${reportPath}`);

  const summaryPath = updateSummary(delta, sourceKey, runDate);
  console.log(`Summary updated: ${summaryPath}`);

  return delta;
}

module.exports = {
  compareOffers,
  formatConsoleReport,
  saveDeltaReport,
  updateSummary,
  generateDeltaReport,
};
