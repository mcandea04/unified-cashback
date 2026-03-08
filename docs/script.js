const BT_CASHBACK = 2;

const SOURCE_INFO = {
  mastercard: { name: "Mastercard Premium", card: "Mastercard Gold/Platinum/World/World Elite emis in Romania", stacksWithBT: false },
  cashclub: { name: "CashClub", card: null, stacksWithBT: true },
  guerrilla: { name: "Avanpost Guerrilla", card: "Card de debit Libra Bank (Avanpost)", stacksWithBT: false },
  smartmarket: { name: "Smart Market", card: "Card Raiffeisen Bank", stacksWithBT: false },
  ing: { name: "ING Bazar", card: "Orice card ING (debit sau credit)", stacksWithBT: false },
  unicredit: { name: "UniCredit ShopSmart", card: "Card UniCredit Bank (debit sau credit)", stacksWithBT: false },
  visa: { name: "MyVisa", card: "Card Visa Premium (Gold/Platinum/Signature/Infinite)", stacksWithBT: false },
};

function parseCashbackPercent(cashback) {
  if (!cashback) return null;
  const match = cashback.match(/^(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

function effectiveRate(result) {
  const info = SOURCE_INFO[result.source];
  const pct = result.offers && result.offers[0] ? parseCashbackPercent(result.offers[0].cashback) : null;
  if (pct === null) return null;
  return info && info.stacksWithBT ? pct + BT_CASHBACK : pct;
}

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
    noResultsTitle: "No offers found for this search.",
    noResultsHint: "Try another store name or check the spelling.",
    footerSources: "Sources: Mastercard Premium Collection, CashClub, Avanpost Guerrilla, Smart Market, ING Bazar, UniCredit ShopSmart, MyVisa",
    lastUpdatedLabel: "Data last updated:",
    viewDetails: "View details",
    errorLoading: "Failed to load data.",
    errorLoadingShort: "Error loading data.",
    errorHint: "Check your internet connection and try again.",
    cardRequired: "Requires: {card}",
    cardAgnostic: "Any card - stacks with your card's cashback",
    effectiveReal: "Effective: {rate}%",
    effectiveWithBT: "({pct}% + {bt}% BT Direct)",
    effectiveWithoutBT: "(without BT {bt}%)",
  },
  ro: {
    appTitle: "Cautare Cashback Unificata",
    tagline: "Gaseste oferte de cashback si cupoane pentru magazinele tale preferate",
    languageLabel: "Limba",
    searchPlaceholder: "Cauta un magazin (ex: eMAG, H&M, Zara)...",
    searchButton: "Cauta",
    sourcesLoading: "Se incarca sursele...",
    searchingIn: "Cautand in: {sources}",
    loading: "Se cauta oferte...",
    noResultsTitle: "Nu am gasit oferte pentru aceasta cautare.",
    noResultsHint: "Incearca cu un alt nume de magazin sau verifica ortografia.",
    footerSources: "Surse: Mastercard Premium Collection, CashClub, Avanpost Guerrilla, Smart Market, ING Bazar, UniCredit ShopSmart, MyVisa",
    lastUpdatedLabel: "Ultima actualizare a datelor:",
    viewDetails: "Vezi detalii",
    errorLoading: "Eroare la incarcarea datelor.",
    errorLoadingShort: "Eroare la incarcarea datelor.",
    errorHint: "Verifica conexiunea la internet si incearca din nou.",
    cardRequired: "Necesita: {card}",
    cardAgnostic: "Orice card - se cumuleaza cu cashback-ul cardului tau",
    effectiveReal: "Efect real: {rate}%",
    effectiveWithBT: "({pct}% + {bt}% BT Direct)",
    effectiveWithoutBT: "(fara BT {bt}%)",
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

    // Search as you type with debounce
    this.debounceTimer = null;
    this.searchInput.addEventListener("input", () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (this.searchInput.value.trim().length >= 2) {
          this.search();
        }
      }, 300);
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
    if (!this.lastUpdatedDate) return;
    const locale = this.currentLanguage === "ro" ? "ro-RO" : "en-US";
    this.lastUpdate.textContent = this.lastUpdatedDate.toLocaleDateString(locale);
  }

  updateSourcesInfo() {
    const sourceCounts = {};
    for (const offer of this.offers) {
      sourceCounts[offer.source] = (sourceCounts[offer.source] || 0) + 1;
    }

    const sourcesText = Object.entries(sourceCounts)
      .map(([source, count]) => `${(SOURCE_INFO[source] || {}).name || source} (${count})`)
      .join(", ");

    this.sourcesInfo.textContent = this.t("searchingIn", { sources: sourcesText });
  }

  search() {
    const query = this.searchInput.value.trim();

    if (query.length < 2) {
      return;
    }

    this.showLoading();

    const results = this.fuse.search(query);

    // Sort by relevance first, then by cashback rate as tiebreaker
    results.sort((a, b) => {
      const scoreDiff = a.score - b.score;
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
      const rateA = effectiveRate(a.item);
      const rateB = effectiveRate(b.item);
      if (rateA !== null && rateB !== null) return rateB - rateA;
      if (rateA !== null) return -1;
      if (rateB !== null) return 1;
      return 0;
    });
    const items = results.map((r) => r.item);

    setTimeout(() => {
      this.displayResults(items, query);
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
    const info = SOURCE_INFO[result.source] || { name: result.source, card: null, stacksWithBT: false };

    const cardTag = info.card
      ? `<span class="card-required">${this.t("cardRequired", { card: info.card })}</span>`
      : `<span class="card-agnostic">${this.t("cardAgnostic")}</span>`;

    const pct = result.offers && result.offers[0] ? parseCashbackPercent(result.offers[0].cashback) : null;
    const eff = effectiveRate(result);

    let effectiveHtml = "";
    if (eff !== null) {
      const rateText = this.t("effectiveReal", { rate: eff });
      if (info.stacksWithBT) {
        const detail = this.t("effectiveWithBT", { pct, bt: BT_CASHBACK });
        effectiveHtml = `<div class="effective-rate stacks">${rateText} <span class="effective-detail">${detail}</span></div>`;
      } else {
        const detail = this.t("effectiveWithoutBT", { bt: BT_CASHBACK });
        effectiveHtml = `<div class="effective-rate locked">${rateText} <span class="effective-detail">${detail}</span></div>`;
      }
    }

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
                    ${this.t("viewDetails")}
                </a>
            </div>
        `
      : "";

    return `
            <div class="result-card">
                <div class="merchant-name">
                    ${result.name}
                    <span class="source-badge ${sourceClass}">${info.name}</span>
                </div>
                <div class="card-info">${cardTag}</div>
                ${effectiveHtml}

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
            <p>${message}</p>
            <small>${this.t("errorHint")}</small>
        `;
  }
}

function initTheme() {
  const stored = localStorage.getItem("theme");
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    }
  });
}

function bindThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

initTheme();

document.addEventListener("DOMContentLoaded", () => {
  bindThemeToggle();
  new CashbackSearch();
});
