"use strict";

// ======================================================
// IndexedDB wrapper for Cost Manager (React / modules)
// Requirements covered here:
// - Promise-based API for IndexedDB
// - Supports currency conversion via Fetch API
// - Must work even if user did NOT set a rates URL in Settings
//   -> fallback to "/rates.json" (from /public)
// ======================================================

// Object store name
const defaultStore = "costs";

// localStorage key used by Settings page
const ratesKey = "ratesUrl";

// Default rates endpoint (served from /public)
const defaultRatesUrl = "/rates.json";

// Wrap IDBRequest callbacks in a Promise
function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Load exchange rates JSON.
// If Settings URL is missing -> fallback to "/rates.json" (requirement).
async function fetchRates() {
    // Read URL from localStorage (set in Settings), else use default
    let url = (localStorage.getItem(ratesKey) || "").trim();
    if (!url) url = defaultRatesUrl;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch rates from ${url} (HTTP ${res.status}).`);
    }

    // Expected shape: {USD:1, GBP:0.6, EURO:0.7, ILS:3.4}
    return res.json();
}

// Convert money between currencies using rates (1 USD = X currency).
// Example: rates.ILS = 3.4 means 1 USD = 3.4 ILS.
function convert(sum, fromCurrency, toCurrency, rates) {
    const from = String(fromCurrency);
    const to = String(toCurrency);

    const n = Number(sum);
    if (!Number.isFinite(n)) return 0;
    if (from === to) return n;

    const fromRate = rates[from];
    const toRate = rates[to];

    if (typeof fromRate !== "number" || typeof toRate !== "number") {
        throw new Error("Unsupported currency in rates response.");
    }

    // from -> USD -> to
    const usd = n / fromRate;
    return usd * toRate;
}

// Open DB and expose app operations
export async function openCostsDB(databaseName, databaseVersion) {
    const openRequest = indexedDB.open(databaseName, databaseVersion);

    // Create store + indexes on first run / version bump
    openRequest.onupgradeneeded = () => {
        const db = openRequest.result;

        if (!db.objectStoreNames.contains(defaultStore)) {
            const store = db.createObjectStore(defaultStore, {
                keyPath: "id",
                autoIncrement: true,
            });

            // Index for fetching by year+month
            store.createIndex("year_month", ["year", "month"], { unique: false });
        }
    };

    // Wait for open to finish
    const db = await promisifyRequest(openRequest);

    // Add a new cost entry.
    // IMPORTANT: We store the ORIGINAL currency in IndexedDB (requirement).
    async function addCost(cost) {
        const now = new Date();

        const costToSave = {
            sum: Number(cost.sum),
            currency: String(cost.currency), // original currency is stored
            category: String(cost.category),
            description: String(cost.description),

            // date of adding the item
            createdAt: now.toISOString(),
            year: now.getFullYear(),
            month: now.getMonth() + 1,
        };

        const tx = db.transaction(defaultStore, "readwrite");
        const store = tx.objectStore(defaultStore);

        const id = await promisifyRequest(store.add(costToSave));
        return { id, ...costToSave };
    }

    // Build monthly report (with currency conversion if needed).
    // We DO NOT override the stored currency in DB; we only add sumInTarget + targetCurrency.
    async function getReport(year, month, currency) {
        const y = Number(year);
        const m = Number(month);
        const targetCurrency = String(currency);

        const tx = db.transaction(defaultStore, "readonly");
        const store = tx.objectStore(defaultStore);
        const index = store.index("year_month");

        const items = await promisifyRequest(index.getAll([y, m]));

        // Only fetch rates if at least one item is in a different currency
        const needsRates = items.some((c) => String(c.currency) !== targetCurrency);
        const rates = needsRates ? await fetchRates() : null;

        const costs = items.map((c) => {
            const sumOriginal = Number(c.sum);

            const sumInTarget = needsRates
                ? convert(sumOriginal, c.currency, targetCurrency, rates)
                : sumOriginal;

            return {
                ...c, // keeps original sum + currency from DB
                sumInTarget: Number(sumInTarget.toFixed(2)),
                targetCurrency,
            };
        });

        const total = costs.reduce((acc, c) => acc + Number(c.sumInTarget), 0);

        return {
            year: y,
            month: m,
            costs,
            total: { currency: targetCurrency, total: Number(total.toFixed(2)) },
        };
    }

    // Sum totals by category for pie chart (in selected currency)
    async function getCategoryTotals(year, month, currency) {
        const r = await getReport(year, month, currency);

        const map = new Map();
        for (const c of r.costs) {
            const cat = String(c.category || "Other");
            const val = Number.isFinite(Number(c.sumInTarget))
                ? Number(c.sumInTarget)
                : Number(c.sum);

            map.set(cat, (map.get(cat) || 0) + val);
        }

        return Array.from(map.entries()).map(([category, total]) => ({
            category,
            total: Number(total.toFixed(2)),
        }));
    }

    // Get totals for each month in a year (bar chart), in selected currency
    async function getYearMonthlyTotals(year, currency) {
        const y = Number(year);
        const results = [];

        for (let m = 1; m <= 12; m++) {
            const r = await getReport(y, m, currency);
            results.push(Number(r.total.total));
        }

        return results;
    }

    // Expose API for pages
    return { addCost, getReport, getCategoryTotals, getYearMonthlyTotals };
}