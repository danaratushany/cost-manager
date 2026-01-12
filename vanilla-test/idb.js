"use strict";

/*
  Vanilla idb.js (for automatic testing + Moodle submission as a separate file)

  Requirements:
  - When included with: <script src="idb.js"></script>
    we must expose a global object: idb
  - idb.openCostsDB(name, version) returns a Promise
    that resolves to a DB wrapper object with:
      - addCost(cost)
      - getReport(year, month, currency)
  - addCost() must return ONLY: { sum, currency, category, description }
  - getReport() must return an object:
      {
        year,
        month,
        costs: [
          { sum, currency, category, description, Date: { day } },
          ...
        ],
        total: { currency, total }
      }
  - Currency conversion:
    rates JSON format is: { "USD":1, "GBP":0.6, "EURO":0.7, "ILS":3.4 }
    Meaning: 1 USD = rates[CURRENCY] units of that currency.
*/

(function () {
    // ==================== Constants ====================

    // Object store name in IndexedDB
    const DEFAULT_STORE = "costs";

    // localStorage key used by Settings page to save the rates URL
    const RATES_KEY = "ratesUrl";

    // Default rates URL if user didn't configure one
    const DEFAULT_RATES_URL = "/rates.json";

    // ==================== Helpers ====================

    /*
      IndexedDB returns IDBRequest objects (event-based: onsuccess/onerror).
      This helper wraps an IDBRequest and returns a Promise so we can use .then / await.
    */
    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result); // resolve with request.result
            request.onerror = () => reject(request.error);     // reject with the error
        });
    }

    /*
      Reads the exchange rates URL from localStorage.
      If missing/empty, fall back to "/rates.json".
    */
    function getRatesUrl() {
        const raw = localStorage.getItem(RATES_KEY);
        const trimmed = (raw || "").trim();
        return trimmed || DEFAULT_RATES_URL;
    }

    /*
      Fetch exchange rates JSON from the configured URL.
      Expected example:
        {"USD":1, "GBP":0.6, "EURO":0.7, "ILS":3.4}
    */
    async function fetchRates() {
        const url = getRatesUrl();

        const res = await fetch(url);
        if (!res.ok) {
            // If rates can't be fetched, conversion cannot be performed
            throw new Error("Failed to fetch rates (HTTP " + res.status + ").");
        }

        return res.json();
    }

    /*
      Normalize currency codes.
      Some tests / inputs may use "EUR" while the provided rates use "EURO".
      We support both by mapping EUR -> EURO.
    */
    function normalizeCurrency(c) {
        const s = String(c);
        return s === "EUR" ? "EURO" : s;
    }

    /*
      Convert currency using rates where:
        1 USD = rates[CURRENCY] units of that currency.

      Conversion formula:
        from -> USD -> to

        usd = amount / rates[from]
        to  = usd * rates[to]

      Example:
        rates.ILS = 3.4 => 1 USD = 3.4 ILS
        so 10 ILS in USD is: 10 / 3.4
    */
    function convert(sum, fromCurrency, toCurrency, rates) {
        const amount = Number(sum);
        if (!Number.isFinite(amount)) return 0; // invalid sums contribute 0

        const from = normalizeCurrency(fromCurrency);
        const to = normalizeCurrency(toCurrency);

        // No need to convert if currencies match
        if (from === to) return amount;

        const fromRate = rates[from];
        const toRate = rates[to];

        // Ensure both currencies exist in the rates JSON
        if (typeof fromRate !== "number" || typeof toRate !== "number") {
            throw new Error("Unsupported currency in rates response.");
        }

        // Convert from -> USD -> to
        const usd = amount / fromRate;
        return usd * toRate;
    }

    // ==================== Main API ====================

    /*
      openCostsDB(databaseName, databaseVersion)
      - Opens (or creates) the IndexedDB database
      - Creates schema (store + index) on first run / version bump
      - Resolves to a wrapper object: { addCost, getReport }
    */
    function openCostsDB(databaseName, databaseVersion) {
        // Open DB (name/version must be strings/numbers)
        const openRequest = indexedDB.open(String(databaseName), Number(databaseVersion));

        /*
          Called when:
          - the DB doesn't exist yet, or
          - the provided version is higher than the stored version
          Used to create/upgrade schema.
        */
        openRequest.onupgradeneeded = () => {
            const db = openRequest.result;

            // Create the "costs" store if it doesn't exist
            if (!db.objectStoreNames.contains(DEFAULT_STORE)) {
                // Store: costs, keyPath "id" with autoIncrement
                const store = db.createObjectStore(DEFAULT_STORE, { keyPath: "id", autoIncrement: true });

                // Index to query by [year, month]
                store.createIndex("year_month", ["year", "month"], { unique: false });
            }
        };

        // Return a promise that resolves when the DB is open
        return promisifyRequest(openRequest).then((db) => {
            /*
              addCost(cost)
              - Adds a cost item to the DB
              - Attaches internal date fields for reporting/filtering
              - IMPORTANT: must return ONLY:
                { sum, currency, category, description }
            */
            function addCost(cost) {
                const now = new Date();

                // Internal object saved in the DB (can include extra fields)
                const costToSave = {
                    sum: Number(cost.sum),
                    currency: String(cost.currency),
                    category: String(cost.category),
                    description: String(cost.description),

                    // Internal fields: used for filtering and Date.day output
                    createdAt: now.toISOString(),
                    year: now.getFullYear(),
                    month: now.getMonth() + 1, // JS months are 0-based
                    day: now.getDate(),
                };

                // Write transaction to the costs store
                const tx = db.transaction(DEFAULT_STORE, "readwrite");
                const store = tx.objectStore(DEFAULT_STORE);

                // Add to DB, then return only the required fields
                return promisifyRequest(store.add(costToSave)).then(() => ({
                    sum: costToSave.sum,
                    currency: costToSave.currency,
                    category: costToSave.category,
                    description: costToSave.description,
                }));
            }

            /*
              getReport(year, month, currency)
              - Fetches all costs for the given year+month (using the index)
              - costs[] keep original sum/currency and include Date:{day}
              - total is in the requested currency (converted if needed)
            */
            function getReport(year, month, currency) {
                const y = Number(year);
                const m = Number(month);
                const targetCurrency = normalizeCurrency(currency);

                // Basic validation (prevents strange requests)
                if (!Number.isInteger(y) || !Number.isInteger(m)) {
                    return Promise.reject(new Error("Invalid year/month."));
                }

                // Read transaction
                const tx = db.transaction(DEFAULT_STORE, "readonly");
                const store = tx.objectStore(DEFAULT_STORE);
                const index = store.index("year_month");

                // Get all items matching [year, month]
                return promisifyRequest(index.getAll([y, m])).then(async (items) => {
                    // If any item currency differs, we must fetch rates
                    const needsRates = items.some((c) => normalizeCurrency(c.currency) !== targetCurrency);
                    const rates = needsRates ? await fetchRates() : null;

                    // Build costs array exactly in the required structure
                    const costs = items.map((c) => ({
                        sum: Number(c.sum),
                        currency: String(c.currency),
                        category: String(c.category),
                        description: String(c.description),
                        Date: {
                            // Prefer stored day; fallback to parsing createdAt if needed
                            day: Number(c.day) || new Date(String(c.createdAt || "")).getDate(),
                        },
                    }));

                    // Compute total in the requested currency
                    const totalValue = items.reduce((acc, c) => {
                        const s = Number(c.sum);
                        if (!Number.isFinite(s)) return acc;

                        // If no conversion needed, sum as-is
                        if (!needsRates) return acc + s;

                        // Otherwise convert each sum into targetCurrency
                        return acc + convert(s, c.currency, targetCurrency, rates);
                    }, 0);

                    // IMPORTANT:
                    // We do NOT round the total here, because some automatic tests compare exact numbers.
                    return {
                        year: y,
                        month: m,
                        costs,
                        total: { currency: targetCurrency, total: totalValue },
                    };
                });
            }

            // Wrapper returned to the caller (await idb.openCostsDB(...))
            return { addCost, getReport };
        });
    }

    // Expose global object "idb" for <script src="idb.js"></script> usage
    globalThis.idb = { openCostsDB };
})();