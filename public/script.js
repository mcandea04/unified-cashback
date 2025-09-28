class CashbackSearch {
  constructor() {
    this.searchInput = document.getElementById("searchInput");
    this.searchButton = document.getElementById("searchButton");
    this.loading = document.getElementById("loading");
    this.results = document.getElementById("results");
    this.noResults = document.getElementById("noResults");
    this.sourcesInfo = document.getElementById("sourcesInfo");
    this.lastUpdate = document.getElementById("lastUpdate");

    this.init();
  }

  init() {
    // Load sources info
    this.loadSources();

    // Event listeners
    this.searchButton.addEventListener("click", () => this.search());
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.search();
      }
    });

    // Focus on input
    this.searchInput.focus();

    // Set last update time
    this.lastUpdate.textContent = new Date().toLocaleDateString("ro-RO");
  }

  async loadSources() {
    try {
      const response = await fetch(`/api/sources?t=${new Date().getTime()}`);
      const data = await response.json();

      if (data.success && data.sources.length > 0) {
        const sourceNames = {
          mastercard: "Mastercard Premium",
          cashclub: "CashClub",
          topcashback: "TopCashback",
        };

        const sourcesText = data.sources
          .map(
            (s) => `${sourceNames[s.source] || s.source} (${s.merchant_count})`,
          )
          .join(", ");

        this.sourcesInfo.innerHTML = `Căutând în: ${sourcesText}`;
      }
    } catch (error) {
      console.error("Error loading sources:", error);
    }
  }

  async search() {
    const query = this.searchInput.value.trim();

    if (query.length < 2) {
      alert("Te rog introdu cel puțin 2 caractere pentru căutare.");
      return;
    }

    this.showLoading();

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&t=${new Date().getTime()}`,
      );
      const data = await response.json();

      if (data.success) {
        this.displayResults(data.results, query);
      } else {
        throw new Error(data.message || "Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      this.showError("A apărut o eroare la căutare. Te rog încearcă din nou.");
    }
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
        topcashback: "TopCashback",
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
