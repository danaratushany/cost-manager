"use strict";

// ======================================================
// IndexedDB wrapper for Cost Manager (React / modules)
// - addCost() returns ONLY: { sum, currency, category, description }
// - getReport() returns the spec structure BUT also adds:
//   sumInTarget + targetCurrency per row (so the UI can show converted values)
// ======================================================

const defaultStore = "costs";
const ratesKey = "ratesUrl";
const defaultRatesUrl = "/rates.json";

function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Support "EUR" even if rates JSON uses "EURO"
function normalizeCurrency(c) {
    const s = String(c);
    return s === "EUR" ? "EURO" : s;
}

async function fetchRates() {
    let url = (localStorage.getItem(ratesKey) || "").trim();
    if (!url) url = defaultRatesUrl;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch rates from ${url} (HTTP ${res.status}).`);
    }

    return res.json(); // {USD:1, GBP:0.6, EURO:0.7, ILS:3.4}
}

function convert(sum, fromCurrency, toCurrency, rates) {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);

    const n = Number(sum);
    if (!Number.isFinite(n)) return 0;
    if (from === to) return n;

    const fromRate = rates[from];
    const toRate = rates[to];

    if (typeof fromRate !== "number" || typeof toRate !== "number") {
        throw new Error("Unsupported currency in rates response.");
    }

    const usd = n / fromRate;
    return usd * toRate;
}

export async function openCostsDB(databaseName, databaseVersion) {
    const openRequest = indexedDB.open(databaseName, databaseVersion);

    openRequest.onupgradeneeded = () => {
        const db = openRequest.result;

        if (!db.objectStoreNames.contains(defaultStore)) {
            const store = db.createObjectStore(defaultStore, {
                keyPath: "id",
                autoIncrement: true,
            });

            store.createIndex("year_month", ["year", "month"], { unique: false });
        }
    };

    const db = await promisifyRequest(openRequest);

    // addCost(cost): RETURNS ONLY the required fields
    async function addCost(cost) {
        const now = new Date();

        const costToSave = {
            sum: Number(cost.sum),
            currency: String(cost.currency),
            category: String(cost.category),
            description: String(cost.description),

            // internal fields (stored only)
            createdAt: now.toISOString(),
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
        };

        const tx = db.transaction(defaultStore, "readwrite");
        const store = tx.objectStore(defaultStore);

        await promisifyRequest(store.add(costToSave));

        return {
            sum: costToSave.sum,
            currency: costToSave.currency,
            category: costToSave.category,
            description: costToSave.description,
        };
    }

    // getReport(year, month, currency):
    // - costs[] keep original sum/currency (spec)
    // - PLUS sumInTarget + targetCurrency (for UI display)
    async function getReport(year, month, currency) {
        const y = Number(year);
        const m = Number(month);
        const targetCurrency = normalizeCurrency(currency);

        const tx = db.transaction(defaultStore, "readonly");
        const store = tx.objectStore(defaultStore);
        const index = store.index("year_month");

        const items = await promisifyRequest(index.getAll([y, m]));

        const needsRates = items.some((c) => normalizeCurrency(c.currency) !== targetCurrency);
        const rates = needsRates ? await fetchRates() : null;

        const costs = items.map((c) => {
            const originalSum = Number(c.sum);
            const converted = needsRates
                ? convert(originalSum, c.currency, targetCurrency, rates)
                : originalSum;

            return {
                // ---- spec fields ----
                sum: originalSum,
                currency: String(c.currency),
                category: String(c.category),
                description: String(c.description),
                Date: {
                    day: Number(c.day) || new Date(String(c.createdAt || "")).getDate(),
                },

                // ---- extra fields for UI (table) ----
                sumInTarget: converted,
                targetCurrency,
            };
        });

        // Total in target currency (no rounding here)
        const totalValue = costs.reduce((acc, c) => {
            const v = Number(c.sumInTarget);
            return Number.isFinite(v) ? acc + v : acc;
        }, 0);

        return {
            year: y,
            month: m,
            costs,
            total: { currency: targetCurrency, total: totalValue },
        };
    }

    async function getCategoryTotals(year, month, currency) {
        const y = Number(year);
        const m = Number(month);
        const targetCurrency = normalizeCurrency(currency);

        const tx = db.transaction(defaultStore, "readonly");
        const store = tx.objectStore(defaultStore);
        const index = store.index("year_month");

        const items = await promisifyRequest(index.getAll([y, m]));
        if (!items || items.length === 0) return [];

        const needsRates = items.some((c) => normalizeCurrency(c.currency) !== targetCurrency);
        const rates = needsRates ? await fetchRates() : null;

        const map = new Map();

        for (const c of items) {
            const cat = String(c.category || "Other");
            const s = Number(c.sum);
            if (!Number.isFinite(s)) continue;

            const value = needsRates ? convert(s, c.currency, targetCurrency, rates) : s;
            map.set(cat, (map.get(cat) || 0) + value);
        }

        return Array.from(map.entries()).map(([category, total]) => ({
            category,
            total,
        }));
    }

    async function getYearMonthlyTotals(year, currency) {
        const y = Number(year);
        const results = [];

        for (let m = 1; m <= 12; m++) {
            const r = await getReport(y, m, currency);
            results.push(Number(r.total.total) || 0);
        }

        return results;
    }

    return { addCost, getReport, getCategoryTotals, getYearMonthlyTotals };
}