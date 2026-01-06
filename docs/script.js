class CashbackSearch {
  constructor() {
    this.searchInput = document.getElementById("searchInput");
    this.searchButton = document.getElementById("searchButton");
    this.loading = document.getElementById("loading");
    this.results = document.getElementById("results");
    this.noResults = document.getElementById("noResults");
    this.sourcesInfo = document.getElementById("sourcesInfo");
    this.lastUpdate = document.getElementById("lastUpdate");

    this.offers = [];
    this.fuse = null;

    this.init();
  }

  async init() {
    // Load offers data
    await this.loadOffers();

    // Event listeners
    this.searchButton.addEventListener("click", () => this.search());
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.search();
      }
    });

    // Focus on input
    this.searchInput.focus();
  }

  async loadOffers() {
    try {
      const response = await fetch(`data/offers.json?t=${new Date().getTime()}`);
      const data = await response.json();

      this.offers = data.offers || [];

      // Initialize Fuse.js for fuzzy search
      this.fuse = new Fuse(this.offers, {
        keys: ["name"],           // Only search merchant names
        threshold: 0.2,           // Stricter matching (80% similarity required)
        minMatchCharLength: 2,    // Require at least 2 chars to match
        includeScore: true,
      });
      
      // Update sources info
      this.updateSourcesInfo(data);

      // Update last update time
      if (data.lastUpdated) {
        this.lastUpdate.textContent = new Date(data.lastUpdated).toLocaleDateString("ro-RO");
      }
    } catch (error) {
      console.error("Error loading offers:", error);
      this.sourcesInfo.innerHTML = "Eroare la încărcarea datelor";
    }
  }

  updateSourcesInfo(data) {
    const sourceNames = {
      mastercard: "Mastercard Premium",
      cashclub: "CashClub",
      guerrilla: "Guerrilla Radio",
    };

    // Count offers by source
    const sourceCounts = {};
    for (const offer of this.offers) {
      const source = offer.source;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }

    const sourcesText = Object.entries(sourceCounts)
      .map(([source, count]) => `${sourceNames[source] || source} (${count})`)
      .join(", ");

    this.sourcesInfo.innerHTML = `Căutând în: ${sourcesText}`;
  }

  search() {
    const query = this.searchInput.value.trim();

    if (query.length < 2) {
      alert("Te rog introdu cel puțin 2 caractere pentru căutare.");
      return;
    }

    this.showLoading();

    // Use Fuse.js for fuzzy search
    const results = this.fuse.search(query);

    // Transform results to match expected format
    const formattedResults = results.map((r) => r.item);

    // Small delay to show loading indicator
    setTimeout(() => {
      this.displayResults(formattedResults, query);
    }, 100);
  }

  showLoading() {
    this.loading.style.display = "flex";
    this.results.style.display = "none";
    this.noResults.style.display = "none";
  }

  displayResults(results, query) {
    this.loading.style.display = "none";

    if (results.length === 0) {
      this.noResults.style.display = "block";
      this.results.style.display = "none";
      return;
    }

    this.noResults.style.display = "none";
    this.results.style.display = "grid";

    this.results.innerHTML = results
      .map((result) => this.createResultCard(result))
      .join("");
  }

  createResultCard(result) {
    const sourceClass = `source-${result.source}`;
    const sourceName =
      {
        mastercard: "Mastercard Premium",
        cashclub: "CashClub",
        guerrilla: "Guerrilla Radio",
      }[result.source] || result.source;

    const offersHtml = result.offers
      .map(
        (offer) => `
            <div class="offer-item">
                <div class="cashback-rate">${offer.cashback}</div>
                <div class="offer-description">${offer.description}</div>
            </div>
        `,
      )
      .join("");

    const urlHtml = result.url
      ? `
            <div class="merchant-url">
                <a href="${result.url}" target="_blank" rel="noopener">
                    🔗 Vezi detalii
                </a>
            </div>
        `
      : "";

    return `
            <div class="result-card">
                <div class="merchant-name">
                    ${result.name}
                    <span class="source-badge ${sourceClass}">${sourceName}</span>
                </div>

                <div class="offers-list">
                    ${offersHtml}
                </div>

                ${urlHtml}
            </div>
        `;
  }

  showError(message) {
    this.loading.style.display = "none";
    this.results.style.display = "none";
    this.noResults.style.display = "block";

    this.noResults.innerHTML = `
            <p>❌ ${message}</p>
            <small>Verifică conexiunea la internet și încearcă din nou.</small>
        `;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new CashbackSearch();
});

