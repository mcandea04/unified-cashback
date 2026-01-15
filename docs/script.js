const translations = {
  en: {
    appTitle: "Unified Cashback Search",
    tagline: "Find cashback and coupon offers for your favorite stores",
    languageLabel: "Language",
    searchPlaceholder: "Search for a store (e.g., eMAG, H&M, Zara)...",
    searchButton: "Search",
    sourcesLoading: "Loading sources...",
    searchingIn: "Searching in: {sources}",
    loading: "Searching for offers...",
    noResultsTitle: "No offers found for this search. 📭",
    noResultsHint: "Try another store name or check the spelling.",
    footerSources: "Sources: Mastercard Premium Collection, CashClub, Guerrilla Radio Avanpost",
    lastUpdatedLabel: "Data last updated:",
    viewDetails: "View details",
    minCharsAlert: "Please enter at least 2 characters to search.",
    errorLoading: "Failed to load data.",
    errorLoadingShort: "Error loading data.",
    errorHint: "Check your internet connection and try again.",
  },
  ro: {
    appTitle: "Căutare Cashback Unificată",
    tagline: "Găsește oferte de cashback și cupoane pentru magazinele tale preferate",
    languageLabel: "Limbă",
    searchPlaceholder: "Caută un magazin (ex: eMAG, H&M, Zara)...",
    searchButton: "Caută",
    sourcesLoading: "Se încarcă sursele...",
    searchingIn: "Căutând în: {sources}",
    loading: "Se caută oferte...",
    noResultsTitle: "Nu am găsit oferte pentru această căutare. 📭",
    noResultsHint: "Încearcă cu un alt nume de magazin sau verifică ortografia.",
    footerSources: "Surse: Mastercard Premium Collection, CashClub, Guerrilla Radio Avanpost",
    lastUpdatedLabel: "Ultima actualizare a datelor:",
    viewDetails: "Vezi detalii",
    minCharsAlert: "Te rog introdu cel puțin 2 caractere pentru căutare.",
    errorLoading: "Eroare la încărcarea datelor.",
    errorLoadingShort: "Eroare la încărcarea datelor.",
    errorHint: "Verifică conexiunea la internet și încearcă din nou.",
  },
};

class CashbackSearch {
  constructor() {
    this.searchInput = document.getElementById("searchInput");
    this.searchButton = document.getElementById("searchButton");
    this.loading = document.getElementById("loading");
    this.results = document.getElementById("results");
    this.noResults = document.getElementById("noResults");
    this.sourcesInfo = document.getElementById("sourcesInfo");
    this.lastUpdate = document.getElementById("lastUpdate");
    this.languageSelect = document.getElementById("languageSelect");

    this.offers = [];
    this.fuse = null;
    this.currentResults = [];
    this.lastQuery = "";
    this.lastUpdatedDate = null;
    this.isDataLoaded = false;
    this.currentLanguage = this.getStoredLanguage();

    this.init();
  }

  getStoredLanguage() {
    try {
      const storedLanguage = localStorage.getItem("language");
      if (storedLanguage && translations[storedLanguage]) {
        return storedLanguage;
      }
    } catch (error) {
      console.warn("Unable to access stored language preference.", error);
    }
    return "en";
  }

  setLanguage(language, persist = true) {
    const resolvedLanguage = translations[language] ? language : "en";
    this.currentLanguage = resolvedLanguage;
    document.documentElement.lang = resolvedLanguage;

    if (persist) {
      try {
        localStorage.setItem("language", resolvedLanguage);
      } catch (error) {
        console.warn("Unable to persist language preference.", error);
      }
    }

    if (this.languageSelect) {
      this.languageSelect.value = resolvedLanguage;
    }

    this.applyTranslations();

    if (this.isDataLoaded) {
      this.updateSourcesInfo();
      this.updateLastUpdated();
    } else {
      this.sourcesInfo.textContent = this.t("sourcesLoading");
    }

    if (this.results.style.display === "grid") {
      this.displayResults(this.currentResults, this.lastQuery);
    }
  }

  t(key, replacements = {}) {
    const languageStrings = translations[this.currentLanguage] || translations.en;
    let value = languageStrings[key] || translations.en[key] || key;

    for (const [token, replacement] of Object.entries(replacements)) {
      value = value.replace(`{${token}}`, replacement);
    }

    return value;
  }

  applyTranslations() {
    const textNodes = document.querySelectorAll("[data-i18n]");
    textNodes.forEach((node) => {
      const key = node.getAttribute("data-i18n");
      node.textContent = this.t(key);
    });

    const placeholderNodes = document.querySelectorAll("[data-i18n-placeholder]");
    placeholderNodes.forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      node.setAttribute("placeholder", this.t(key));
    });
  }

  async init() {
    this.setLanguage(this.currentLanguage, false);

    if (this.languageSelect) {
      this.languageSelect.addEventListener("change", (event) => {
        this.setLanguage(event.target.value);
      });
    }

    await this.loadOffers();

    this.searchButton.addEventListener("click", () => this.search());
    this.searchInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        this.search();
      }
    });

    this.searchInput.focus();
  }

  async loadOffers() {
    try {
      const response = await fetch(`data/offers.json?t=${new Date().getTime()}`);
      const data = await response.json();

      this.offers = data.offers || [];
      this.isDataLoaded = true;

      this.fuse = new Fuse(this.offers, {
        keys: ["name"],
        threshold: 0.2,
        minMatchCharLength: 2,
        includeScore: true,
      });

      this.updateSourcesInfo();

      if (data.lastUpdated) {
        this.lastUpdatedDate = new Date(data.lastUpdated);
        this.updateLastUpdated();
      }
    } catch (error) {
      console.error("Error loading offers:", error);
      this.sourcesInfo.textContent = this.t("errorLoadingShort");
      this.showError(this.t("errorLoading"));
    }
  }

  updateLastUpdated() {
    if (!this.lastUpdatedDate) {
      return;
    }

    const locale = this.currentLanguage === "ro" ? "ro-RO" : "en-US";
    this.lastUpdate.textContent = this.lastUpdatedDate.toLocaleDateString(locale);
  }

  updateSourcesInfo() {
    const sourceNames = {
      mastercard: "Mastercard Premium",
      cashclub: "CashClub",
      guerrilla: "Guerrilla Radio",
    };

    const sourceCounts = {};
    for (const offer of this.offers) {
      const source = offer.source;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }

    const sourcesText = Object.entries(sourceCounts)
      .map(([source, count]) => `${sourceNames[source] || source} (${count})`)
      .join(", ");

    this.sourcesInfo.textContent = this.t("searchingIn", { sources: sourcesText });
  }

  search() {
    const query = this.searchInput.value.trim();

    if (query.length < 2) {
      alert(this.t("minCharsAlert"));
      return;
    }

    this.showLoading();

    const results = this.fuse.search(query);
    const formattedResults = results.map((result) => result.item);

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
    this.currentResults = results;
    this.lastQuery = query;
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
                    🔗 ${this.t("viewDetails")}
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
            <small>${this.t("errorHint")}</small>
        `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CashbackSearch();
});
