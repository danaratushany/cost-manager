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
    // -------------------- Constants --------------------

    // IndexedDB store name (you may have more stores, but one is enough)
    const DEFAULT_STORE = "costs";

    // localStorage key used by Settings page
    const RATES_KEY = "ratesUrl";

    // fallback URL if user did not set a URL in Settings
    const DEFAULT_RATES_URL = "/rates.json";

    // -------------------- Helpers --------------------

    /*
      IndexedDB works with event-based requests (onsuccess/onerror).
      This helper converts an IDBRequest into a Promise so we can use .then / async.
    */
    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /*
      Reads the exchange rates URL from localStorage.
      If missing, use "/rates.json" as a safe default.
    */
    function getRatesUrl() {
        const raw = localStorage.getItem(RATES_KEY);
        const trimmed = (raw || "").trim();
        return trimmed || DEFAULT_RATES_URL;
    }

    /*
      Fetch exchange rates JSON from the configured URL.
      Expected response example:
        {"USD":1, "GBP":0.6, "EURO":0.7, "ILS":3.4}
    */
    async function fetchRates() {
        const url = getRatesUrl();

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error("Failed to fetch rates (HTTP " + res.status + ").");
        }

        return res.json();
    }

    /*
      Convert currency using rates where:
        1 USD = rates[CURRENCY] units of that currency.

      Example:
        rates.ILS = 3.4   => 1 USD = 3.4 ILS
        rates.GBP = 0.6   => 1 USD = 0.6 GBP

      Conversion formula:
        from -> USD -> to
        usd = amount / rates[from]
        to  = usd * rates[to]
    */
    function convert(sum, fromCurrency, toCurrency, rates) {
        const amount = Number(sum);
        if (!Number.isFinite(amount)) return 0;

        const from = String(fromCurrency);
        const to = String(toCurrency);

        // If same currency, no conversion needed
        if (from === to) return amount;

        const fromRate = rates[from];
        const toRate = rates[to];

        // Validate currencies exist in the rates JSON
        if (typeof fromRate !== "number" || typeof toRate !== "number") {
            throw new Error("Unsupported currency in rates response.");
        }

        // Convert from -> USD -> to
        const usd = amount / fromRate;
        return usd * toRate;
    }

    // -------------------- Main API --------------------

    /*
      openCostsDB(databaseName, databaseVersion)
      - Opens (or creates) the IndexedDB database
      - Creates the object store + index on first run / version bump
      - Resolves to a wrapper object with addCost() and getReport()
    */
    function openCostsDB(databaseName, databaseVersion) {
        const openRequest = indexedDB.open(String(databaseName), Number(databaseVersion));

        // Create schema if needed
        openRequest.onupgradeneeded = () => {
            const db = openRequest.result;

            if (!db.objectStoreNames.contains(DEFAULT_STORE)) {
                // Store of cost items (auto-increment primary key "id")
                const store = db.createObjectStore(DEFAULT_STORE, { keyPath: "id", autoIncrement: true });

                // Index for querying costs by (year, month)
                store.createIndex("year_month", ["year", "month"], { unique: false });
            }
        };

        // Wait for DB open
        return promisifyRequest(openRequest).then((db) => {
            /*
              addCost(cost)
              - Stores a new cost item with the current date attached
              - IMPORTANT: the returned object must contain ONLY:
                { sum, currency, category, description }
            */
            function addCost(cost) {
                const now = new Date();

                // We store extra fields internally (allowed),
                // but we do NOT return them to match the spec.
                const costToSave = {
                    sum: Number(cost.sum),
                    currency: String(cost.currency),
                    category: String(cost.category),
                    description: String(cost.description),

                    // internal date fields (for report filtering / Date.day output)
                    createdAt: now.toISOString(),
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                    day: now.getDate(),
                };

                const tx = db.transaction(DEFAULT_STORE, "readwrite");
                const store = tx.objectStore(DEFAULT_STORE);

                // Save and return ONLY the required fields
                return promisifyRequest(store.add(costToSave)).then(() => ({
                    sum: costToSave.sum,
                    currency: costToSave.currency,
                    category: costToSave.category,
                    description: costToSave.description,
                }));
            }

            /*
              getReport(year, month, currency)
              - Returns a report object in the required structure.
              - costs[] should KEEP original sum/currency,
                and include Date:{day}
              - total should be in the requested currency (converted if needed).
            */
            function getReport(year, month, currency) {
                const y = Number(year);
                const m = Number(month);
                const targetCurrency = String(currency);

                const tx = db.transaction(DEFAULT_STORE, "readonly");
                const store = tx.objectStore(DEFAULT_STORE);
                const index = store.index("year_month");

                // Fetch all items for (year, month)
                return promisifyRequest(index.getAll([y, m])).then(async (items) => {
                    // Do we need to convert at least one item?
                    const needsRates = items.some((c) => String(c.currency) !== targetCurrency);
                    const rates = needsRates ? await fetchRates() : null;

                    // Build costs array EXACTLY as expected by the spec
                    const costs = items.map((c) => ({
                        sum: Number(c.sum),
                        currency: String(c.currency),
                        category: String(c.category),
                        description: String(c.description),

                        // Spec example: Date:{day:12}
                        Date: {
                            day: Number(c.day) || new Date(String(c.createdAt || "")).getDate(),
                        },
                    }));

                    // Compute total in requested currency
                    const totalValue = items.reduce((acc, c) => {
                        const s = Number(c.sum);
                        if (!Number.isFinite(s)) return acc;

                        if (!needsRates) return acc + s;
                        return acc + convert(s, c.currency, targetCurrency, rates);
                    }, 0);

                    return {
                        year: y,
                        month: m,
                        costs,
                        total: { currency: targetCurrency, total: Number(totalValue.toFixed(2)) },
                    };
                });
            }

            // The wrapper object returned from await idb.openCostsDB(...)
            return { addCost, getReport };
        });
    }

    // IMPORTANT: expose global object "idb" (required by testers)
    globalThis.idb = { openCostsDB };
})();